# 内容数据说明

站里所有会变的内容都放在这个文件夹的 `.json` 文件里，页面只负责显示。改完文件提交到 GitHub，Vercel 会自动重新部署，几十秒后网站就更新了。

## 写 JSON 要注意的三件事

1. 引号、逗号、冒号必须是**英文半角**。
2. 每一项之间要有逗号，**最后一项后面不能有逗号**。
3. 不想显示的内容填 `null`（不加引号），页面会显示“待站主提供”之类的占位。

写错了不会让整个网站崩掉：只有用到这个文件的那一块会显示错误提示，并告诉你是哪个文件、大概什么问题。

以下划线开头的键（比如 `"_说明"`）是给你看的备注，程序不读取，可以保留。

## 各文件是干什么的

| 文件 | 内容 | 谁在用 |
| --- | --- | --- |
| `site.json` | 站名、定位语、导航 | 全站 |
| `status.json` | 排单状态 | 全站（底部状态条） |
| `services.json` | 价目与服务 | 主界面 |
| `notice.json` | 营业须知（五章） | 主界面（一封来信） |
| `contact.json` | 联系方式与下单渠道 | 全站（“下单与联系”弹层） |
| `cards.json` | 免费字卡的卡面和文案 | 主界面（今日字卡） |
| `crafts.json` | 四件星物里每项业务的介绍和小标签 | 主界面 |
| `lenormand.json` | 占卜演示里水晶球抽到的牌名与牌义 | 主界面 |
| `works.json` | 作品登记 | 作品与碎碎念页（阶段 3） |
| `thoughts.json` | 碎碎念 | 作品与碎碎念页（阶段 3） |
| `dramas.json` | AI 漫剧登记（B 站视频或图床图片） | AI 漫剧页（阶段 4） |
| `games.json` | 小游戏登记 | 小游戏页（阶段 4） |

## 常用改法

### 改排单状态（`status.json`）

```json
{ "state": "open", "total": 8, "taken": 5, "note": null }
```

`state` 只能填：`open`（开单中）、`paused`（暂停接单）、`full`（已满单）。不想显示名额，`total` 和 `taken` 都填 `null`。

### 改价格（`services.json`）

找到对应的那一项，改 `price` 后面的数字就行，全站的价目同步变化。

### 填联系方式（`contact.json`）

在 `channels` 里加一项，一个渠道一项：

```json
{ "label": "微信", "value": "你的微信号", "copy": true, "note": null }
```

- `copy` 为 `true`：点一下复制 `value`。
- 想做成可点击的链接，加 `"href": "https://……"`，并把 `copy` 改成 `false`。

### 添加作品（`works.json`）

两步：

1. 把图片放进 `assets/works/分类文件夹/`，比如 `assets/works/divination/demo-01.webp`。
2. 在 `works.json` 的 `items` 里加一项：

```json
{ "category": "divination", "file": "demo-01.webp", "title": "标题", "caption": "一句话说明", "link": null, "ai": false }
```

- `category`：分类编号，必须是 `works.json` 里 `categories` 的某个 `id`，也是图片所在的文件夹名。
- `file`：图片文件名，要和文件夹里的完全一致（包括大小写和扩展名）。
- `caption`、`link`：可选，不要就填 `null`。`link` 只接受以 `http://` 或 `https://` 开头的地址。
- `ai`：这张图是 AI 生成的就填 `true`，页面会如实标注“AI 生成”。

图片规格：宽度不超过 1600 像素，单张不超过 500KB，格式用 webp、jpg 或 png。上传前先压缩，页面会更快。

新加的作品按 `items` 里的顺序显示，想让谁排前面就把它写在前面。分类只显示有作品的，想增减分类，改 `categories` 并新建对应文件夹即可。

如果图片找不到（文件名写错或没上传），那一格会显示成斜线占位，其他作品不受影响。

### 写碎碎念（`thoughts.json`）

在 `items` 里加一项，页面按日期从新到旧显示：

```json
{ "date": "2026-11-22", "text": "想说的话，可以有换行", "image": null }
```

- `date`：写成 `年-月-日`。
- `text`：文字，没有就填 `null`。
- `image`：配图文件名，图片放在 `assets/thoughts/`，没有就填 `null`。文字和配图至少要有一个。

### 登记 AI 漫剧（`dramas.json`）

在 `items` 里加一项。漫剧有两种来源，用 `type` 区分。

B 站视频（视频不放仓库，只登记 BV 号）：

```json
{ "id": "drama-01", "type": "bilibili", "bvid": "BV1xxxxxxxxx", "title": "标题", "summary": "一两句简介", "cover": "drama-01.webp", "date": "2026-11-22" }
```

图床图片（长图连续阅读）：

```json
{ "id": "drama-02", "type": "images", "pages": ["https://图床地址/01.webp", "https://图床地址/02.webp"], "title": "标题", "summary": "简介", "cover": "drama-02.webp", "date": "2026-11-22" }
```

- `id`：不重复就行，英文或数字。
- `bvid`：B 站视频的 BV 号，BV 开头共 12 位。分 P 视频可以再加 `"page": 2`。
- `pages`：按阅读顺序排列。每项可以是 `http` 或 `https` 开头的图床地址，也可以是放在 `assets/drama/<id>/` 里的文件名。
- `cover`：封面文件名，图片放在 `assets/covers/`；也可以写 `http` 或 `https` 开头的图片地址。
- 页面会自动标注“由 AI 生成”，不用在这里写。新作品写在前面就排在前面。
- 还没有真实来源的作品，不写 `type`，页面会显示成“待上线”的占位框。`items` 为空时页面显示两个占位框。
- 写错的 BV 号或空的图片列表，会当作占位处理，不会影响其他漫剧。

页面只在访客点开时才创建播放器或加载图片；关闭窗口、离开页面或切到后台时会立刻释放，不会在访客手机里堆积。

### 登记小游戏（`games.json`）

在 `items` 里加一项：

```json
{ "id": "catch-bad-cat", "title": "抓坏猫", "summary": "一两句玩法介绍", "cover": null, "tags": ["休闲"], "path": "games/play/catch-bad-cat/", "status": "soon" }
```

- `status`：`soon` 表示制作中，卡片显示“制作中”且不能点；`ready` 表示做好了，点卡片会跳转到这个游戏。
- `path`：固定写成 `games/play/<id>/`，`<id>` 和游戏文件夹同名。
- `intro`：小游戏页顶部那段说明，可以直接改字。
- 游戏本体放在 `games/play/<id>/`，做法见 `games/play/README.txt`。新增游戏不需要改列表页的代码。
