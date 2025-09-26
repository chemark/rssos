# RSSOS - 通用RSS生成器

🚀 将任何网站转换为RSS订阅源的智能工具

## 🌟 特性

- **🎯 智能识别**：自动识别博客、新闻、作品集、电商等不同类型网站结构
- **⚡ 高效缓存**：智能缓存机制，快速响应，减少重复抓取
- **🔄 实时更新**：定期更新RSS内容，确保订阅源保持最新状态
- **🌐 多平台支持**：支持WordPress、Medium、GitHub、Figma等各种平台
- **📱 响应式设计**：完美适配桌面和移动设备
- **🔧 简单易用**：只需输入URL即可生成RSS订阅链接

## 🛠️ 技术栈

- **后端**：Node.js + Vercel Serverless Functions
- **解析**：Cheerio + 智能内容检测
- **缓存**：LRU Cache + 多层缓存策略
- **前端**：原生JavaScript + 现代CSS
- **部署**：Vercel

## 🚀 快速开始

### 在线使用

访问 [https://rssos.vercel.app](https://rssos.vercel.app)

1. 输入任何网站的URL
2. 点击"生成RSS"
3. 复制生成的RSS订阅链接
4. 添加到你的RSS阅读器中

### 本地部署

```bash
# 克隆项目
git clone https://github.com/chemark/rssos.git
cd rssos

# 安装依赖
npm install

# 本地开发
npm run dev

# 访问 http://localhost:3000
```

### Vercel部署

1. Fork此项目
2. 在Vercel中导入项目
3. 一键部署完成

## 📖 API使用

### 生成RSS Feed

```
GET /api/generate?url=https://example.com
```

**参数：**
- `url` (必需)：要生成RSS的网站URL
- `refresh` (可选)：设置为`1`强制刷新缓存

**响应：**
- `Content-Type: application/rss+xml; charset=utf-8`
- 标准RSS 2.0 XML格式

**示例：**

```bash
curl "https://rssos.vercel.app/api/generate?url=https://jasonspielman.com"
```

## 🎯 支持的网站类型

### 1. 作品集网站 (Portfolio)
- **检测特征**：portfolio、work、project、case-study、design关键词
- **适用于**：设计师作品集、开发者项目展示
- **示例**：https://jasonspielman.com

### 2. 博客网站 (Blog)
- **检测特征**：WordPress、Blogger特征，文章结构
- **适用于**：个人博客、技术博客
- **示例**：WordPress、Ghost、Medium博客

### 3. 新闻网站 (News)
- **检测特征**：article meta标签、新闻结构
- **适用于**：新闻网站、媒体平台
- **示例**：新闻门户、科技媒体

### 4. 代码仓库 (Repository)
- **检测特征**：GitHub域名、仓库结构
- **适用于**：开源项目、代码仓库
- **示例**：GitHub项目页面

### 5. 电商网站 (E-commerce)
- **检测特征**：产品列表、价格信息
- **适用于**：在线商店、产品展示
- **示例**：商品更新、新品发布

## 🔧 配置选项

### 缓存设置
- **RSS内容缓存**：30分钟
- **网站信息缓存**：1小时
- **HTML内容缓存**：15分钟
- **错误缓存**：1小时

### 请求限制
- **超时时间**：15秒
- **重定向次数**：最多5次
- **用户代理**：Mozilla/5.0 (compatible; RSSOS/1.0)

## 📝 使用示例

### 基本用法

```javascript
// 生成RSS
const rssUrl = 'https://rssos.vercel.app/api/generate?url=https://example.com';

// 在RSS阅读器中添加订阅
// Feedly、Inoreader、NetNewsWire等都支持
```

### 高级用法

```javascript
// 强制刷新缓存
const rssUrl = 'https://rssos.vercel.app/api/generate?url=https://example.com&refresh=1';

// 检查RSS状态
fetch(rssUrl, { method: 'HEAD' })
  .then(response => {
    console.log('Site Type:', response.headers.get('X-Site-Type'));
    console.log('Articles Found:', response.headers.get('X-Articles-Found'));
    console.log('Cache Status:', response.headers.get('X-Cache'));
  });
```

## 🚀 最新改进

### v1.1.0 - 2024.09.25

✨ **新增功能**
- 添加了现代化的Web前端界面
- 支持点击示例快速生成RSS
- 添加了复制链接和下载RSS功能
- 增加了实时错误提示和重试机制

🔧 **技术优化**
- 修复LRU Cache废弃API警告
- 改进了阿里一峰博客的解析算法
- 优化了Figma网站的内容提取
- 增强了缓存机制和错误处理

🎨 **用户体验**
- 响应式设计，完美支持移动设备
- 优雅的动画效果和交互反馈
- 深色模式适配（自动检测）
- 多语言Toast通知系统

## 🎨 特色功能

### 智能内容提取
- 自动识别文章标题、链接、摘要
- 智能提取发布时间和作者信息
- 支持图片和富文本内容

### Figma网站支持
特别优化了对Figma构建的网站的支持：
- 解析JSON数据结构
- 提取交互链接和项目信息
- 生成完整的项目描述

### 缓存策略
- 多层缓存设计
- 智能缓存失效
- 错误状态缓存，避免重复请求失败的网站

## 🔍 故障排除

### 常见问题

1. **无法生成RSS**
   - 检查网站URL是否正确
   - 确认网站可以正常访问
   - 尝试强制刷新缓存

2. **内容不完整**
   - 网站可能使用JavaScript动态加载
   - 某些网站有反爬虫机制
   - 联系开发者添加特定支持

3. **更新不及时**
   - RSS有30分钟缓存
   - 可以使用refresh参数强制更新

### 错误代码

- `400`：URL参数缺失或格式错误
- `405`：HTTP方法不支持
- `500`：服务器内部错误或网站无法解析

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

### 开发环境设置

```bash
# 克隆项目
git clone https://github.com/chemark/rssos.git
cd rssos

# 安装依赖
npm install

# 运行测试
npm test

# 启动开发服务器
npm run dev
```

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Cheerio](https://cheerio.js.org/) - 服务器端jQuery实现
- [Vercel](https://vercel.com/) - 无服务器部署平台
- [LRU Cache](https://github.com/isaacs/node-lru-cache) - 高效缓存实现

## 📞 联系方式

- 项目主页：https://github.com/chemark/rssos
- 问题反馈：https://github.com/chemark/rssos/issues
- 在线体验：https://rssos.vercel.app

## 🎯 路线图

- [ ] 添加更多网站类型支持
- [ ] 实现Webhook推送功能
- [ ] 添加RSS订阅管理面板
- [ ] 支持自定义RSS模板
- [ ] 添加API密钥认证
- [ ] 实现批量RSS生成

---

**让RSS订阅更简单！** 🚀