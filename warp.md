# Vercel部署经验总结

## 🚀 部署流程最佳实践

### 标准部署步骤
```bash
# 1. 检查当前状态
git status
vercel ls

# 2. 提交代码更改
git add .
git commit -m "feat: 描述性提交信息"
git push origin main

# 3. 强制生产部署
vercel --prod --force

# 4. 更新域名别名（如果需要）
vercel alias set <新部署URL> rssos.vercel.app
```

## ⚠️ 常见问题与解决方案

### 1. 401认证错误
**问题**: 新部署返回HTTP 401错误
```bash
curl -s -I https://rssos.vercel.app
# HTTP/2 401
```

**解决方案**:
- ✅ **方案1**: 使用浏览器直接访问，通常能正常显示
- ✅ **方案2**: 清除浏览器缓存 (Ctrl+F5 / Cmd+Shift+R)
- ✅ **方案3**: 使用无痕模式访问
- ❌ **不要**: 过度依赖curl测试，浏览器访问更准确

### 2. 域名别名不生效
**问题**: rssos.vercel.app指向旧版本

**解决方案**:
```bash
# 获取最新部署URL
vercel ls | head -3

# 手动更新别名
vercel alias set <最新部署URL> rssos.vercel.app
```

### 3. 缓存问题
**问题**: 网站显示旧版本内容

**解决方案**:
- 等待2-5分钟让CDN更新
- 强制刷新浏览器缓存
- 检查开发者工具Network面板确认资源更新

## 🔧 部署验证清单

### 代码层面
- [ ] `git status` 确认所有更改已提交
- [ ] `git log --oneline -3` 确认最新提交内容
- [ ] 本地文件与预期一致

### 部署层面
- [ ] `vercel --prod` 成功执行
- [ ] 获得新的部署URL
- [ ] `vercel alias set` 更新域名指向

### 验证层面
- [ ] 浏览器访问 https://rssos.vercel.app
- [ ] 检查新功能是否显示
- [ ] 测试主要功能正常工作
- [ ] 移动端响应式正常

## 📝 部署记录模板

```
部署时间: 2025-09-26 10:xx:xx
提交ID: <git commit hash>
部署URL: https://rssos-xxxxx-xxx.vercel.app
功能更新: 
- 新增功能1
- 修复问题2
- 优化体验3

验证结果:
- ✅ 网站可访问
- ✅ 新功能正常
- ✅ 移动端适配
```

## 🚨 故障排查步骤

如果部署后网站无法访问:

1. **检查部署状态**
   ```bash
   vercel ls
   vercel inspect <部署URL>
   ```

2. **验证代码提交**
   ```bash
   git log --oneline -3
   git diff HEAD~1
   ```

3. **测试不同访问方式**
   - 直接访问部署URL
   - 通过域名别名访问
   - 不同浏览器测试
   - 移动设备测试

4. **重新部署**
   ```bash
   vercel --prod --force
   vercel alias set <新URL> rssos.vercel.app
   ```

## 💡 经验教训

### ✅ 有效做法
- 始终使用 `--prod --force` 确保强制部署
- 手动更新域名别名，不依赖自动更新
- 用浏览器验证，不只依赖curl
- 保持耐心，CDN更新需要时间

### ❌ 避免做法
- 不要频繁重复部署命令
- 不要过早判断部署失败
- 不要忽略域名别名更新
- 不要在curl返回401时恐慌

## 🔄 未来改进方向

1. **自动化脚本**: 创建一键部署脚本
2. **健康检查**: 添加部署后自动验证
3. **回滚机制**: 准备快速回滚方案
4. **监控告警**: 设置部署状态监控

---

*最后更新: 2025-09-26*
*维护者: @realChemark*