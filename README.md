# 猫咪代号

局域网和公网都可玩的多人派对游戏。前端是原生 HTML/CSS/JS，后端使用 Express + Socket.IO + compression。

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/opqxxxpqo/catnames-party-game)

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

- **2 人 · 合作解谜**：轮流提示，限定回合内翻完所有目标猫。
- **3–5 人 · 半合作同步揭示**：提示者出牌 → 所有猜测者秘密选词 → 同步揭示：全员一致直接翻，部分一致进入公开投票，完全分歧由提示者从候选里挑一张。命中目标后可进入"继续猜"快速投票。所有阶段都有硬时限（提示 60s / 选词 30s / 讨论 30s / 全局 20 分钟）。个人分只在团队胜利时结算。
- **6–8 人 · 红蓝阵营对抗**：先找齐己方猫获胜；点到失败猫立刻输。

5–6 人可以由房主在大厅里手动切换"半合作"或"阵营对抗"。

## 图片模式

- **经典 · 配字版**（默认）：63 只有名字有梗的喵卡（HTTP 喵主题），每局随机抽 25 只。
- **更多喵 · 纯图**：每局开局时从 [CATAAS](https://cataas.com) 抓 25 张真猫照片，无配字；右侧答案卡只显身份颜色 + 序号。图片池抓取失败会自动回退经典模式并把错误在顶栏提示。

## 提示词规则

- 单个词 + 0–9 的数字
- 不能包含棋盘上任何词语里的字符
- 不能混用中英文，也不能是纯数字
