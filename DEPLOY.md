# Cloudflare Pages 部署指南

## 方案一：通过 Cloudflare Dashboard（推荐）

### 1. 前提条件
- ✅ 代码已推送到 GitHub：https://github.com/cshuaikong/seatsmap
- ✅ 拥有 Cloudflare 账号

### 2. 部署步骤

#### 步骤 1：登录 Cloudflare
1. 访问 https://dash.cloudflare.com
2. 登录你的账号
3. 在左侧菜单选择 **Workers & Pages**

#### 步骤 2：创建 Pages 项目
1. 点击 **Create application**
2. 选择 **Pages** 标签
3. 点击 **Connect to Git**

#### 步骤 3：连接 GitHub 仓库
1. 授权 Cloudflare 访问 GitHub
2. 选择 `seatsmap` 仓库
3. 点击 **Begin setup**

#### 步骤 4：配置构建设置
```
Project name: seatsmap
Production branch: master

Build settings:
- Framework preset: Vite
- Build command: npm run build
- Build output directory: dist
- Root directory: / (根目录)
```

#### 步骤 5：保存并部署
1. 点击 **Save and Deploy**
2. 等待构建完成（约 1-2 分钟）
3. 访问生成的域名：`https://seatsmap.pages.dev`

### 3. 自定义域名（可选）

1. 进入项目设置
2. 选择 **Custom domains**
3. 点击 **Set up a custom domain**
4. 输入你的域名（如 `seats.yourdomain.com`）
5. Cloudflare 会自动配置 DNS

---

## 方案二：通过 Wrangler CLI

### 1. 安装 Wrangler
```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare
```bash
wrangler login
```

### 3. 构建项目
```bash
npm run build
```

### 4. 部署到 Cloudflare Pages
```bash
wrangler pages deploy dist
```

### 5. 访问部署
- 会自动生成一个 `*.pages.dev` 域名
- 在终端输出中查看访问地址

---

## 方案三：GitHub Actions 自动部署

### 1. 获取 Cloudflare API Token
1. 访问 https://dash.cloudflare.com/profile/api-tokens
2. 创建 API Token
3. 选择 **Edit Cloudflare Workers** 模板
4. 复制 Token

### 2. 添加 GitHub Secrets
在 GitHub 仓库设置中添加：
- `CLOUDFLARE_API_TOKEN`：你的 API Token
- `CLOUDFLARE_ACCOUNT_ID`：你的账号 ID

### 3. 创建 GitHub Actions 工作流

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: seatsmap
          directory: dist
          branch: main
```

### 4. 推送代码
```bash
git add .
git commit -m "add: Cloudflare Pages deployment"
git push
```

每次推送到 master 分支都会自动部署！

---

## 项目配置说明

### Vite 配置（vite.config.ts）
```typescript
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  publicDir: 'static'  // 静态资源目录
})
```

### 构建命令
```json
{
  "build": "vue-tsc && vite build"
}
```

### 输出目录
- 构建后生成：`dist/`
- 静态资源：`static/` 目录会被复制到 `dist/`

---

## 常见问题

### Q1: 构建失败怎么办？
检查构建日志，常见原因：
- TypeScript 错误：运行 `npm run build` 本地测试
- 依赖未安装：确保 `package.json` 包含所有依赖

### Q2: 静态文件 404？
- 确认文件放在 `static/` 目录
- 检查路径引用是否正确（使用绝对路径 `/xxx`）

### Q3: 如何更新部署？
- 推送到 master 分支会自动触发重新部署
- 或在 Dashboard 手动触发重新部署

### Q4: 免费额度限制？
Cloudflare Pages 免费计划：
- ✅ 无限站点
- ✅ 无限请求
- ✅ 500 次构建/月
- ✅ 自定义域名
- ✅ HTTPS

---

## 访问地址

部署成功后，可以通过以下地址访问：

- **开发环境**：`http://localhost:5173`
- **Cloudflare Pages**：`https://seatsmap.pages.dev`
- **自定义域名**：（配置后生效）

---

## 推荐方案

**对于个人项目，推荐使用方案一（Dashboard 部署）**：
- ✅ 最简单，无需配置
- ✅ 自动监听 GitHub 推送
- ✅ 免费额度充足
- ✅ 支持预览部署

需要帮助可以随时问我！
