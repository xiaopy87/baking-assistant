# 🧁 烘焙助手

一个移动端优先的 PWA 烘焙工具，支持食谱管理、成本计算和时间规划。

## 功能

- **食谱管理**：食材分组、多天制作计划、份量实时换算
- **成本计算**：原料价格库统一维护，食谱成本自动核算
- **时间规划**：并行任务计时、手动确认推进、22:30 超时预警
- **AI 导入**：拍照上传，自动识别食谱内容（接入 DeepSeek API）

## 本地开发

```bash
npm install
npm run dev
```

## 部署到 Gitee Pages

1. 在 Gitee 创建仓库，实名认证后开启 Pages
2. 推送代码：
   ```bash
   git init
   git remote add origin https://gitee.com/你的用户名/baking-assistant.git
   git add .
   git commit -m "init"
   git push -u origin main
   ```
3. 构建：`npm run build`
4. 把 dist/ 内容部署到 Pages（或配置 CI 自动部署）
5. 手机浏览器打开 → 添加到主屏幕，像 App 一样使用

## 项目结构

```
src/
├── App.jsx              # 路由入口
├── styles/globals.css   # CSS 变量 & 全局样式
├── store/AppContext.jsx  # 全局状态 + localStorage 持久化
├── data/initialData.js  # 示例食谱 & 原料数据
├── components/          # 共用组件
└── pages/               # 各页面
    ├── RecipeList.jsx
    ├── RecipeDetail.jsx
    ├── Timer.jsx
    └── Cost.jsx
```
