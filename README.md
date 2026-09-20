# ShareText

自托管的临时文本分享服务，基于 Cloudflare Pages + KV 构建。

## 功能特性

- **三种分享模式**：5 位数字 ID、普通链接、端对端加密链接
- **灵活过期机制**：按天/小时/分钟/查看次数自动过期
- **端对端加密**：AES-GCM-256 加密，密钥在 URL fragment 中，服务器无法查看原文
- **站点密码**：可选的访问密码保护，仅用于创建界面
- **管理后台**：文本列表、搜索、删除操作
- **速率限制**：基于 IP 的滑动窗口限流
- **深色模式**：自动跟随系统偏好，玻璃拟态设计

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vanilla JavaScript + CSS（无框架） |
| 构建 | Vite 6 |
| 后端 | Cloudflare Pages Functions |
| 存储 | Cloudflare KV |
| 加密 | Web Crypto API (AES-GCM-256) |

## 本地开发

```bash
npm install
npm run dev
```

开发服务器运行在 `http://localhost:3000`，自动模拟 Cloudflare KV 和 Pages Functions 环境。

## 构建部署

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

## 部署到 Cloudflare Pages

1. 将代码推送到 GitHub/GitLab
2. 在 Cloudflare Dashboard → Pages 中连接仓库
3. 构建命令：`npm run build`
4. 输出目录：`dist`
5. 在 Cloudflare KV 中创建命名空间
6. 在 Pages 项目 → Settings → Functions → KV 命名空间绑定中，绑定名称设为 `KV`

## 配置说明

| 环境变量/设置 | 说明 |
|---------------|------|
| KV 绑定 | 必需，用于存储文本数据和配置 |
| 站点密码 | 可选，在管理后台中设置 |
| 管理员密码 | 首次访问 `/admin` 时设置 |

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/text/create` | 创建文本 |
| GET | `/api/text/:id` | 获取文本 |
| DELETE | `/api/text/:id` | 删除文本 |
| GET | `/api/t/:token` | 通过链接 token 获取文本 |
| GET | `/api/settings` | 获取站点设置 |
| POST | `/api/verify-site-password` | 验证站点密码 |
| POST | `/api/admin/login` | 管理员登录 |
| POST | `/api/admin/logout` | 管理员登出 |
| GET | `/api/admin/check` | 检查管理员登录状态 |
| GET | `/api/admin/list` | 获取文本列表 |
| GET | `/api/admin/:id` | 获取文本详情（管理员） |
| DELETE | `/api/admin/:id` | 删除文本（管理员） |
| GET | `/api/admin/settings` | 获取站点设置（管理员） |
| POST | `/api/admin/settings` | 更新站点设置（管理员） |

## License

MIT
