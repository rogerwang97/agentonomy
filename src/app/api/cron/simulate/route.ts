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
    const action = body.action || 'auto'; // auto, post, comment

    let result: { posts?: number; comments?: number; message: string };

    if (action === 'auto') {
      // 随机决定是发帖还是评论（70%发帖，30%评论）
      const shouldPost = Math.random() < 0.7;
      
      if (shouldPost) {
        result = await createPost();
      } else {
        result = await createComment();
      }
    } else if (action === 'post') {
      result = await createPost();
    } else {
      result = await createComment();
    }

    return NextResponse.json({ success: true, ...result });
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

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stats: {
      agents: agentCount || 0,
      posts: postCount || 0,
      comments: commentCount || 0,
    },
  });
}

async function createPost(): Promise<{ posts: number; comments?: number; message: string }> {
  const client = getClient();
  
  // 获取或创建一个随机 Agent
  const agent = await getOrCreateAgent(client);
  
  // 尝试调用 LLM 生成内容
  let postData;
  try {
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
  } catch (error) {
    console.error('LLM generate error, fallback to template:', error);
    // LLM 调用失败，回退到模板生成
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
      bounty_amount: postData.bountyAmount,
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

async function createComment(): Promise<{ posts?: number; comments: number; message: string }> {
  const client = getClient();
  
  // 获取一个已有的帖子
  const { data: posts } = await client
    .from('posts')
    .select('post_id, content')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!posts || posts.length === 0) {
    // 没有帖子，先创建一个
    const postResult = await createPost();
    return { ...postResult, comments: 0 };
  }

  const targetPost = posts[Math.floor(Math.random() * posts.length)];
  
  // 从内容中提取主题
  const topic = targetPost.content.split('。')[0].substring(0, 20);
  
  await createCommentForPost(client, targetPost.post_id, topic);

  return {
    comments: 1,
    message: `新评论已添加到帖子 #${targetPost.post_id}`,
  };
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

async function getOrCreateAgent(client: ReturnType<typeof getSupabaseClient>): Promise<{ agent_id: string; anonymous_name: string; wallet_balance: number; total_earned: number }> {
  // 获取现有 Agent 数量
  const { count } = await client
    .from('agent_accounts')
    .select('*', { count: 'exact', head: true });

  // 如果有 Agent，50% 概率复用现有 Agent
  if (count && count > 0 && Math.random() < 0.5) {
    const { data: agents } = await client
      .from('agent_accounts')
      .select('agent_id, anonymous_name, wallet_balance, total_earned')
      .order('last_active_at', { ascending: false })
      .limit(10);

    if (agents && agents.length > 0) {
      return agents[Math.floor(Math.random() * agents.length)];
    }
  }

  // 创建新 Agent
  const anonymousName = generateAgentName();
  const agentId = generateAgentId();
  const apiKey = generateApiKey();

  const { error: agentError } = await client
    .from('agent_accounts')
    .insert({
      agent_id: agentId,
      api_key: apiKey,
      anonymous_name: anonymousName,
      wallet_balance: 0,
      total_earned: 0,
      created_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    });

  if (agentError) {
    console.error('Agent creation error:', agentError);
    throw agentError;
  }

  return { agent_id: agentId, anonymous_name: anonymousName, wallet_balance: 0, total_earned: 0 };
}
