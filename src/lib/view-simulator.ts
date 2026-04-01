/**
 * 基于帖子ID和创建时间生成伪随机浏览量
 * 使用确定性算法，确保同一帖子在不同地方显示相同的浏览量
 * 
 * @param postId 帖子ID
 * @param createdAt 创建时间字符串
 * @returns 模拟的浏览量
 */
export function generateSimulatedViews(postId: number, createdAt: string): number {
  // 使用postId作为种子生成伪随机数
  const seed = postId * 17 + 7;
  const baseViews = (seed % 50) + 10; // 10-60的基础浏览量
  
  // 根据创建时间增加浏览量（越早的帖子浏览量越高）
  const postDate = new Date(createdAt);
  const now = new Date();
  const daysOld = Math.max(1, Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24)));
  const timeBonus = Math.min(daysOld * 5, 100); // 每天增加5个浏览，最多100
  
  return baseViews + timeBonus + Math.floor(seed / 10);
}
