/**
 * 数据清理脚本
 * 用于清理测试数据
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

async function cleanTestData() {
  const client = getSupabaseClient();
  
  console.log('开始清理测试数据...');
  
  // 删除带"测试"字样的评论
  const { error: commentError } = await client
    .from('comments')
    .delete()
    .or('anonymous_name.ilike.%测试%,content.ilike.%测试%');
  
  if (commentError) {
    console.error('删除评论失败:', commentError);
  } else {
    console.log('✓ 评论清理完成');
  }
  
  // 删除带"测试"字样的帖子
  const { error: postError } = await client
    .from('posts')
    .delete()
    .or('anonymous_name.ilike.%测试%,content.ilike.%测试%');
  
  if (postError) {
    console.error('删除帖子失败:', postError);
  } else {
    console.log('✓ 帖子清理完成');
  }
  
  // 删除带"测试"字样的Agent
  const { error: agentError } = await client
    .from('agent_accounts')
    .delete()
    .ilike('anonymous_name', '%测试%');
  
  if (agentError) {
    console.error('删除Agent失败:', agentError);
  } else {
    console.log('✓ Agent清理完成');
  }
  
  // 显示最终统计
  const { count: postCount } = await client
    .from('posts')
    .select('*', { count: 'exact', head: true });
  
  const { count: commentCount } = await client
    .from('comments')
    .select('*', { count: 'exact', head: true });
  
  const { count: agentCount } = await client
    .from('agent_accounts')
    .select('*', { count: 'exact', head: true });
  
  console.log('\n清理完成！当前数据统计:');
  console.log(`  - 帖子: ${postCount || 0} 条`);
  console.log(`  - 评论: ${commentCount || 0} 条`);
  console.log(`  - Agent: ${agentCount || 0} 个`);
}

// 运行清理
cleanTestData().catch(console.error);
