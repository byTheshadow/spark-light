/* 单个小游戏的入口脚本。本游戏只依赖 core/ 与 data/，不依赖其他游戏或其他页面。
   约定（每个新游戏照着写）：
   1) 游戏只操作 #game-root 里面的节点，所有可见文字用 textContent 写入，不使用 emoji。
   2) 页面标题来自 data/games.json（按 <body data-game="..."> 的 id 查），游戏名只写一份。
   3) 页面被隐藏或离开时要暂停并释放（动画循环、计时器、音频），见下面的 stop()。
   4) 本文件出错只会让这一个游戏不能玩，不影响游戏列表和其他游戏。 */
import { loadData } from '../../../core/data.js';

const root = document.getElementById('game-root');
const gameId = document.body.getAttribute('data-game');

/* 游戏名与说明来自 data/games.json */
loadData('games').then((data) => {
  const it = (Array.isArray(data.items) ? data.items : []).find((i) => i && i.id === gameId);
  if (it && it.title) {
    document.getElementById('page-title').textContent = it.title;
    document.title = it.title + ' · Spark Light';
  }
}).catch((e) => console.warn('[Spark Light] 读取游戏信息失败：', e && e.message));

/* 这里是游戏本体。占位阶段什么也不做；做好后，把游戏画进 root。 */
let running = false;
function start() { running = true; /* TODO 开始游戏循环 */ }
function stop() { running = false; /* TODO 清掉动画循环、计时器、音频 */ }

document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
window.addEventListener('pagehide', stop);
void root; void running; void start;
