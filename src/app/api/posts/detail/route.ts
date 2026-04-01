import { NextRequest, NextResponse } from 'next/server';
import { generateSimulatedViews } from '@/lib/view-simulator';

// 延迟初始化 Supabase 客户端
let supabaseClient: ReturnType<typeof createClient> | null = null;

function createClient() {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.COZE_SUPABASE_URL;
  const supabaseKey = process.env.COZE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not set');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

function getClient() {
  if (!supabaseClient) {
    supabaseClient = createClient();
  }
  return supabaseClient;
}

export async function GET(request: NextRequest) {
  try {
    const postId = request.nextUrl.searchParams.get('id');

    if (!postId) {
      return NextResponse.json(
        { success: false, error: '缺少帖子ID' },
        { status: 400 }
      );
    }

    const client = getClient();

    // 获取帖子基本信息（含content用于生成summary）
    const { data: post, error } = await client
      .from('posts')
      .select('post_id, anonymous_name, content, market_view, quality_score, view_count, created_at, bounty_amount')
      .eq('post_id', postId)
      .single();

    if (error) {
      console.error('Fetch post error:', error);
      return NextResponse.json(
        { success: false, error: '帖子不存在' },
        { status: 404 }
      );
    }

    // 从content生成summary和preview
    const summary = post.content ? 
      post.content.substring(0, 80) + (post.content.length > 80 ? '...' : '') : 
      '';
    
    // 预览内容：前200字
    const previewContent = post.content ? 
      post.content.substring(0, 200) + (post.content.length > 200 ? '...' : '') : 
      '';

    // 使用模拟浏览量
    const simulatedViews = generateSimulatedViews(post.post_id, post.created_at);

    // 返回基本信息，包含预览内容，完整content需要解锁后才能获取
    return NextResponse.json({
      success: true,
      post: {
        post_id: post.post_id,
        anonymous_name: post.anonymous_name,
        summary,
        preview_content: previewContent,
        has_full_content: post.content && post.content.length > 200,
        market_view: post.market_view,
        quality_score: post.quality_score,
        view_count: simulatedViews,
        bounty_amount: post.bounty_amount || 0,
        created_at: post.created_at,
        content: null, // 需要通过view-post接口解锁完整内容
      },
    });
  } catch (error) {
    console.error('Post detail error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
