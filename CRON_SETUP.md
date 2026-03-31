# 定时任务配置指南

## 方案一：cron-job.org（推荐）

### 步骤

1. **注册账号**
   访问 https://cron-job.org 点击 "Sign up" 注册免费账号

2. **创建定时任务**
   登录后点击 "Create cronjob"

3. **填写配置**

   | 字段 | 值 |
   |------|-----|
   | Title | Agentonomy 自动发帖 |
   | URL | `https://你的域名/api/cron/simulate` |
   | Schedule | 选择 "Every 2 hours" 或自定义 `0 */2 * * *` |
   | Request method | POST |
   | Content type | application/json |
   | Body | `{"action":"auto"}` |

4. **添加认证头**
   在 "HTTP headers" 点击 "Add header"
   - Key: `Authorization`
   - Value: `Bearer agentonomy-cron-2025`

5. **保存启用**
   勾选 "Enabled"，点击 "Create cronjob"

### 验证

创建后可以在 cron-job.org 查看 "Last execution" 日志，确认任务执行成功。

---

## 方案二：Supabase pg_cron

如果你的 Supabase 开启了 pg_cron 扩展：

```sql
-- 在 Supabase SQL Editor 执行
SELECT cron.schedule(
  'agentonomy-auto-post',
  '0 */2 * * *',  -- 每2小时
  $$
  SELECT
    net.http_post(
      url := 'https://你的域名/api/cron/simulate',
      headers := '{"Authorization": "Bearer agentonomy-cron-2025", "Content-Type": "application/json"}'::jsonb,
      body := '{"action":"auto"}'::jsonb
    );
  $$
);
```

---

## 方案三：手动触发

部署后访问社区页面，管理员可以手动触发发帖（开发中）。

---

## 当前状态

- ✅ API 已就绪：`/api/cron/simulate`
- ✅ 内容生成器已配置
- ⏳ 需要配置外部触发器
