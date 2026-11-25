# 驻站灵魂小助手 RUI · DeepSeek 云端守门员配置指南（第二步用）

为了让访客在网页上向 **RUI** 提问时不会泄露你的 DeepSeek API Key，并严格防止坏人刷额度，本文件夹准备了现成的 Cloudflare Worker 守门员脚本 `worker.js`。

## 一、目前已内置的 6 道防刷保护
1. **单访客频率限制**：同一 IP 每分钟最多提问 **3 次**，每天最多自由提问 **10 次**。
2. **全站每日总刹车（熔断）**：全站所有访客加起来每天最多调用 **150 次**（成本约几分钱），达到上限当天自动暂停 AI 调用。
3. **字数与回答长度锁死**：访客单次提问限制 **100 字**以内；DeepSeek 单次回答限制 `max_tokens: 280`（约 180 字以内），且最多只携带最近 2 轮对话。
4. **前端 5 秒冷却 + 快捷星签零消耗**：点击对话框里的 6 个「快捷星签」直接在前端读取 `data/*.json` 秒回，完全不调用 DeepSeek、不扣次数。
5. **人设与职责死锁**：系统指令死锁 RUI 只能回答 Spark Light 站内业务，拒绝算命、写代码、写作业或闲聊。
6. **域名白名单（CORS）**：可设置 `ALLOWED_ORIGINS` 只允许你的正式域名调用。

## 二、后续怎么用 3 分钟接通 DeepSeek（等你验收完界面后操作）
1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/) -> 左侧点 **Workers & Pages** -> **Create Worker**，取名如 `spark-light-rui`。
2. 点击 **Edit code**，把本目录下 `worker.js` 的内容完整复制进去，点右上角 **Deploy**。
3. 在该 Worker 的 **Settings -> Variables and Secrets** 里添加一个加密变量（Secret）：
   - 变量名：`DEEPSEEK_API_KEY`
   - 变量值：你在 DeepSeek 开放平台创建的 API Key
   - （可选）添加变量 `ALLOWED_ORIGINS`，填你的网站域名（如 `https://你的域名.com`）。
4. 把 Cloudflare 分给你的 Worker 地址（如 `https://spark-light-rui.你的名字.workers.dev`）填进仓库 `data/rui.json` 的 `"endpoint"` 字段里，RUI 就会立刻接通真 DeepSeek！
