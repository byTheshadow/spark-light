/* themes/t2-journal/home.js —— 主题 2：梦女手帐 · 草莓牛奶 主界面完整首页舞台与交互
   直接读取 window.DATA 与原站数据，挂载 #t2-stage 独立舞台。
   遵守零 Emoji 规范，所有动态文字均使用 textContent / 安全 DOM 构建。 */

export function mountT2Journal(d) {
  const root = document.documentElement;
  const store = {
    get(k, def) { try { const v = localStorage.getItem('sl.t2.' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem('sl.t2.' + k, JSON.stringify(v)); } catch (e) {} }
  };

  let reduced = store.get('reduce', matchMedia('(prefers-reduced-motion: reduce)').matches);
  /* The reference prototype opens in the strawberry-milk light mode.  Keep
     system-following as an explicit user choice instead of making a dark OS
     silently replace the intended default stage. */
  let themeMode = store.get('mode', 'light');
  root.setAttribute('data-t2-mode', themeMode);

  /* 构建手帐舞台 DOM */
  let stage = document.getElementById('t2-stage');
  if (stage) stage.remove();
  stage = document.createElement('div');
  stage.id = 't2-stage';

  stage.innerHTML = `
    <div class="aura" aria-hidden="true"><i class="a1"></i><i class="a2"></i><i class="a3"></i><i class="a4"></i></div>
    <div class="t2-grain" aria-hidden="true"></div>
    <div id="t2-crack" aria-hidden="true"><canvas id="t2-crackCv"></canvas><div id="t2-crackPlaster"></div></div>

    <header class="status" aria-label="状态栏">
      <time id="t2-clock">--:--</time>
      <div class="st-r">
        <button class="gear" type="button" id="t2-gearBtn" aria-label="主题设置">
          <svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>
          <span>手帐设置</span>
        </button>
        <span>跨次元</span>
        <span class="sig" id="t2-sig"><i></i><i></i><i></i><i></i></span>
        <svg class="bat" viewBox="0 0 18 16" aria-label="电量"><defs><clipPath id="t2-hc"><path d="M9 15 C 4 11, 1 8.5, 1 5.2 C 1 2.8, 2.9 1, 5.1 1 C 6.7 1, 8.1 1.9, 9 3.2 C 9.9 1.9, 11.3 1, 12.9 1 C 15.1 1, 17 2.8, 17 5.2 C 17 8.5, 14 11, 9 15 Z"/></clipPath></defs>
          <rect class="hf" clip-path="url(#t2-hc)" x="0" y="0" width="18" height="16" fill="var(--t2-thread)" style="transform:scaleY(.78)"/>
          <path d="M9 15 C 4 11, 1 8.5, 1 5.2 C 1 2.8, 2.9 1, 5.1 1 C 6.7 1, 8.1 1.9, 9 3.2 C 9.9 1.9, 11.3 1, 12.9 1 C 15.1 1, 17 2.8, 17 5.2 C 17 8.5, 14 11, 9 15 Z" fill="none" stroke="var(--t2-ink)" stroke-width="1.3"/>
        </svg>
      </div>
    </header>

    <main class="home" id="t2-home">
      <div class="grid" id="t2-grid">
        <!-- 标题 -->
        <section class="w-title" aria-label="Spark Light">
          <h1 class="mast">
            <span class="m-spark">Spark</span>
            <span class="m-light" aria-label="Light"><span class="half a" aria-hidden="true">Light</span><span class="half b" aria-hidden="true">Light</span>
              <svg class="cut" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M58.4 -4 L52 22 L55 30 L46 58 L48 66 L38.4 104"/><path class="d" d="M59.4 -4 L53 22 L56 30 L47 58 L49 66 L39.4 104"/><path d="M52 22 L44 18 M46 58 L56 63"/></svg>
            </span>
          </h1>
          <p class="vert" aria-label="跨次元营业中"><span>跨<em>次</em>元营业中</span><small>since the dream</small></p>
          <span class="handle glass"><span class="av" id="t2-ownerAv"></span><b id="t2-ownerName">@Shadow</b><small id="t2-ownerRole">站主</small></span>
        </section>

        <!-- 电话亭 -->
        <section class="w-booth glass" id="t2-booth" aria-label="跨次元电话亭">
          <div class="booth-stage"><button class="booth-btn" id="t2-boothBtn" type="button" aria-label="拿起话筒，拨给 Shadow"></button></div>
          <div class="booth-side">
            <h2 class="bs-h"><small>Phone booth</small>跨次元电话亭</h2>
            <div class="call-feed" id="t2-callFeed" aria-live="polite"><p class="cmsg">拿起话筒，看看 Shadow 今天在不在线。</p></div>
            <div class="call-bar" id="t2-callBar"><button class="pill solid" type="button" id="t2-dialBtn"><svg class="i" viewBox="0 0 24 24"><path d="M5 4h3.2l1.6 4-2 1.3a10.5 10.5 0 0 0 6.9 6.9l1.3-2 4 1.6V19a1.6 1.6 0 0 1-1.7 1.6C10.6 20.1 3.9 13.4 3.4 5.7A1.6 1.6 0 0 1 5 4Z"/></svg>拨号</button></div>
          </div>
        </section>

        <!-- 留言 -->
        <button class="w-msg glass" id="t2-wMsg" type="button">
          <span class="av" id="t2-msgAv"></span>
          <span class="wm-b"><span class="wm-t"><b>Shadow</b><span>刚刚</span></span>
            <span class="wm-p"><span class="mini" id="t2-miniBars"></span><span id="t2-wmText">留了 3 条语音，今天可以听一条</span></span></span>
          <span class="wm-dot"></span>
        </button>
      </div>

      <section class="notes" aria-labelledby="t2-notesH">
        <header class="notes-h"><h2 id="t2-notesH">从彼方寄来的字卡</h2><p>Notes from the other side</p></header>
        <div class="wall" id="t2-wall"></div>
        <div class="stubs" id="t2-stubs"></div>
      </section>
      <p class="foot">站内由 AI 生成的作品都会如实标注。</p>
    </main>

    <button class="banner glass" id="t2-banner" type="button"><span class="av" id="t2-bannerAv"></span><span><b>Shadow</b><span class="t">给你留了语音，今天可以听一条。</span></span></button>

    <dialog class="win" id="t2-win" aria-labelledby="t2-winTitle">
      <div class="win-in glass">
        <header class="win-h"><span class="ghost" id="t2-winGhost" aria-hidden="true"></span><h2 id="t2-winTitle"></h2>
          <button class="x" type="button" id="t2-winX" aria-label="关闭"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
        <div class="win-b" id="t2-winB"></div>
        <footer class="win-f" id="t2-winF"></footer>
      </div>
    </dialog>

    <canvas id="t2-fx" aria-hidden="true"></canvas>
    <div class="toast" id="t2-toast" role="status" aria-live="polite"></div>
  `;

  document.body.appendChild(stage);

  /* 工具函数 */
  const $ = (s, r = stage) => r.querySelector(s);
  const $$ = (s, r = stage) => [...r.querySelectorAll(s)];
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const rnd = (n) => Math.floor(Math.random() * n);

  let toastT;
  function toast(msg) {
    const t = $('#t2-toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2400);
  }

  const todayKey = () => {
    const dt = new Date();
    return `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`;
  };

  const cssVar = (v) => getComputedStyle(root).getPropertyValue(v).trim();
  let C = {};
  function readColors() {
    C = {
      thread: cssVar('--t2-thread') || '#D8466C',
      ice: cssVar('--t2-ice') || '#D2E5F3',
      rose: cssVar('--t2-rose') || '#EEA4BB',
      ink: cssVar('--t2-ink') || '#4D3747',
      milk: cssVar('--t2-milk') || '#FFFAF8',
      void: cssVar('--t2-void') || '#251A33',
      void2: cssVar('--t2-void2') || '#43295A'
    };
  }

  const FLAME_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.8 3.6 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.6 1.3-4.3 2.6-5.6.2 1.6.9 2.6 1.9 3.1C10.6 8 11 5 12 2.5Z" fill="#fff" opacity=".95"/><path d="M12 13c.4 1.4 2 2 2 3.7a2 2 0 0 1-4 0c0-1.1.7-1.8 1.4-2.3" fill="#FFB2C6"/></svg>`;
  let pid = 0;
  function plasterSVG() {
    const id = 't2-pp' + (pid++);
    return `<svg class="plaster" viewBox="0 0 120 38" aria-hidden="true">
      <defs><pattern id="${id}" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r=".9" fill="rgba(120,64,34,.3)"/></pattern></defs>
      <rect x="1" y="1" width="118" height="36" rx="18" fill="var(--t2-plaster)"/>
      <rect x="1" y="1" width="118" height="36" rx="18" fill="url(#${id})"/>
      <rect x="42" y="7" width="36" height="24" rx="6" fill="var(--t2-plaster-pad)"/>
      <path d="M60 26c-4-3-8-5.5-8-9.2a3.6 3.6 0 0 1 8-1.6 3.6 3.6 0 0 1 8 1.6c0 3.7-4 6.2-8 9.2Z" fill="var(--t2-thread)"/>
      <rect x="8" y="4" width="104" height="4.5" rx="2.2" fill="#fff" opacity=".28"/></svg>`;
  }

  function printSVG(cls = 'print') {
    let s = '';
    [3.5, 7, 10.5, 14, 17.5].forEach((r, i) => {
      const c = 2 * Math.PI * r;
      s += `<ellipse cx="20" cy="21" rx="${(r * .8).toFixed(1)}" ry="${r}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="${(c * .22).toFixed(1)} ${(c * .06).toFixed(1)} ${(c * .3).toFixed(1)} ${(c * .1).toFixed(1)}" transform="rotate(${i * 37} 20 21)"/>`;
    });
    return `<svg class="${cls}" viewBox="0 0 40 42" aria-hidden="true">${s}</svg>`;
  }

  function hydrate(scope = stage) {
    $$('#t2-ownerAv, #t2-msgAv, #t2-bannerAv, .av[data-flame]', scope).forEach((el) => { el.innerHTML = FLAME_SVG; });
    $$('[data-plaster]', scope).forEach((el) => { el.innerHTML = plasterSVG(); });
  }

  const GLYPH = '░▒▓*#+=%@';
  function decode(el, text, dur = 700) {
    return new Promise((res) => {
      if (reduced) { el.textContent = text; return res(); }
      const t0 = performance.now();
      (function step(now) {
        const p = Math.min(1, (now - t0) / dur), shown = Math.floor(p * text.length);
        let out = '';
        for (let i = 0; i < text.length; i++) out += (i < shown || text[i] === ' ') ? text[i] : GLYPH[rnd(GLYPH.length)];
        el.textContent = out;
        p < 1 ? requestAnimationFrame(step) : res();
      })(t0);
    });
  }

  async function typewrite(el, text, speed = 55) {
    if (reduced) { el.textContent = text; return; }
    el.textContent = '';
    for (const ch of text) { el.textContent += ch; await sleep(speed + rnd(35)); }
  }

  let actx = null;
  function radioSound(dur, crackle = .5) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const now = actx.currentTime;
      const master = actx.createGain(); master.gain.value = .06; master.connect(actx.destination);
      const len = actx.sampleRate * .35, buf = actx.createBuffer(1, len, actx.sampleRate), dt = buf.getChannelData(0);
      for (let i = 0; i < len; i++) dt[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const nz = actx.createBufferSource(); nz.buffer = buf;
      const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = .8;
      const ng = actx.createGain(); ng.gain.value = crackle;
      nz.connect(bp).connect(ng).connect(master); nz.start(now);
      const notes = [659.3, 784, 880, 1046.5, 784, 987.8];
      const n = Math.floor(dur / .45);
      for (let i = 0; i < n; i++) {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine'; o.frequency.value = notes[rnd(notes.length)];
        const st = now + .3 + i * .42;
        g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(.55, st + .04); g.gain.exponentialRampToValueAtTime(.001, st + .5);
        o.connect(g).connect(master); o.start(st); o.stop(st + .55);
      }
    } catch (e) {}
  }

  /* 电话亭插画 */
  function boothSVG() {
    let panes = '';
    [0, 1, 2].forEach((c) => [0, 1, 2, 3, 4].forEach((r) => {
      const x = 29 + c * 21.2, y = 50 + r * 25.4;
      panes += `<rect x="${x}" y="${y}" width="19.4" height="23.6" rx="1.6" fill="url(#t2-bGlass)"/><path d="M${x + 2} ${y + 3} l5 -1.5" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>`;
    }));
    return `<svg class="booth" viewBox="0 0 120 210" aria-hidden="true">
      <defs>
        <linearGradient id="t2-bFrame" x1="0" x2="1"><stop offset="0" stop-color="#F9B9CB"/><stop offset=".45" stop-color="#EE8FAC"/><stop offset="1" stop-color="#D96588"/></linearGradient>
        <linearGradient id="t2-bRoof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBC6D5"/><stop offset="1" stop-color="#E57C9C"/></linearGradient>
        <linearGradient id="t2-bGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".78"/><stop offset=".55" stop-color="#F4E8FA" stop-opacity=".42"/><stop offset="1" stop-color="#DDEBF8" stop-opacity=".6"/></linearGradient>
        <radialGradient id="t2-bLamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF4E6"/><stop offset="1" stop-color="#FFF4E6" stop-opacity="0"/></radialGradient>
        <filter id="t2-bBlur"><feGaussianBlur stdDeviation="3"/></filter>
      </defs>
      <ellipse class="glow-floor" cx="60" cy="202" rx="52" ry="7" fill="var(--t2-thread)" opacity=".18"/>
      <ellipse cx="60" cy="40" rx="70" ry="40" fill="url(#t2-bLamp)" opacity=".7"/>
      <path d="M18 34 Q18 12 60 10 Q102 12 102 34 Z" fill="url(#t2-bRoof)"/>
      <rect x="58" y="3" width="4" height="8" rx="2" fill="#E57C9C"/><circle cx="60" cy="3" r="3" fill="#FFF4E6"/>
      <rect x="30" y="18" width="60" height="13" rx="6.5" fill="#FFF8F5"/>
      <rect class="sign-glow" x="30" y="18" width="60" height="13" rx="6.5" fill="#FFE3EC" filter="url(#t2-bBlur)"/>
      <text x="60" y="28.2" text-anchor="middle" font-family="Bodoni Moda, Didot, serif" font-style="italic" font-weight="600" font-size="10" fill="#D8466C" letter-spacing="1.5">Call me</text>
      <rect x="16" y="34" width="88" height="164" rx="7" fill="url(#t2-bFrame)"/>
      <rect x="16" y="34" width="5" height="164" rx="2.5" fill="#FFD3DF" opacity=".7"/>
      <rect x="25" y="46" width="70" height="132" rx="3" fill="#C9557A"/>
      <g>
        <rect x="66" y="82" width="22" height="34" rx="4" fill="#FFF3F6"/>
        <rect x="70" y="86" width="14" height="7" rx="1.5" fill="#FDD6E1"/>
        <g fill="#E7A5BA"><circle cx="72" cy="99" r="1.4"/><circle cx="77" cy="99" r="1.4"/><circle cx="82" cy="99" r="1.4"/><circle cx="72" cy="104" r="1.4"/><circle cx="77" cy="104" r="1.4"/><circle cx="82" cy="104" r="1.4"/><circle cx="77" cy="109" r="1.4"/></g>
        <path d="M68 116 c0 6 -3 8 -1 12 s-3 6 -1 10 s-3 5 0 9" fill="none" stroke="#FFF3F6" stroke-width="1.5" stroke-linecap="round"/>
        <g class="handset"><path d="M63 84 q-4 0 -4 4 v14 q0 4 4 4 h2 v-4 h-1.5 v-14 H65 v-4 Z" fill="#FFFFFF"/><rect x="60" y="84" width="3" height="22" rx="1.5" fill="#FFF3F6"/></g>
        <g class="waves" transform="translate(48 76)"><path d="M0 8 a7 7 0 0 1 4 -6"/><path d="M-4 9 a11 11 0 0 1 6 -9"/><path d="M-8 10 a15 15 0 0 1 8 -12"/></g>
      </g>
      <g>${panes}</g>
      <rect x="89" y="118" width="3" height="16" rx="1.5" fill="#FFF0F4"/>
      <g transform="rotate(-28 46 70)"><rect x="34" y="66" width="26" height="8" rx="4" fill="var(--t2-plaster)"/><rect x="43" y="67.5" width="8" height="5" rx="1.5" fill="var(--t2-plaster-pad)"/></g>
      <path d="M30 60 l6 4 l-2 5 l6 3" fill="none" stroke="#fff" stroke-width=".8" opacity=".9"/>
      <rect x="12" y="194" width="96" height="8" rx="3" fill="#D96588"/>
    </svg>`;
  }

  /* 电话亭通话 */
  let callToken = 0, timerI = 0, live = false;
  const feed = () => $('#t2-callFeed');
  function cmsg(html, cls = '') {
    const p = document.createElement('div');
    p.className = 'cmsg ' + cls;
    p.innerHTML = html;
    feed().append(p);
    while (feed().children.length > 5) feed().firstElementChild.remove();
    return p;
  }
  async function dial(question) {
    const my = ++callToken, w = $('#t2-booth');
    if (live && !question) return;
    w.classList.remove('live'); w.classList.add('dialing');
    if (!question) feed().innerHTML = '';
    if (question) cmsg('想问：' + question, 'me');
    $('#t2-callBar').innerHTML = `<button class="pill end" type="button" id="t2-hangBtn"><svg class="i" viewBox="0 0 24 24"><path d="M5 4h3.2l1.6 4-2 1.3a10.5 10.5 0 0 0 6.9 6.9l1.3-2 4 1.6V19a1.6 1.6 0 0 1-1.7 1.6C10.6 20.1 3.9 13.4 3.4 5.7A1.6 1.6 0 0 1 5 4Z"/></svg>挂断</button><span class="timer" id="t2-timer">拨号中</span>`;
    $('#t2-hangBtn').addEventListener('click', hang);
    if (navigator.vibrate) navigator.vibrate(12);
    radioSound(1.2, .7);
    const st = cmsg('正在跨越次元…');
    await sleep(reduced ? 0 : 1400); if (my !== callToken) return;
    st.remove(); w.classList.replace('dialing', 'live'); live = true;
    let s = 0; clearInterval(timerI);
    const tm = $('#t2-timer'); tm.textContent = '00:00';
    timerI = setInterval(() => { s++; tm.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }, 1000);
    await sleep(700); if (my !== callToken) return;
    if (question) {
      cmsg('收到。下单方式在下面，选一个找我就好。');
    } else {
      const state = d.status.state;
      const isOpen = state === 'open';
      const big = cmsg('', 'big');
      await decode(big, isOpen ? 'Shadow 现在接单中' : 'Shadow 暂停接单', 600);
      await sleep(500); if (my !== callToken) return;
      cmsg(d.status.taken != null && d.status.total ? `已排单：${d.status.taken} / ${d.status.total}` : '剩余名额：待站主安排');
    }
    if (my !== callToken) return;
    const btn = document.createElement('button');
    btn.className = 'pill ghost'; btn.type = 'button'; btn.textContent = '下单方式';
    btn.addEventListener('click', showContacts);
    $('#t2-callBar').prepend(btn);
  }

  function hang() {
    callToken++; live = false; clearInterval(timerI);
    const w = $('#t2-booth'); w.classList.remove('live', 'dialing');
    cmsg('通话结束。想再问的话，随时拿起话筒。');
    $('#t2-callBar').innerHTML = `<button class="pill solid" type="button" id="t2-dialBtn"><svg class="i" viewBox="0 0 24 24"><path d="M5 4h3.2l1.6 4-2 1.3a10.5 10.5 0 0 0 6.9 6.9l1.3-2 4 1.6V19a1.6 1.6 0 0 1-1.7 1.6C10.6 20.1 3.9 13.4 3.4 5.7A1.6 1.6 0 0 1 5 4Z"/></svg>拨号</button>`;
    $('#t2-dialBtn').addEventListener('click', () => dial());
  }

  function showContacts() {
    if ($('#t2-callFeed .contacts')) return;
    const chans = (d.contact.channels || []).filter((c) => c && c.value);
    const listHtml = chans.length ? chans.map((c) => `<li><span>${c.label || ''}</span><span>${c.value}</span></li>`).join('') : '<li><span>联系渠道</span><span class="ph">待站主提供</span></li>';
    cmsg(`<ul>${listHtml}</ul>`, 'contacts');
  }

  function callFromApp(q) {
    closeWin().then(() => {
      $('#t2-booth').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      setTimeout(() => dial(q), reduced ? 0 : 450);
    });
  }

  /* 独立弹窗机制 */
  const APPS = {
    tarot: { t: '占卜', g: 'Divination', sub: '擦开雾气，看看今天的指引', build: buildTarot },
    code: { t: '网站定制', g: 'Vibecoding', sub: '一起写一个只属于你们的网站', build: buildCode },
    ai: { t: '漫剧生图', g: 'AI Studio', sub: 'AI 生成的作品都会如实标注', build: buildAI },
    radio: { t: '调频', g: 'Frequency', sub: '转动刻度，找到 Shadow 的频道', build: buildRadio },
    price: { t: '价目', g: 'Price list', sub: '以人民币计，点一项可以直接问', build: buildPrice },
    notice: { t: '营业须知', g: 'Agreement', sub: '下单之前，请读完这份跨次元协议', build: buildNotice },
    voice: { t: 'Shadow', g: 'Messages', sub: '来自彼方的语音，每天可以听一条', build: buildVoice },
    settings: { t: '设置', g: 'Settings', sub: '手帐外观与动效', build: buildSettings }
  };

  let openFrom = null, winCleanup = null, winOpen = false;
  async function openWin(key, from, opt) {
    const a = APPS[key], dlg = $('#t2-win');
    if (winOpen) await closeWin(true);
    winOpen = true;
    $('#t2-winGhost').textContent = a.g;
    $('#t2-winTitle').innerHTML = `${a.t}<small>${a.sub}</small>`;
    $('#t2-winB').innerHTML = ''; $('#t2-winF').innerHTML = ''; $('#t2-winF').hidden = false;
    winCleanup = a.build($('#t2-winB'), $('#t2-winF'), opt) || null;
    if (!$('#t2-winF').children.length) $('#t2-winF').hidden = true;
    hydrate(dlg);
    dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', '');
    $('#t2-winB').scrollTop = 0;
    openFrom = from || null;
  }

  async function closeWin() {
    const dlg = $('#t2-win'); if (!winOpen) return;
    winOpen = false;
    if (winCleanup) { winCleanup(); winCleanup = null; }
    dlg.close ? dlg.close() : dlg.removeAttribute('open');
    if (openFrom) openFrom.focus({ preventScroll: true });
  }

  function seg(names, sel, onPick) {
    const s = document.createElement('div'); s.className = 'seg'; s.setAttribute('role', 'tablist');
    s.innerHTML = names.map((n, i) => `<button type="button" role="tab" aria-selected="${i === sel}" data-i="${i}">${n}</button>`).join('');
    s.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('button', s).forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      onPick(+b.dataset.i);
    });
    return s;
  }

  /* 业务 1：占卜雾面卡 */
  function buildTarot(b, f) {
    const cards = d.cards.cards || [];
    const sampleCard = cards.length ? cards[rnd(cards.length)] : { glyph: '*', text: '今天先把想说的话，写给自己看一遍。' };
    b.innerHTML = `
      <div class="row"><span class="av" data-flame></span><span class="bub">雷诺曼、塔罗、字卡与指引类。</span></div>
      <div class="chips"><span class="chip">雷诺曼</span><span class="chip">塔罗</span><span class="chip">字卡</span><span class="chip">前世今生</span></div>
      <div class="row"><span class="av" data-flame></span><span class="bub">今天的指引，我写在起雾的玻璃上了。</span></div>
      <div class="fogcard" id="t2-fog"><p class="q">今日指引</p><p class="a">${sampleCard.text}</p><p class="s">正式字卡抽牌</p>
        <canvas></canvas><span class="fog-hint"><svg class="i" viewBox="0 0 24 24"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4.5A6.5 6.5 0 0 1 11.5 21 6 6 0 0 1 6.7 18L4.5 14a1.5 1.5 0 0 1 2.6-1.5L9 15"/></svg>用手指擦开雾气</span></div>
      <p class="small-note">每天的指引不同。想认真问一个问题，看看价目再拨电话。</p>`;
    f.innerHTML = `<button class="pill ghost" type="button" data-open="price" data-tab="0">看价目</button><button class="pill solid" type="button" data-callq="占卜">打电话问问</button>`;
    requestAnimationFrame(() => setupFog($('#t2-fog', b)));
  }

  function setupFog(card) {
    const cv = $('canvas', card), ctx = cv.getContext('2d');
    const W = card.offsetWidth || 300, H = card.offsetHeight || 160, sc = Math.min(2, devicePixelRatio || 1);
    cv.width = W * sc; cv.height = H * sc; ctx.scale(sc, sc);
    const g = ctx.createLinearGradient(0, 0, W, H);
    const dark = root.getAttribute('data-t2-mode') === 'dark' || (root.getAttribute('data-t2-mode') === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    g.addColorStop(0, dark ? '#5A3C55' : '#FFF8FA'); g.addColorStop(1, dark ? '#463450' : '#F1E6F7');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * W, y = Math.random() * H, rr = 30 + Math.random() * 50, rg = ctx.createRadialGradient(x, y, 0, x, y, rr);
      rg.addColorStop(0, dark ? 'rgba(255,200,225,.18)' : 'rgba(250,214,226,.5)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }
    if (reduced) { card.classList.add('clear', 'touched'); return; }
    let down = false, last = null, wiped = 0;
    ctx.globalCompositeOperation = 'destination-out'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pt = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const wipe = (p) => {
      ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo((last || p).x, (last || p).y); ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p; if (++wiped % 8 === 0) check();
    };
    function check() {
      const img = ctx.getImageData(0, 0, cv.width, cv.height).data; let clear = 0, tot = 0;
      for (let i = 3; i < img.length; i += 64) { tot++; if (img[i] < 40) clear++; }
      if (clear / tot > .45) { card.classList.add('clear'); toast('指引已显现'); }
    }
    cv.addEventListener('pointerdown', (e) => { down = true; last = null; card.classList.add('touched'); cv.setPointerCapture(e.pointerId); wipe(pt(e)); });
    cv.addEventListener('pointermove', (e) => { if (down) wipe(pt(e)); });
    ['pointerup', 'pointercancel'].forEach((ev) => cv.addEventListener(ev, () => { down = false; last = null; }));
  }

  /* 业务 2：网站定制 */
  const CODE_SNIPPETS = [
    { raw: 'const you = here();', html: '<span class="k">const</span> you = <span class="f">here</span>();' },
    { raw: 'const me = there();', html: '<span class="k">const</span> me = <span class="f">there</span>();' },
    { raw: 'thread.tie(you, me);', html: 'thread.<span class="f">tie</span>(you, me);' },
    { raw: "render('SparkLight');", html: '<span class="f">render</span>(<span class="s">\'SparkLight\'</span>);' }
  ];
  function buildCode(b, f) {
    const cat = (d.services.categories || []).find((c) => c.id === 'vibecoding') || {};
    const it = (cat.items || [])[0] || { name: '网站定制', price: 100, unit: '元起' };
    const rules = cat.rules || ['大改内容、元素或风格需另外加钱。', '加急加 30 至 50 元，按具体情况定。'];
    b.innerHTML = `<article class="post glass">
      <header class="p-head"><span class="av" data-flame></span><span><b>Shadow</b><small>@Shadow 刚刚</small></span><span class="price ptag"><b>${it.price}</b><em>${it.unit || '元起'}</em></span></header>
      <p class="p-txt">${cat.summary || '网站定制，按难度和功能决定工期与价格。'}</p>
      <div class="m-code" aria-hidden="true"><div class="ed"><div class="ed-bar"><i></i><i></i><i></i></div><div class="ed-code"></div></div>
        <div class="pv"><div class="pv-hero"></div><svg viewBox="0 0 60 20"><path class="tl" d="M8 10 C 22 -2, 38 22, 52 10"/><circle class="d d1" cx="8" cy="10" r="3"/><circle class="d d2" cx="52" cy="10" r="3"/></svg>
          <div class="pv-row"></div><div class="pv-row s"></div><div class="pv-blk"><i></i><i></i></div></div></div>
      <div class="comments">${rules.map((r) => `<div class="cm"><span class="av" data-flame></span><p><span class="pin">置顶</span><b>Shadow</b>${r}</p></div>`).join('')}</div>
    </article>`;
    f.innerHTML = `<button class="pill ghost" type="button" data-open="price" data-tab="1">看价目</button><button class="pill solid" type="button" data-callq="网站定制">打电话问问</button>`;
    const m = $('.m-code', b), box = $('.ed-code', m); let alive = true;
    (async () => {
      if (reduced) {
        box.innerHTML = CODE_SNIPPETS.map((c, i) => `<span class="n">${i + 1}</span>${c.html}`).join('\n');
        m.classList.add('s4');
        return;
      }
      while (alive) {
        m.classList.remove('s1', 's2', 's3', 's4'); box.innerHTML = '';
        for (let i = 0; i < CODE_SNIPPETS.length && alive; i++) {
          const line = document.createElement('div'); box.append(line);
          line.innerHTML = `<span class="n">${i + 1}</span><span></span><i class="cur"></i>`;
          const t = line.children[1];
          for (const ch of CODE_SNIPPETS[i].raw) { if (!alive) return; t.textContent += ch; await sleep(40 + rnd(40)); }
          line.innerHTML = `<span class="n">${i + 1}</span>${CODE_SNIPPETS[i].html}`;
          m.classList.add('s' + (i + 1)); await sleep(350);
        }
        await sleep(2800);
      }
    })();
    return () => { alive = false; };
  }

  /* 业务 3：AI 生图与漫剧 */
  function aiScene(ctx) {
    const w = 240, h = 180;
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#F6D3E0'); g.addColorStop(.55, '#E6D6F6'); g.addColorStop(1, '#FFE9DE');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const mg = ctx.createRadialGradient(172, 56, 4, 172, 56, 50); mg.addColorStop(0, 'rgba(255,255,255,1)'); mg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = mg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(172, 56, 15, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#fff'; [[30, 30], [62, 18], [96, 44], [130, 22], [210, 30], [44, 70]].forEach(([x, y]) => ctx.fillRect(x, y, 2, 2));
    ctx.fillStyle = '#E7B8C9'; ctx.beginPath(); ctx.ellipse(120, 175, 160, 30, 0, 0, 6.283); ctx.fill();
    const fig = (x) => { ctx.beginPath(); ctx.arc(x, 110, 8, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 11, 152); ctx.quadraticCurveTo(x, 110, x + 11, 152); ctx.fill(); };
    ctx.fillStyle = '#7B5370'; fig(78); ctx.fillStyle = '#9C86C4'; fig(162);
    ctx.strokeStyle = '#D8466C'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(87, 132); ctx.bezierCurveTo(105, 150, 132, 112, 153, 132); ctx.stroke();
  }
  function buildAI(b, f) {
    const tabs = [{ name: '漫剧', text: '漫剧细则待站主提供' }, { name: '生图', text: '生图细则待站主提供' }];
    const s = seg(tabs.map((t) => t.name), 0, (i) => { $('.ai-cap', b).textContent = tabs[i].text; });
    b.append(s);
    b.insertAdjacentHTML('beforeend', `<article class="post glass"><header class="p-head"><span class="av" data-flame></span><span><b>Shadow</b><small>@Shadow 刚刚</small></span></header>
      <div class="m-ai"><canvas width="240" height="180" aria-hidden="true"></canvas><p class="ai-prompt"><b>提示词</b><span class="ai-t"></span></p><span class="ai-tag">AI 生成</span></div>
      <p class="p-txt" style="margin:10px 0 0"><span class="ph ai-cap">${tabs[0].text}</span></p></article>`);
    if (window.SLAiMosaic) window.SLAiMosaic(b);
    f.innerHTML = `<button class="pill ghost" type="button" data-open="price" data-tab="3">看价目</button><button class="pill solid" type="button" data-callq="AI 创作">打电话问问</button>`;
    const m = $('.m-ai', b), cv = $('canvas', m), ctx = cv.getContext('2d'), tEl = $('.ai-t', m);
    const off = document.createElement('canvas'); off.width = 240; off.height = 180; aiScene(off.getContext('2d'));
    const small = document.createElement('canvas'), sc = small.getContext('2d');
    const show = (n) => { small.width = n; small.height = Math.round(n * .75); sc.drawImage(off, 0, 0, small.width, small.height); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, 240, 180); ctx.drawImage(small, 0, 0, 240, 180); };
    const prompt = '一根红线，穿过裂开的屏幕';
    let alive = true;
    (async () => {
      if (reduced) { show(240); tEl.textContent = prompt; return; }
      while (alive) {
        show(6); await typewrite(tEl, prompt, 60);
        for (const n of [8, 12, 20, 32, 60, 120, 240]) { if (!alive) return; show(n); await sleep(n < 60 ? 360 : 240); }
        await sleep(3200);
      }
    })();
    return () => { alive = false; };
  }

  /* 业务 4：调频收音机 */
  function buildRadio(b) {
    const TARGET = 520.1, MIN = 500, MAX = 540, PXU = 26;
    let freq = 512.4, vel = 0, locked = false, alive = true, drag = null;
    b.innerHTML = `<div class="radio glass" id="t2-radio"><p class="freq"><span id="t2-fq">512.4</span><small>次元频段</small></p><p class="rstate" id="t2-rs">信号嘈杂</p>
      <canvas class="scope" id="t2-scope"></canvas>
      <div class="dial" id="t2-dial" role="slider" tabindex="0" aria-label="调频刻度" aria-valuemin="${MIN}" aria-valuemax="${MAX}"><canvas id="t2-dialCv"></canvas><span class="needle"></span></div>
      <p class="dial-hint">左右拖动刻度，也可以用键盘左右方向键</p></div>
      <div class="r-out" id="t2-rout"></div>`;
    const dial = $('#t2-dial', b), dcv = $('#t2-dialCv', b), dctx = dcv.getContext('2d'), scv = $('#t2-scope', b), sctx = scv.getContext('2d');
    const sc = Math.min(2, devicePixelRatio || 1);
    function size() { [dcv, scv].forEach((c) => { c.width = c.offsetWidth * sc; c.height = c.offsetHeight * sc; }); }
    requestAnimationFrame(size);
    function drawDial() {
      const W = dcv.width / sc, H = dcv.height / sc; dctx.setTransform(sc, 0, 0, sc, 0, 0); dctx.clearRect(0, 0, W, H);
      dctx.fillStyle = C.ink; dctx.strokeStyle = C.ink; dctx.font = '10px "Bodoni Moda", serif'; dctx.textAlign = 'center';
      for (let v = Math.floor(freq - W / 2 / PXU * 1) - 1; v <= freq + W / 2 / PXU + 1; v += .2) {
        const vv = Math.round(v * 5) / 5; if (vv < MIN || vv > MAX) continue;
        const x = W / 2 + (vv - freq) * PXU, major = Math.abs(vv - Math.round(vv)) < .01;
        dctx.globalAlpha = major ? .7 : .28; dctx.lineWidth = 1;
        dctx.beginPath(); dctx.moveTo(x, H - 8); dctx.lineTo(x, H - (major ? 24 : 15)); dctx.stroke();
        if (major && Math.round(vv) % 2 === 0) { dctx.globalAlpha = .65; dctx.fillText(Math.round(vv), x, 18); }
      }
      const tx = W / 2 + (TARGET - freq) * PXU; dctx.globalAlpha = .9; dctx.fillStyle = C.thread;
      dctx.beginPath(); dctx.arc(tx, H - 30, 3, 0, 6.28); dctx.fill(); dctx.globalAlpha = 1;
    }
    let t = 0;
    function drawScope() {
      const W = scv.width / sc, H = scv.height / sc; sctx.setTransform(sc, 0, 0, sc, 0, 0); sctx.clearRect(0, 0, W, H);
      const dist = Math.min(1, Math.abs(freq - TARGET) / 3);
      sctx.strokeStyle = C.thread; sctx.lineWidth = 1.6; sctx.globalAlpha = .9; sctx.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const clean = Math.sin(x / 18 + t * 4) * 14 * Math.sin(Math.PI * x / W);
        const noise = (Math.random() * 2 - 1) * 22 * dist;
        const y = H / 2 + clean * (1 - dist) + noise;
        x ? sctx.lineTo(x, y) : sctx.moveTo(x, y);
      }
      sctx.stroke(); sctx.globalAlpha = 1;
    }
    function update() {
      freq = Math.max(MIN, Math.min(MAX, freq));
      $('#t2-fq', b).textContent = freq.toFixed(1); dial.setAttribute('aria-valuenow', freq.toFixed(1));
      const near = Math.abs(freq - TARGET) < .25;
      if (near && !locked && !drag && Math.abs(vel) < .02) { locked = true; freq = TARGET; vel = 0; lockIn(); }
      if (!near && locked) { locked = false; $('#t2-radio', b).classList.remove('locked'); $('#t2-rs', b).textContent = '信号嘈杂'; }
      if (!locked) $('#t2-rs', b).textContent = Math.abs(freq - TARGET) < 2 ? '好像听到了什么…' : '信号嘈杂';
    }
    async function lockIn() {
      $('#t2-radio', b).classList.add('locked'); $('#t2-rs', b).textContent = '已调到 Shadow 的频道';
      if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
      radioSound(1.4, .3);
      const o = $('#t2-rout', b);
      if (!o.innerHTML) {
        o.innerHTML = `<div class="row"><span class="av" data-flame></span><span class="bub"><span class="rt"></span></span></div>`; hydrate(o);
        await decode($('.rt', o), '调频与灵摆细则待站主提供。跨越次元，找到内心的平衡。', 800);
        o.insertAdjacentHTML('beforeend', `<div style="display:flex;gap:8px;margin-left:36px"><button class="pill ghost" type="button" data-open="price" data-tab="2">看价目</button><button class="pill solid" type="button" data-callq="调频">打电话问问</button></div>`);
      }
    }
    dial.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, f: freq, lx: e.clientX, lt: performance.now() }; vel = 0; dial.setPointerCapture(e.pointerId); });
    dial.addEventListener('pointermove', (e) => {
      if (!drag) return; const now = performance.now();
      freq = drag.f - (e.clientX - drag.x) / PXU;
      vel = -(e.clientX - drag.lx) / PXU / Math.max(16, now - drag.lt) * 16; drag.lx = e.clientX; drag.lt = now; update();
    });
    ['pointerup', 'pointercancel'].forEach((ev) => dial.addEventListener(ev, () => { drag = null; }));
    (function frame() {
      if (!alive) return;
      if (!drag && !locked && Math.abs(vel) > .001) { freq += vel; vel *= .92; }
      if (!drag && Math.abs(freq - TARGET) < .6 && !locked) { freq += (TARGET - freq) * .08; }
      update(); t += .016; drawDial(); drawScope();
      requestAnimationFrame(frame);
    })();
    return () => { alive = false; };
  }

  /* 业务 5：价目小票清单 */
  function buildPrice(b, f, opt) {
    const start = opt && opt.tab != null ? opt.tab : 0;
    const cats = d.services.categories || [];
    const catTitles = cats.map((c) => c.title || c.name || c.id);
    b.append(seg(catTitles, start, (i) => show(i)));
    const box = document.createElement('div'); b.append(box);
    f.innerHTML = `<div class="askbar" id="t2-askbar"><span id="t2-askT"></span><button class="pill solid" type="button" id="t2-askGo"><svg class="i" viewBox="0 0 24 24"><path d="M5 4h3.2l1.6 4-2 1.3a10.5 10.5 0 0 0 6.9 6.9l1.3-2 4 1.6V19a1.6 1.6 0 0 1-1.7 1.6C10.6 20.1 3.9 13.4 3.4 5.7A1.6 1.6 0 0 1 5 4Z"/></svg>拨号问</button></div>
      <button class="pill ghost" type="button" data-open="notice" id="t2-toNotice">先读营业须知</button>`;
    let sel = null;
    function show(i) {
      const cat = cats[i] || {};
      const items = cat.items || [];
      sel = null; $('#t2-askbar').classList.remove('on'); $('#t2-toNotice').hidden = false;
      if (!items.length) {
        box.innerHTML = `<div class="row"><span class="av" data-flame></span><span class="typing"><span class="dots"><i></i><i></i><i></i></span>${cat.title || '该项'}的价目，Shadow 还在输入</span></div>`;
        hydrate(box); if (cat.id === 'ai' && window.SLAiMosaic) window.SLAiMosaic(box); return;
      }
      box.innerHTML = `<div class="receipt">${items.map((p) => `<button class="pr" type="button" data-item="${p.name}"><span class="nm"><b>${p.name}</b><small>${p.note || ''}</small></span><span class="ptag"><b>${p.price}</b><em>${p.from ? '元起' : (p.unit || '元')}</em></span></button>`).join('')}</div>
        ${cat.rules && cat.rules.length ? `<ul class="rules">${cat.rules.map((r) => `<li>${r}</li>`).join('')}</ul>` : ''}`;
      if (cat.id === 'ai' && window.SLAiMosaic) window.SLAiMosaic(box);
    }
    box.addEventListener('click', (e) => {
      const r = e.target.closest('.pr'); if (!r) return;
      $$('.pr', box).forEach((x) => x.classList.toggle('sel', x === r)); sel = r.dataset.item;
      $('#t2-askT').textContent = '想问：' + sel; $('#t2-askbar').classList.add('on'); $('#t2-toNotice').hidden = true;
    });
    $('#t2-askGo').addEventListener('click', () => sel && callFromApp(sel));
    show(start);
  }

  /* 业务 6：营业须知契约盖印 */
  function buildNotice(b) {
    const groups = d.notice.groups || [];
    b.append(seg(groups.map((g) => g.title), 0, (i) => show(i)));
    b.insertAdjacentHTML('beforeend', `<div class="terms"><ol id="t2-terms"></ol></div>
      <div class="sign glass" id="t2-sign"><button class="fp" id="t2-fp" type="button" aria-label="按住一秒，留下指印">
        <svg class="ring" viewBox="0 0 76 76" aria-hidden="true"><circle id="t2-fpRing" cx="38" cy="38" r="35" stroke-dasharray="219.9" stroke-dashoffset="219.9"/></svg>${printSVG()}</button>
        <p id="t2-signText"><b>按住一秒，留下指印</b>表示你已经读过这些条款。</p>
        <span class="stamp" aria-hidden="true"><span data-plaster></span><span class="stamp-t">已读</span></span></div>`);
    function show(i) {
      const grp = groups[i] || { clauses: [] };
      $('#t2-terms', b).innerHTML = grp.clauses.map((t, k) => `<li style="animation-delay:${k * 60}ms"><span>${t}</span></li>`).join('');
    }
    show(0);
    const sign = $('#t2-sign', b), fp = $('#t2-fp', b), ring = $('#t2-fpRing', b), CIR = 219.9, HOLD = 1000;
    let t0 = 0, raf = 0, done = store.get('signed', false);
    const setP = (p) => ring.style.strokeDashoffset = CIR * (1 - p);
    const finish = (silent) => {
      done = true; sign.classList.add('signed'); setP(1);
      $('#t2-signText', b).innerHTML = '<b>已按印</b>下单前也可以随时回来再看一遍。';
      store.set('signed', true);
      const ns = $('#t2-noticeState'); if (ns) ns.textContent = '已按印，可以随时回来再看';
      if (!silent && navigator.vibrate) navigator.vibrate([20, 40, 20]);
    };
    if (done) finish(true);
    function start(e) {
      if (done) return; e && e.preventDefault(); fp.classList.add('holding'); t0 = performance.now();
      (function step(now) {
        const p = Math.min(1, (now - t0) / HOLD); setP(p);
        if (p >= 1) { fp.classList.remove('holding'); finish(); return; }
        raf = requestAnimationFrame(step);
      })(t0);
    }
    function stop() { if (done) return; cancelAnimationFrame(raf); fp.classList.remove('holding'); setP(0); }
    fp.addEventListener('pointerdown', start);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => fp.addEventListener(ev, stop));
  }

  /* 业务 7：彼方语音留言 */
  let playing = false;
  function heardToday() { const h = store.get('heard', null); return h && h.d === todayKey() ? h.i : null; }
  function buildVoice(b, f) {
    const h = heardToday();
    const voices = ['今天先把想说的话，写给自己看一遍。', '跨越次元的红线，无论多远都不会断。', '夜晚很长，记得给自己热一杯牛奶。'];
    b.innerHTML = `<p class="thread-day">今天</p>` + voices.map((v, i) => {
      const bars = Array.from({ length: 24 }, (_, k) => `<i style="height:${(4 + Math.abs(Math.sin(k * .7 + i * 2)) * 14 + rnd(4)).toFixed(0)}px"></i>`).join('');
      return `<div class="vmsg" data-i="${i}"><div class="vrow"><span class="av" data-flame style="width:28px;height:28px"></span><button class="vb" type="button" aria-label="播放第 ${i + 1} 条语音"><span class="pl"><svg viewBox="0 0 12 12"><path d="M3 1.5v9l7.5-4.5Z"/></svg></span><span class="bars">${bars}</span><span class="dur">${[6, 9, 7][i]}″</span></button><span class="ud"></span><span class="later"></span></div></div>`;
    }).join('') + `<div id="t2-mine"></div>`;
    f.innerHTML = `<form class="compose" id="t2-compose"><input id="t2-cin" type="text" maxlength="60" placeholder="回一句话给彼方" aria-label="回一句话给彼方" autocomplete="off"><button class="send" type="submit" aria-label="发送"><svg class="i" viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button></form>`;
    if (h != null) markHeard(b, h, true, voices);
    b.addEventListener('click', (e) => { const vb = e.target.closest('.vb'); if (vb) playVoice(b, +vb.closest('.vmsg').dataset.i, voices); });
    $('#t2-compose', f).addEventListener('submit', async (e) => {
      e.preventDefault(); const v = $('#t2-cin', f).value.trim(); if (!v) return; $('#t2-cin', f).value = '';
      const m = document.createElement('div'); m.className = 'mine'; m.innerHTML = `<span class="bub"></span>`; $('.bub', m).textContent = v;
      $('#t2-mine', b).append(m); b.scrollTop = b.scrollHeight;
      await sleep(reduced ? 0 : 900);
      m.insertAdjacentHTML('beforeend', `<span class="undeliv"><i>!</i>未送达，信号停在了次元边界</span>`); b.scrollTop = b.scrollHeight;
    });
  }

  function markHeard(b, i, withText, voices) {
    $$('.vmsg', b).forEach((o) => {
      const k = +o.dataset.i;
      if (k === i) o.classList.add('heard'); else { o.classList.add('locked'); $('.later', o).textContent = '明天再听'; }
    });
    if (withText) {
      const m = $(`.vmsg[data-i="${i}"]`, b);
      m.insertAdjacentHTML('beforeend', `<div class="trans"><small>转文字</small><span>${voices[i]}</span></div>`);
      $$('.bars i', m).forEach((x) => x.classList.add('lit'));
    }
    syncWidget();
  }

  async function playVoice(b, i, voices) {
    if (playing) return;
    const h = heardToday();
    if (h != null && h !== i) { toast('今天已经听过一条了，明天再来'); return; }
    if (h === i) return;
    const m = $(`.vmsg[data-i="${i}"]`, b), bars = $$('.bars i', m);
    playing = true; store.set('heard', { d: todayKey(), i });
    m.classList.add('playing'); markHeard(b, i, false, voices);
    const dur = 2.8; radioSound(dur);
    if (reduced) bars.forEach((x) => x.classList.add('lit'));
    else for (const x of bars) { x.classList.add('lit'); await sleep(dur * 1000 / bars.length); }
    m.classList.remove('playing');
    const tr = document.createElement('div'); tr.className = 'trans'; tr.innerHTML = '<small>转文字</small><span class="dots"><i></i><i></i><i></i></span>';
    m.append(tr); await sleep(reduced ? 0 : 700);
    tr.innerHTML = '<small>转文字</small><span class="tt"></span>';
    await decode($('.tt', tr), voices[i], 900);
    playing = false;
  }

  function syncWidget() {
    const h = heardToday(), w = $('#t2-wMsg');
    w.classList.toggle('read', h != null);
    $('#t2-wmText').textContent = h != null ? '今天的这一条已收听，明天还有' : '留了 3 条语音，今天可以听一条';
  }

  /* 手帐外观与动效设置 */
  function buildSettings(b) {
    b.innerHTML = `<p class="set-h">手帐模式</p><div class="set-list" role="radiogroup" aria-label="外观">
        ${[['auto', '跟随系统'], ['light', '乳白草莓'], ['dark', '夜樱暗色']].map(([k, n]) => `<button type="button" role="radio" aria-checked="${themeMode === k}" data-mode-k="${k}"><span>${n}</span><span class="radio-dot"></span></button>`).join('')}</div>
      <p class="set-h">动效</p><div class="set-list">
        <button class="switch" type="button" id="t2-swMotion" aria-pressed="${reduced}"><span>简化动效</span><i></i></button></div>
      <p class="set-h">切换网站主题</p><div class="set-list">
        <button type="button" id="t2-swT1"><span>返回「白黑弥散星空」</span><span style="color:var(--t2-soft);font-size:12px">原生星盘</span></button></div>`;
    b.addEventListener('click', (e) => {
      const t = e.target.closest('[data-mode-k]');
      if (t) {
        themeMode = t.dataset.modeK;
        store.set('mode', themeMode);
        root.setAttribute('data-t2-mode', themeMode);
        readColors(); drawCrack(1);
        $$('[data-mode-k]', b).forEach((x) => x.setAttribute('aria-checked', String(x === t)));
        toast('外观已更新');
        return;
      }
      if (e.target.closest('#t2-swMotion')) {
        reduced = !reduced;
        store.set('reduce', reduced);
        $('#t2-swMotion', b).setAttribute('aria-pressed', String(reduced));
        drawCrack(1);
        toast(reduced ? '已简化动效' : '已恢复动效');
        return;
      }
      if (e.target.closest('#t2-swT1')) {
        if (window.SLSwitchTheme) window.SLSwitchTheme('t1-starfield');
      }
    });
  }

  /* 裂缝画布 */
  const ccv = $('#t2-crackCv'), cctx = ccv.getContext('2d');
  let crackPts = [], crackBranches = [], crackStars = [], keepOut = [];
  function seeded(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
  function buildCrack() {
    const W = innerWidth, H = innerHeight, R = seeded(7);
    const mob = W < 860, margin = (W - 1000) / 2;
    keepOut = ['.status', '.m-spark', '.m-light', '.vert', '.handle', '#t2-booth', '#t2-wMsg', '.notes-h', '.note', '.stub', '.foot']
      .flatMap((sel) => $$(sel)).map((el) => { const r = el.getBoundingClientRect(); return { x: r.left - 12, y: r.top + scrollY - 12, w: r.width + 24, h: r.height + 24 }; });
    const rect = (sel) => { const el = $(sel); if (!el) return { l: 0, r: 0, t: 0, b: 0 }; const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY }; };
    let sx = W + 4, sy, ex, ey;
    if (mob) {
      const v = rect('.vert'), hd = rect('.handle'), bo = rect('#t2-booth');
      sy = v.b + 22; ex = Math.min(W - 90, hd.r + 36); ey = bo.t - 26;
      if (ey - sy < 24) sy = ey - 24;
    } else {
      sy = 110; ex = margin > 140 ? W - margin + 34 : W - 120; ey = Math.min(H * .7, 560);
    }
    crackPts = []; const n = 13;
    for (let i = 0; i <= n; i++) {
      const t = i / n, jit = (i === 0 || i === n) ? 0 : (R() - .5) * 26;
      const nx = -(ey - sy), ny = (ex - sx), L = Math.hypot(nx, ny) || 1;
      crackPts.push({ x: sx + (ex - sx) * t + nx / L * jit, y: sy + (ey - sy) * t + ny / L * jit, w: Math.sin(Math.PI * Math.min(1, t * 1.15)) * (W < 860 ? 6 : 8) });
    }
    crackBranches = [];
    [2, 4, 6, 8, 10].forEach((k, j) => {
      const p = crackPts[k], a = Math.atan2(ey - sy, ex - sx) + (j % 2 ? 1 : -1) * (0.7 + R() * .7);
      const len = 22 + R() * 38, segs = [{ x: p.x, y: p.y }];
      for (let s = 1; s <= 3; s++) segs.push({ x: p.x + Math.cos(a + (R() - .5) * .5) * len * s / 3, y: p.y + Math.sin(a + (R() - .5) * .5) * len * s / 3 });
      crackBranches.push({ at: k / n, seg: segs });
    });
    crackStars = Array.from({ length: 40 }, () => ({ t: R(), o: R() - .5, r: R() * 1.2 + .3, ph: R() * 6.28 }));
    const hit = (x, y) => keepOut.some((r) => x + 52 > r.x && x - 52 < r.x + r.w && y + 26 > r.y && y - 26 < r.y + r.h);
    let ki = 6; for (const k of [6, 7, 5, 8, 4, 9, 3, 10]) { if (crackPts[k] && !hit(crackPts[k].x, crackPts[k].y)) { ki = k; break; } }
    if (crackPts[ki] && crackPts[ki + 1]) {
      const pk = crackPts[ki], pk2 = crackPts[ki + 1];
      const ang = Math.atan2(pk2.y - pk.y, pk2.x - pk.x) * 180 / Math.PI + 74;
      const pl = $('#t2-crackPlaster'); pl.style.left = (pk.x - 48) + 'px'; pl.style.top = (pk.y - 15) + 'px'; pl.style.rotate = ang + 'deg';
    }
  }
  function sizeCrack() { const sc = Math.min(2, devicePixelRatio || 1); ccv.width = innerWidth * sc; ccv.height = innerHeight * sc; cctx.setTransform(sc, 0, 0, sc, 0, 0); buildCrack(); }
  function drawCrack(p, time = 0) {
    if (!crackPts.length) return;
    cctx.clearRect(0, 0, innerWidth, innerHeight);
    cctx.save(); cctx.beginPath(); cctx.rect(0, 0, innerWidth, innerHeight * 2);
    keepOut.forEach((r) => cctx.rect(r.x, r.y, r.w, r.h)); cctx.clip('evenodd');
    const n = crackPts.length - 1, upto = Math.max(1, Math.ceil(p * n)), pts = crackPts.slice(0, upto + 1);
    const top = [], bot = [];
    pts.forEach((q, i) => {
      const a = crackPts[Math.min(n, i + 1)], b0 = crackPts[Math.max(0, i - 1)];
      const dx = a.x - b0.x, dy = a.y - b0.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      const w = q.w * (i === upto ? .2 : 1);
      top.push({ x: q.x + nx * w * .5, y: q.y + ny * w * .5 }); bot.push({ x: q.x - nx * w * .5, y: q.y - ny * w * .5 });
    });
    cctx.save(); cctx.beginPath();
    top.forEach((q, i) => i ? cctx.lineTo(q.x, q.y) : cctx.moveTo(q.x, q.y));
    for (let i = bot.length - 1; i >= 0; i--) cctx.lineTo(bot[i].x, bot[i].y);
    cctx.closePath();
    const g = cctx.createLinearGradient(crackPts[0].x, crackPts[0].y, crackPts[n].x, crackPts[n].y);
    g.addColorStop(0, C.void2); g.addColorStop(.5, C.void); g.addColorStop(1, C.void2);
    cctx.fillStyle = g; cctx.fill(); cctx.clip();
    crackStars.forEach((s) => {
      const i = Math.min(n - 1, Math.floor(s.t * n)), q = crackPts[i], q2 = crackPts[i + 1], f = s.t * n - i;
      const x = q.x + (q2.x - q.x) * f + s.o * 4, y = q.y + (q2.y - q.y) * f + s.o * 3;
      cctx.globalAlpha = .5 + .5 * Math.sin(time * 2 + s.ph); cctx.fillStyle = s.ph > 4 ? '#FFC3D6' : '#fff';
      cctx.beginPath(); cctx.arc(x, y, s.r, 0, 6.28); cctx.fill();
    });
    cctx.restore(); cctx.globalAlpha = 1;
    const edge = (arr, color, w, off) => { cctx.beginPath(); arr.forEach((q, i) => i ? cctx.lineTo(q.x + off, q.y) : cctx.moveTo(q.x + off, q.y)); cctx.strokeStyle = color; cctx.lineWidth = w; cctx.stroke(); };
    cctx.lineJoin = 'round'; cctx.lineCap = 'round';
    edge(top, 'rgba(255,255,255,.95)', 1.2, 0); edge(bot, 'rgba(255,255,255,.8)', 1, 0);
    cctx.globalAlpha = .45; edge(top, C.thread, 1, 1.2); edge(bot, '#8FB6E8', 1, -1.2); cctx.globalAlpha = 1;
    crackBranches.forEach((br) => {
      if (br.at > p) return;
      cctx.beginPath(); br.seg.forEach((q, i) => i ? cctx.lineTo(q.x, q.y) : cctx.moveTo(q.x, q.y));
      cctx.strokeStyle = 'rgba(255,255,255,.85)'; cctx.lineWidth = .9; cctx.stroke();
    });
    cctx.restore();
  }

  /* 指尖特效画布 */
  const fx = $('#t2-fx'), fctx = fx.getContext('2d');
  function sizeFx() { const sc = Math.min(2, devicePixelRatio || 1); fx.width = innerWidth * sc; fx.height = innerHeight * sc; fctx.setTransform(sc, 0, 0, sc, 0, 0); }
  const trail = [], taps = [];
  function addTrail(x, y) { if (reduced) return; trail.push({ x, y, t: performance.now() }); if (trail.length > 50) trail.shift(); }
  function addTap(x, y) {
    if (reduced) return;
    const lines = Array.from({ length: 6 }, (_, k) => {
      const a = k / 6 * 6.283 + Math.random() * .6, L = 14 + Math.random() * 18, pts = [{ x: 0, y: 0 }];
      for (let s = 1; s <= 3; s++) pts.push({ x: Math.cos(a + (Math.random() - .5) * .6) * L * s / 3, y: Math.sin(a + (Math.random() - .5) * .6) * L * s / 3 });
      return pts;
    });
    taps.push({ x, y, t0: performance.now(), lines, sp: Array.from({ length: 5 }, () => ({ a: Math.random() * 6.28, v: 18 + Math.random() * 26 })) });
    if (taps.length > 6) taps.shift();
  }
  function drawFx(now) {
    fctx.clearRect(0, 0, innerWidth, innerHeight);
    if (!trail.length && !taps.length) return;
    while (trail.length && now - trail[0].t > 480) trail.shift();
    if (trail.length > 1) {
      fctx.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1], b = trail[i], life = 1 - (now - b.t) / 480;
        fctx.beginPath(); fctx.moveTo(a.x, a.y); fctx.lineTo(b.x, b.y);
        fctx.strokeStyle = C.thread; fctx.globalAlpha = Math.max(0, life) * .8; fctx.lineWidth = .4 + 2.2 * life; fctx.stroke();
      }
    }
    for (let k = taps.length - 1; k >= 0; k--) {
      const r = taps[k], p = (now - r.t0) / 900;
      if (p >= 1) { taps.splice(k, 1); continue; }
      const e = 1 - Math.pow(1 - p, 3);
      [[C.thread, 0], ['#8FB6E8', 10]].forEach(([c, lag]) => {
        const rad = 4 + e * 46 - lag; if (rad <= 0) return;
        fctx.globalAlpha = (1 - p) * .6; fctx.strokeStyle = c; fctx.lineWidth = 1.2; fctx.beginPath(); fctx.arc(r.x, r.y, rad, 0, 6.283); fctx.stroke();
      });
      const grow = Math.min(1, p * 4), fade = p < .4 ? 1 : 1 - (p - .4) / .6;
      fctx.globalAlpha = fade * .9; fctx.strokeStyle = '#fff'; fctx.lineWidth = 1;
      r.lines.forEach((pts) => { fctx.beginPath(); pts.forEach((q, i) => { const x = r.x + q.x * grow, y = r.y + q.y * grow; i ? fctx.lineTo(x, y) : fctx.moveTo(x, y); }); fctx.stroke(); });
    }
    fctx.globalAlpha = 1;
  }

  /* 视差驱动 */
  const target = { x: 0, y: 0 }, par = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') { target.x = e.clientX / innerWidth * 2 - 1; target.y = e.clientY / innerHeight * 2 - 1; }
    addTrail(e.clientX, e.clientY);
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    const t = e.touches[0]; if (!t) return;
    addTrail(t.clientX, t.clientY);
    target.x = t.clientX / innerWidth * 2 - 1; target.y = t.clientY / innerHeight * 2 - 1;
  }, { passive: true });
  window.addEventListener('pointerdown', (e) => addTap(e.clientX, e.clientY), { passive: true });

  /* 主动效循环 */
  let introP = 0, introStart = 0;
  function loop(now) {
    const t = now / 1000;
    if (!reduced) {
      par.x += (target.x - par.x) * .07; par.y += (target.y - par.y) * .07;
      root.style.setProperty('--t2-px', par.x.toFixed(3)); root.style.setProperty('--t2-py', par.y.toFixed(3));
      if (introStart && introP < 1) { introP = Math.min(1, (now - introStart) / 900); }
      drawCrack(introP, t);
      drawFx(now);
    }
    requestAnimationFrame(loop);
  }

  function tick() {
    const dt = new Date();
    $('#t2-clock').textContent = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  }
  function signal() {
    if (reduced) return;
    const lvl = Math.random() < .2 ? 1 + rnd(2) : 3 + rnd(2);
    $$('#t2-sig i').forEach((b, i) => b.classList.toggle('off', i >= lvl));
  }

  /* 便签墙渲染 */
  function renderNotes() {
    const cats = d.services.categories || [];
    const divinationCat = cats.find((c) => c.id === 'divination') || {};
    const codeCat = cats.find((c) => c.id === 'vibecoding') || {};
    const divItems = divinationCat.items || [];
    const codeItems = codeCat.items || [];

    const cards = [
      { k: 'tarot', r: -2.2, t: '占卜', en: 'Divination', d: '擦开雾气，看今天的指引。', v: `<span class="fogv"><i></i><i></i><i></i><em></em></span>` },
      { k: 'price', r: 1.6, t: '价目', en: 'Price list', d: '以人民币计。', v: `<span class="recv">${divItems.slice(0, 3).map((p) => `<span>${p.name}<b>${p.price} 元</b></span>`).join('')}<small>还有多项业务，点开查看</small></span>` },
      { k: 'code', r: 1.2, t: '网站定制', en: 'Vibecoding', d: '按难度和功能定工期与价格。', v: `<span class="codev"><span class="k">const</span> you = <span class="f">here</span>();\n<span class="k">const</span> me = <span class="f">there</span>();\nthread.<span class="f">tie</span>(you, me);</span><span class="ptag"><b>${codeItems[0] ? codeItems[0].price : 100}</b><em>元起</em></span>` },
      { k: 'radio', r: -1.4, t: '调频', en: 'Frequency', d: '转动刻度，找到 Shadow 的频道。', v: `<span class="radv"><b>520.1</b><span>次元频段</span></span><svg viewBox="0 0 160 28" preserveAspectRatio="none" aria-hidden="true"><path d="M0 14 Q 10 2 20 14 T 40 14 T 60 14 T 80 14 T 100 14 T 120 14 T 140 14 T 160 14" fill="none" stroke="var(--t2-thread)" stroke-width="1.6"/></svg>` },
      { k: 'ai', r: -1.8, t: '漫剧生图', en: 'AI Studio', d: 'AI 生成的作品都会如实标注。', v: `<span class="aiv"><canvas width="48" height="36"></canvas><span>AI 生成</span></span>` },
      { k: 'notice', r: 2, t: '营业须知', en: 'Agreement', d: '下单之前读完这份协议，再按下指印。', v: `<span class="notv">${printSVG('')}<span id="t2-noticeState">${store.get('signed', false) ? '已按印，可以随时回来再看' : '还没按印'}</span></span>` }
    ];

    $('#t2-wall').innerHTML = cards.map((c, i) => `<button class="note n-${c.k}" type="button" data-app="${c.k}" style="--r:${c.r}deg;--tr:${i % 2 ? 7 : -6}deg">
        <span class="tape" data-plaster></span>
        <span class="nt"><small>${c.en}</small>${c.t}</span>
        <span class="nv">${c.v}</span>
        <span class="nd">${c.d}</span></button>`).join('');

    $('#t2-stubs').innerHTML = [['返图', 'photo', -1.5, 'feedback.html'], ['作品', 'star', 1.2, 'works/index.html'], ['AI 漫剧', 'game', -.8, 'drama/index.html']]
      .map(([n, ic, r, href]) => `<button class="stub" type="button" data-href="${href}" style="--r:${r}deg"><svg class="i" viewBox="0 0 24 24"><path d="M12 3.8 14.4 8.8 19.9 9.5 15.9 13.3 16.9 18.7 12 16 7.1 18.7 8.1 13.3 4.1 9.5 9.6 8.8Z"/></svg>${n}<small>前往页面</small></button>`).join('');

    const cv = $('.aiv canvas'), off = document.createElement('canvas'); off.width = 240; off.height = 180; aiScene(off.getContext('2d'));
    const c2 = cv.getContext('2d'); c2.imageSmoothingEnabled = true; c2.drawImage(off, 0, 0, 48, 36);
  }

  function start() {
    renderNotes();
    if (window.SLAiMosaic) window.SLAiMosaic(stage);
    $('#t2-boothBtn').innerHTML = boothSVG();
    $('#t2-miniBars').innerHTML = Array.from({ length: 9 }, (_, k) => `<i style="height:${(4 + Math.abs(Math.sin(k * .9)) * 9).toFixed(0)}px"></i>`).join('');
    $('#t2-crackPlaster').innerHTML = plasterSVG();
    hydrate();
    readColors();
    sizeCrack();
    sizeFx();
    tick();
    syncWidget();
    setInterval(tick, 15000);
    setInterval(signal, 2200);

    if (reduced) { introP = 1; drawCrack(1); $('#t2-crackPlaster').classList.add('on'); }
    else {
      setTimeout(() => { introStart = performance.now(); }, 350);
      setTimeout(() => $('#t2-crackPlaster').classList.add('on'), 1250);
    }
    requestAnimationFrame(loop);

    let rT;
    window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { sizeCrack(); sizeFx(); drawCrack(introP || 1); }, 150); });
  }

  /* 舞台事件监听 */
  stage.addEventListener('click', (e) => {
    const app = e.target.closest('[data-app]');
    if (app) {
      if (app.id === 't2-banner') app.classList.remove('in');
      const from = app.id === 't2-banner' ? $('#t2-wMsg') : app;
      if (app.classList.contains('note') && !reduced) {
        app.classList.add('peel');
        setTimeout(() => { openWin(app.dataset.app, from); app.classList.remove('peel'); }, 200);
      } else {
        openWin(app.dataset.app, from);
      }
      return;
    }
    const stub = e.target.closest('[data-href]');
    if (stub) {
      location.href = stub.dataset.href;
      return;
    }
    const op = e.target.closest('[data-open]');
    if (op) {
      const from = $(`.note[data-app="${op.dataset.open}"]`);
      openWin(op.dataset.open, from, { tab: op.dataset.tab != null ? +op.dataset.tab : null });
      return;
    }
    const cq = e.target.closest('[data-callq]');
    if (cq) { callFromApp(cq.dataset.callq); return; }
    if (e.target.closest('#t2-gearBtn')) { openWin('settings', $('#t2-gearBtn')); return; }
    if (e.target.closest('#t2-wMsg')) { openWin('voice', $('#t2-wMsg')); return; }
    if (e.target.closest('#t2-dialBtn') || e.target.closest('#t2-boothBtn')) { dial(); return; }
    if (e.target.closest('#t2-hangBtn')) { hang(); return; }
  });

  $('#t2-winX').addEventListener('click', () => closeWin());
  $('#t2-win').addEventListener('cancel', (e) => { e.preventDefault(); closeWin(); });
  $('#t2-win').addEventListener('click', (e) => { if (e.target === $('#t2-win')) closeWin(); });

  start();
}
