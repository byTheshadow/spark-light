/* 每个页面都以独立的 <script type="module"> 引入本文件。
   外壳出任何错误，只记录到控制台，页面自己的内容不受影响。 */
import { mountShell } from './shell.js';
try { mountShell(); } catch (e) { console.error('[Spark Light] 外壳加载失败：', e); }
