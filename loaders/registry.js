/* 加载页注册表。
   新增一个加载页：
     1) 在 loaders/ 下新建文件夹，先放一个 README.txt（GitHub 网页端不能传空文件夹）
     2) 按 loaders/_template 的合同写 loader.js 与 loader.css
     3) 在下面加一行，status 改成 'ready'
   weight 是随机权重，越大越常出现，默认 1。
   css / js 的路径都从站点根目录算起。 */
export const LOADERS = [
  { id: 'arcanum', name: '星盘与第十七张', en: 'arcanum', css: 'loaders/arcanum/loader.css', js: 'loaders/arcanum/loader.js', weight: 1, status: 'ready' }
];