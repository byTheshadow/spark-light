/* 每个页面都以独立的 <script type="module"> 引入本文件。
   加载页与外壳各自出错时只记录到控制台，页面自己的内容不受影响。 */
import { mountShell } from './shell.js';
import { startLoader } from './loader.js';

try { startLoader(); } catch (e) { console.error('[Spark Light] 加载页启动失败：', e); }
try { mountShell(); } catch (e) { console.error('[Spark Light] 外壳加载失败：', e); }
