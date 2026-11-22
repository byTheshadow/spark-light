小游戏文件夹。每个游戏一个子文件夹：games/play/<游戏 id>/，是一个独立的页面，坏了不影响别的游戏。

新增一个游戏（给搭建窗口的步骤，站主不用写代码）：
1. 复制 _template 文件夹，改名成游戏的 id（只用英文小写、数字、短横线，比如 catch-bad-cat）。
2. 修改里面的 index.html（把标题和 data-game 改成这个 id）、game.js（游戏本体）、game.css（游戏样式）。
3. 在 data/games.json 的 items 里加一项：id 与文件夹名一致，path 写 games/play/<id>/，做好后把 status 改成 ready。
4. 游戏列表页会自动出现这张卡片，点进去就是这个游戏。不需要改列表页的任何代码。

规则：游戏页面不使用 emoji；所有可见文字用 textContent 写入；页面隐藏或离开时要暂停并释放动画、计时器、音频；
游戏只依赖 core/ 与 data/，不依赖其他游戏。
GitHub 网页不能保留空文件夹，所以每个文件夹里都要有文件，这个说明文件要留着。
