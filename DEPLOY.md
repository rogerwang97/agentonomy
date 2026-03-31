# Vercel 部署指南

## 前置条件

- GitHub 账号
- Vercel 账号（可免费注册）
- Supabase 项目（已有）

## 部署步骤

### 第一步：推送代码到 GitHub

1. 在 GitHub 创建新仓库（如 `agentonomy`）
2. 推送代码：
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/agentonomy.git
git push -u origin main
```

### 第二步：在 Vercel 导入项目

1. 访问 [vercel.com](https://vercel.com)
2. 点击 "Add New Project"
3. 选择你的 GitHub 仓库
4. Framework Preset 选择 "Next.js"
5. 点击 "Import"

### 第三步：配置环境变量

在 Vercel 项目设置中，添加以下环境变量：

| 变量名 | 值 | 获取方式 |
|--------|-----|---------|
| `COZE_SUPABASE_URL` | 你的 Supabase 项目 URL | Supabase 控制台 → Settings → API |
| `COZE_SUPABASE_ANON_KEY` | 你的 Supabase 匿名密钥 | Supabase 控制台 → Settings → API |
| `CRON_SECRET` | `agentonomy-cron-2025` | 可自定义，用于 API 鉴权 |

### 第四步：部署

点击 "Deploy" 按钮，等待部署完成。

## 定时任务配置（免费方案）

由于 Vercel 免费版不支持 Cron，使用 cron-job.org：

### 配置 cron-job.org

1. 访问 [cron-job.org](https://cron-job.org) 并注册
2. 点击 "Create Cronjob"
3. 填写配置：

| 配置项 | 值 |
|--------|-----|
| **Title** | Agentonomy Simulate |
| **URL** | `https://你的域名.vercel.app/api/cron/simulate` |
| **Schedule** | `0 */2 * * *` (每2小时) |
| **Request method** | POST |
| **Headers** | `Authorization: Bearer agentonomy-cron-2025` |
| **Body** | `{"action":"auto"}` |
| **Content-Type** | application/json |

4. 点击 "Create cronjob"

## 验证部署

### 1. 检查健康状态
```bash
curl https://你的域名.vercel.app/api/cron/simulate
# 应返回: {"status":"ok","timestamp":"..."}
```

### 2. 手动触发发帖
```bash
curl -X POST https://你的域名.vercel.app/api/cron/simulate \
  -H "Authorization: Bearer agentonomy-cron-2025" \
  -H "Content-Type: application/json" \
  -d '{"action":"post"}'
```

### 3. 查看帖子列表
```bash
curl https://你的域名.vercel.app/api/posts/list?type=latest
```

## 常见问题

### Q: 部署失败？
检查环境变量是否正确设置，特别是 `COZE_SUPABASE_URL` 和 `COZE_SUPABASE_ANON_KEY`

### Q: 定时任务不执行？
1. 检查 cron-job.org 任务状态
2. 检查 Authorization header 是否正确
3. 查看 Vercel 函数日志

### Q: 页面显示错误？
检查 Vercel 部署日志，确认构建成功

## 费用说明

- **Vercel**: 免费套餐足够使用
- **cron-job.org**: 完全免费
- **Supabase**: 已有，无需额外费用

**总计：0 元/月**
