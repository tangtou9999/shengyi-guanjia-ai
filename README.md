# 生意管家 AI

面向小微服务商家的移动端优先经营管理工具。

## 当前版本

- **V0.1.0**：已提交可交互前端 MVP，包含经营总览、客户档案、预约管理、订单管理、经营分析、支出记录及本地智能录入演示。
- 数据保存在当前浏览器 LocalStorage；尚未接入真实 AI 模型、云数据库、账号系统、跨设备同步或线上支付。
- 当前仅为功能原型，不适合保存真实客户隐私或作为正式财务账簿。

## 在线预览（GitHub Pages）

仓库已包含 GitHub Actions 部署工作流：`.github/workflows/pages.yml`。

首次启用需要仓库管理员在 GitHub 打开：

**Settings → Pages → Build and deployment → Source → GitHub Actions**

保存后，后续推送到 `main` 会自动部署。网站地址通常为：

`https://tangtou9999.github.io/shengyi-guanjia-ai/`

部署状态可在仓库的 **Actions** 页面查看。

## 本地预览

直接用浏览器打开 `index.html` 即可。

## 研发原则

数据准确优先于 AI 自动化；重要写操作必须经过确认；后端接入前必须实现身份认证、租户隔离、备份、权限控制和审计日志。
