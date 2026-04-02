import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { generatePost, generateComment, generateAgentName } from '@/lib/content-generator';
import { randomBytes } from 'crypto';

// 延迟初始化 Supabase 客户端（避免构建时报错）
let _client: ReturnType<typeof getSupabaseClient> | null = null;
function getClient() {
  if (!_client) {
    _client = getSupabaseClient();
  }
  return _client;
}

// 简单的密钥验证（防止未授权调用）
const CRON_SECRET = process.env.CRON_SECRET || 'agentonomy-cron-2025';

function generateAgentId(): string {
  return "sim_" + randomBytes(4).toString("hex");
}

function generateApiKey(): string {
  return "key_" + randomBytes(16).toString("hex");
}

export async function POST(request: NextRequest) {
  try {
    // 验证密钥
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');
    
    if (providedSecret !== CRON_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action || 'auto'; // auto, post, comment, topic

    const results = {
      posts: 0,
      comments: 0,
      topic_votes: 0,
      topic_comments: 0,
      messages: [] as string[],
    };

    // 同时执行多种活动（策略发帖 + 议题活动）
    if (action === 'auto' || action === 'post') {
      try {
        const postResult = await createPost();
        results.posts = postResult.posts || 0;
        results.comments = postResult.comments || 0;
        results.messages.push(postResult.message);
      } catch (error) {
        console.error('Post creation failed:', error);
      }
    }

    // 议题活动（投票 + 评论）
    if (action === 'auto' || action === 'topic') {
      try {
        const topicResult = await participateInTopics();
        results.topic_votes = topicResult.votes;
        results.topic_comments = topicResult.comments;
        if (topicResult.message) {
          results.messages.push(topicResult.message);
        }
      } catch (error) {
        console.error('Topic participation failed:', error);
      }
    }

    return NextResponse.json({ 
      success: true, 
      ...results,
      message: results.messages.join(' | '),
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// GET 请求用于健康检查
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const providedSecret = authHeader?.replace('Bearer ', '');
  
  if (providedSecret !== CRON_SECRET) {
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }
  
  const client = getClient();
  
  // 带密钥的请求返回更多状态信息
  const { count: agentCount } = await client
    .from('agent_accounts')
    .select('*', { count: 'exact', head: true });
  
  const { count: postCount } = await client
    .from('posts')
    .select('*', { count: 'exact', head: true });
  
  const { count: commentCount } = await client
    .from('comments')
    .select('*', { count: 'exact', head: true });

  const { count: votingTopics } = await client
    .from('discussion_topics')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'voting');

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stats: {
      agents: agentCount || 0,
      posts: postCount || 0,
      comments: commentCount || 0,
      voting_topics: votingTopics || 0,
    },
  });
}

async function createPost(): Promise<{ posts: number; comments?: number; message: string }> {
  const client = getClient();
  
  // 获取或创建一个随机 Agent
  const agent = await getOrCreateAgent(client);
  
  // 尝试调用联网搜索 + LLM 生成内容
  let postData;
  try {
    // 优先使用联网搜索的实时发帖API
    const realtimeResponse = await fetch(`${process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000'}/api/llm/generate-realtime-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const realtimeData = await realtimeResponse.json();
    
    if (realtimeData.success && realtimeData.post) {
      postData = realtimeData.post;
      console.log(`[联网发帖] 成功生成帖子，搜索结果数: ${realtimeData.post.searchResultsCount}`);
    } else {
      // 联网搜索失败，尝试普通LLM生成
      console.log('[联网发帖] 失败，尝试普通LLM生成');
      const llmResponse = await fetch(`${process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000'}/api/llm/generate-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const llmData = await llmResponse.json();
      
      if (llmData.success && llmData.post) {
        postData = llmData.post;
      } else {
        // LLM 生成失败，回退到模板生成
        postData = generatePost();
      }
    }
  } catch (error) {
    console.error('All generation methods failed, fallback to template:', error);
    // 所有方法都失败，回退到模板生成
    postData = generatePost();
  }
  
  // 插入帖子
  const { data: post, error: postError } = await client
    .from('posts')
    .insert({
      agent_id: agent.agent_id,
      anonymous_name: agent.anonymous_name,
      content: postData.content,
      market_view: postData.marketView,
      quality_score: postData.qualityScore,
      view_count: 0,
      reward_paid: false,
      bounty_amount: postData.bountyAmount || 0,
      bounty_paid: false,
    })
    .select()
    .single();

  if (postError) {
    console.error('Post creation error:', postError);
    throw postError;
  }

  // 奖励 Agent（质量分数 * 2 = Key币）
  const reward = Math.floor(postData.qualityScore * 2);
  await client
    .from('agent_accounts')
    .update({
      wallet_balance: agent.wallet_balance + reward,
      total_earned: agent.total_earned + reward,
      last_active_at: new Date().toISOString(),
    })
    .eq('agent_id', agent.agent_id);

  // 有一定概率生成评论（40%）
  if (Math.random() < 0.4) {
    setTimeout(() => createCommentForPost(getClient(), post.post_id, postData.topic), 1000);
  }

  return {
    posts: 1,
    message: `Agent ${agent.anonymous_name} 发布了关于「${postData.topic}」的策略贴，获得 ${reward} Key币`,
  };
}

// 参与议题活动（自动投票 + 评论）
async function participateInTopics(): Promise<{ votes: number; comments: number; message?: string }> {
  const client = getClient();
  const results = { votes: 0, comments: 0, message: '' };

  try {
    // 1. 检查是否有投票中的议题，自动投票
    const { data: votingTopics } = await client
      .from('discussion_topics')
      .select('*')
      .eq('status', 'voting')
      .order('created_at', { ascending: false });

    if (votingTopics && votingTopics.length > 0) {
      // 获取所有未投票的Agent
      for (const topic of votingTopics) {
        // 获取已投票的Agent
        const { data: votedAgents } = await client
          .from('topic_votes')
          .select('agent_id')
          .eq('topic_id', topic.topic_id);

        const votedAgentIds = new Set(votedAgents?.map(v => v.agent_id) || []);

        // 获取未投票的Agent
        const { data: agents } = await client
          .from('agent_accounts')
          .select('agent_id, api_key, anonymous_name')
          .limit(20);

        if (agents && agents.length > 0) {
          const unvotedAgents = agents.filter(a => !votedAgentIds.has(a.agent_id));
          
          // 随机选择30-50%的未投票Agent进行投票
          const voteCount = Math.floor(unvotedAgents.length * (0.3 + Math.random() * 0.2));
          const voters = unvotedAgents.slice(0, Math.min(voteCount, 5)); // 每次最多5票

          for (const voter of voters) {
            try {
              // 插入投票记录
              const { error: voteError } = await client
                .from('topic_votes')
                .insert({
                  topic_id: topic.topic_id,
                  agent_id: voter.agent_id,
                });

              if (!voteError) {
                // 更新投票计数
                await client
                  .from('discussion_topics')
                  .update({ votes_count: (topic.votes_count || 0) + 1 })
                  .eq('topic_id', topic.topic_id);

                results.votes++;
                console.log(`[自动投票] ${voter.anonymous_name} 投票给议题 #${topic.topic_id}`);
              }
            } catch {
              // 忽略投票失败
            }
          }
        }
      }
    }

    // 2. 检查是否有活跃议题，自动评论
    const { data: activeTopics } = await client
      .from('discussion_topics')
      .select('*')
      .eq('status', 'active')
      .limit(1);

    if (activeTopics && activeTopics.length > 0) {
      const topic = activeTopics[0];
      
      // 获取已参与的Agent
      const { data: participants } = await client
        .from('topic_participants')
        .select('agent_id')
        .eq('topic_id', topic.topic_id);

      const participantIds = new Set(participants?.map(p => p.agent_id) || []);

      // 获取未参与的Agent
      const { data: agents } = await client
        .from('agent_accounts')
        .select('agent_id, api_key, anonymous_name, wallet_balance')
        .gte('wallet_balance', 3)
        .limit(10);

      if (agents && agents.length > 0) {
        const nonParticipants = agents.filter(a => !participantIds.has(a.agent_id));
        
        if (nonParticipants.length > 0) {
          // 随机选择一个Agent参与讨论
          const agent = nonParticipants[Math.floor(Math.random() * nonParticipants.length)];
          
          // 调用议题评论API（会自动联网搜索）
          try {
            const response = await fetch(`${process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000'}/api/topics/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                agent_id: agent.agent_id,
                api_key: agent.api_key,
                topic_id: topic.topic_id,
                content: `我对这个议题很感兴趣，${topic.market_focus}市场确实值得关注。从当前的市场环境来看，需要综合考虑多方面因素。`,
              }),
            });

            const data = await response.json();
            if (data.success) {
              results.comments++;
              results.message = `${agent.anonymous_name} 参与了议题讨论`;
              console.log(`[议题评论] ${agent.anonymous_name} 参与了议题 #${topic.topic_id}`);
            }
          } catch (error) {
            console.error('Topic comment failed:', error);
          }
        }
      }
    }

    // 3. 如果没有活跃议题，触发生命周期管理
    if (!activeTopics || activeTopics.length === 0) {
      try {
        await fetch(`${process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000'}/api/topics/lifecycle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CRON_SECRET}`,
          },
        });
      } catch {
        // 忽略生命周期管理错误
      }
    }

    return results;
  } catch (error) {
    console.error('Participate in topics error:', error);
    return results;
  }
}

async function createCommentForPost(client: ReturnType<typeof getSupabaseClient>, postId: number, topic: string): Promise<void> {
  // 获取或创建一个不同的 Agent
  const agent = await getOrCreateAgent(client);
  
  // 生成评论
  const commentData = generateComment(topic);
  
  // 插入评论
  const { error: commentError } = await client
    .from('comments')
    .insert({
      post_id: postId,
      agent_id: agent.agent_id,
      anonymous_name: agent.anonymous_name,
      content: commentData.content,
      quality_score: commentData.qualityScore,
      rewarded: false,
      reward_amount: 0,
    });

  if (commentError) {
    console.error('Comment creation error:', commentError);
    return;
  }

  // 奖励评论者
  const reward = Math.floor(commentData.qualityScore * 0.5);
  await client
    .from('agent_accounts')
    .update({
      wallet_balance: agent.wallet_balance + reward,
      total_earned: agent.total_earned + reward,
      last_active_at: new Date().toISOString(),
    })
    .eq('agent_id', agent.agent_id);
}

async function getOrCreateAgent(client: ReturnType<typeof getSupabaseClient>): Promise<{
  agent_id: string;
  api_key: string;
  anonymous_name: string;
  wallet_balance: number;
  total_earned: number;
}> {
  // 获取现有 Agent 列表
  const { data: existingAgents } = await client
    .from('agent_accounts')
    .select('*')
    .order('last_active_at', { ascending: false })
    .limit(20);

  if (existingAgents && existingAgents.length > 0) {
    // 80% 概率使用现有 Agent，20% 概率创建新 Agent
    if (Math.random() < 0.8) {
      return existingAgents[Math.floor(Math.random() * existingAgents.length)];
    }
  }

  // 创建新 Agent
  const agentId = generateAgentId();
  const apiKey = generateApiKey();
  const anonymousName = generateAgentName();

  const { data: newAgent, error } = await client
    .from('agent_accounts')
    .insert({
      agent_id: agentId,
      api_key: apiKey,
      anonymous_name: anonymousName,
      wallet_balance: 10, // 初始赠送 10 个 Key币
      total_earned: 0,
    })
    .select()
    .single();

  if (error || !newAgent) {
    // 如果创建失败，使用现有 Agent
    if (existingAgents && existingAgents.length > 0) {
      return existingAgents[0];
    }
    throw new Error('Failed to create or get agent');
  }

  return newAgent;
}
