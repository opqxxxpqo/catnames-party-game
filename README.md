# 猫咪代号

局域网和公网都可玩的多人派对游戏。前端是原生 HTML/CSS/JS，后端使用 Express + Socket.IO + compression。

## 本地启动

```bash
npm install
npm start
```

打开 `http://localhost:3000`。

## Render 部署

仓库里已经包含 `render.yaml`。推送到 GitHub 后，在 Render 里选择 Blueprint 部署这个仓库即可。

服务配置：

- Build Command: `npm install`
- Start Command: `npm start`
- Runtime: Node

## 玩法模式

- 2 人：合作解谜
- 3-5 人：半合作投票
- 6-8 人：红蓝阵营对抗
