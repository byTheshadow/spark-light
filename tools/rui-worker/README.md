# Spark Light 全站二合一云端守门员（RUI + 返图页）配置指南

本文件夹下的 `worker.js` 是为 Spark Light 专门定制的**二合一 Cloudflare Worker 守门员**。只部署这一个免费脚本，就能同时搞定：
1. **驻站灵魂侍从 RUI**：隐藏你的 DeepSeek API Key + 6 道铁壁防刷额度。
2. **返图与反馈页电话机**：验证通用拨号口令（已默认设为 **`20261124`**）+ 接收单主留言与前端自动无损压缩后的 WebP 返图 + 站主专属的**「黑曜星典审核小后台（`/admin`）」**。

---

## 一、一步一步跟星浮配好它（非常简单，约 3 分钟）

### 第 1 步：创建免费的 D1 数据库（存单主的返图与留言）
1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. 在左侧菜单找到 **存储和数据库（Storage & Databases） -> D1 SQL 数据库（D1 SQL Database）**。
3. 点击 **创建（Create）**，名字填 `spark-light-db`，然后点创建即可（里面的数据表由我们的 `worker.js` 自动创建，不用你写任何 SQL）。

### 第 2 步：创建二合一 Worker 守门员
1. 在左侧菜单点 **计算(Workers) / Workers 和 Pages** -> 点击右上角 **创建（Create）** -> 选择 **创建 Worker（Create Worker）**。
2. 名字填 `spark-light-api`（或者你喜欢的名字），点右下角 **部署（Deploy）**。
3. 部署好后，点右上角的 **编辑代码（Edit code）**：
   - 把里面原有的几行示例代码全删掉；
   - 把本文件夹里 `worker.js` 的全部代码复制粘贴进去；
   - 点右上角 **部署（Deploy）**。

### 第 3 步：填入 DeepSeek 密钥并连上刚才的数据库
在你的 `spark-light-api` Worker 页面，点击顶部的 **设置（Settings）**：
1. **添加 DeepSeek 密钥**：
   - 找到 **变量和机密（Variables and Secrets）** -> 点击 **+ 添加（Add）**；
   - 类型选 **密钥（Secret）**，变量名称填：`DEEPSEEK_API_KEY`，值填你在 DeepSeek 申请的 API Key。
   - （通用拨号口令我已经默认写成了 **`20261124`**；如果以后你想换口令，只需要在这里加一个变量叫 `FEEDBACK_PASSCODE` 填新数字即可；你也可以加一个 `ADMIN_KEY` 作为你进入 `/admin` 审核后台的专属密码，不加的话默认也是 `20261124`）。
2. **绑定 D1 数据库**：
   - 在同一个设置页找到 **绑定（Bindings）** -> 点击 **+ 添加（Add）** -> 选择 **D1 数据库（D1 database）**；
   - **变量名称**必填：`DB`（大写）；
   - **D1 数据库**下拉选择刚才创建的 `spark-light-db`，点保存部署。

### 第 4 步：把你的 Worker 网址告诉星浮！
复制 Cloudflare 分给你的 Worker 网址（长得像 `https://spark-light-api.你的名字.workers.dev`）发给星浮，星浮会帮你一键填进 `data/rui.json` 和 `data/feedback.json` 里并 `push` 上线！

---

## 二、以后怎么审核单主发来的返图？
直接打开：`https://你的Worker网址/admin`
输入你的管理员密码（默认 `20261124` 或你设置的 `ADMIN_KEY`），就能在黑曜星典风格的专属小后台里看到单主发来的文字和图片，点一下 **「通过并公开」** 就会立刻出现在网站返图页的磁带和卡堆里！
