# 生意管家 AI

面向小微服务商家的移动端优先经营管理工具。

## 当前版本

- **V0.2.0**：新增独立支出管理页面、支出搜索与删除、按本地时区计算日期；补充 Playwright 桌面端和移动端浏览器回归测试。
- 数据保存在当前浏览器 LocalStorage；尚未接入真实 AI 模型、云数据库、账号系统、跨设备同步或线上支付。自动化浏览器测试正在 CI 中执行。
- 当前仅为功能原型，不适合保存真实客户隐私或作为正式财务账簿。

## 在线预览（GitHub Pages）

GitHub Pages 已配置为 GitHub Actions 部署来源；由 GitHub 自动生成的 Pages 部署流程负责发布，项目另有独立的浏览器质量检查流程。

首次启用需要仓库管理员在 GitHub 打开：

**Settings → Pages → Build and deployment → Source → GitHub Actions**

保存后，后续推送到 `main` 会自动部署。网站地址通常为：

`https://tangtou9999.github.io/shengyi-guanjia-ai/`

部署状态可在仓库的 **Actions** 页面查看。不要额外添加第二套 Pages 部署工作流，以免与 GitHub 自动生成的部署流程争抢同一个 Pages artifact。

## 本地预览

直接用浏览器打开 `index.html` 即可。

## 研发原则

数据准确优先于 AI 自动化；重要写操作必须经过确认；后端接入前必须实现身份认证、租户隔离、备份、权限控制和审计日志。
