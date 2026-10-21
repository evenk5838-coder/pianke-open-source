/* 片刻 desktop host adapter. Inject only into the bundled main frame at documentEnd. */
(() => {
  'use strict';
  if (window.__piankeNativeInstalled) return;
  const channel = window.webkit?.messageHandlers?.pianke;
  if (!channel || typeof start !== 'function' || typeof setFloating !== 'function') return;
  window.__piankeNativeInstalled = true;

  const host = {mode:'home', shortcut:null, reducedMotion:false};
  const original = {start, finish, collapse, wake, dialog};
  const modes = new Set(['home','immersive','floating','practice']);
  const post = (action, details = {}) => {
    try { channel.postMessage({action, ...details}); }
    catch (error) { console.error('片刻桌面连接：', error); }
  };
  window.addEventListener('error', event => {
    if (event.message) post('log', {level:'error',message:event.message,line:event.lineno || 0});
  });
  window.addEventListener('unhandledrejection', event => {
    post('log', {level:'error',message:String(event.reason?.message || event.reason || 'Unhandled promise rejection')});
  });
  const style = document.createElement('style');
  style.id = 'pianke-native-style';
  style.textContent = `
    html.pianke-native,html.pianke-native body{
      width:100%;height:100%;min-height:100%;background:transparent!important;overflow:hidden;
    }
    .pianke-native .desktop-backdrop,.pianke-native .macbar,
    .pianke-native .preview-boundary,.pianke-native #wake{display:none!important}
    .pianke-native .app{
      width:100%;margin:0;min-height:100dvh;border-radius:28px;animation:none;
      box-shadow:inset 0 1px 1px var(--native-glass-rim,#fff);
    }
    .pianke-native .session.floating{
      inset:0!important;left:0!important;top:0!important;right:0!important;bottom:0!important;
      width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;
      border-radius:24px;box-shadow:none;
    }
    .pianke-native .session.floating .sessiontop{touch-action:none}
    .pianke-native .session.floating .experience{height:calc(100% - 91px)}
    .pianke-native.pianke-reduce-motion *,
    .pianke-native.pianke-reduce-motion *::before,
    .pianke-native.pianke-reduce-motion *::after{
      animation:none!important;transition:none!important;scroll-behavior:auto!important;
    }
  `;
  document.head.appendChild(style);
  document.documentElement.classList.add('pianke-native');
  document.title = '片刻';

  const shortcutRegistered = () => host.shortcut === true || host.shortcut?.registered === true;
  const refreshShortcutHint = () => {
    const hint = document.querySelector('.shortcut-hint');
    if (!hint) return;
    if (shortcutRegistered()) {
      hint.innerHTML = '<kbd>⌘</kbd><kbd>⇧</kbd><kbd>K</kbd><span>随时呼出</span><i>·</i><kbd>esc</kbd><span>收起</span>';
    } else {
      hint.innerHTML = '<span>菜单栏随时呼出</span><i>·</i><kbd>esc</kbd><span>收起</span>';
    }
  };
  const redraw = () => {
    motion?.resize();
    drawMotion();
  };
  const syncAppearance = detail => {
    const theme = detail?.theme || document.documentElement.dataset.theme || 'minimal';
    if (['minimal','mist','dusk'].includes(theme)) post('appearance', {theme});
  };
  window.addEventListener('pianke:appearance', event => syncAppearance(event.detail));
  new MutationObserver(() => syncAppearance()).observe(document.documentElement, {
    attributes:true, attributeFilter:['data-theme']
  });

  updateFullscreenLabel = function () {
    const label = host.mode === 'immersive' ? '退出全屏' : '进入全屏';
    const button = document.querySelector('#fullscreenBtn');
    button?.setAttribute('aria-label', label);
    if (button) button.title = label;
  };

  const applyState = details => {
    if (details && modes.has(details.mode)) host.mode = details.mode;
    if (details && Object.prototype.hasOwnProperty.call(details, 'shortcut')) host.shortcut = details.shortcut;
    if (details && Object.prototype.hasOwnProperty.call(details, 'reducedMotion')) host.reducedMotion = details.reducedMotion === true;
    document.documentElement.dataset.nativeMode = host.mode;
    document.documentElement.classList.toggle('pianke-native-fullscreen', host.mode === 'immersive');
    document.documentElement.classList.toggle('pianke-reduce-motion', host.reducedMotion);
    const box = document.querySelector('#session');
    if (box) {
      box.classList.toggle('floating', !!session && host.mode === 'floating');
      box.removeAttribute('style');
    }
    const view = document.querySelector('#viewBtn');
    if (view) view.textContent = host.mode === 'floating' ? '沉浸展开' : '切为浮窗';
    updateFullscreenLabel();
    refreshShortcutHint();
    requestAnimationFrame(redraw);
  };
  const requestMode = mode => {
    if (!modes.has(mode)) return;
    // The host applies layout while faded, preventing a floating layout flashing at full size.
    post('mode', {value:mode});
  };

  window.piankeHostState = details => applyState(details || {});
  window.piankeHostTransition = details => {
    const state = details || {};
    if (Object.prototype.hasOwnProperty.call(state, 'reducedMotion')) {
      host.reducedMotion = state.reducedMotion === true;
      document.documentElement.classList.toggle('pianke-reduce-motion', host.reducedMotion);
    }
    document.documentElement.dataset.nativeTransition = state.phase || 'settled';
    const eventName = state.phase === 'enter' ? 'pianke:panel-enter'
      : state.phase === 'exit' ? 'pianke:panel-exit' : 'pianke:mode-transition';
    window.dispatchEvent(new CustomEvent(eventName, {detail:{...state}}));
    if (state.phase === 'settled') requestAnimationFrame(redraw);
  };
  window.piankeHostShown = details => {
    applyState(details || {});
    original.wake();
    updateFocusLayers();
    if (session) showControls();
    requestAnimationFrame(redraw);
    return {mode:host.mode, practice:!!session, paused:session?.paused ?? false};
  };
  window.piankeHostPause = () => {
    if (session) {
      // Force a pause intent, including when an earlier resume is still pending.
      togglePause(true);
    } else if (!session) {
      clearTimeout(auditionTimer);
      stopAudio();
    }
    return {practice:!!session, paused:session?.paused ?? false};
  };

  collapse = function () {
    window.piankeHostPause();
    // Keep the glass content present until the native window finishes fading out.
    document.querySelector('#menuToggle')?.setAttribute('aria-expanded', 'false');
    post('hide');
  };
  wake = function () {
    original.wake();
    requestMode(session ? (host.mode === 'home' ? 'immersive' : host.mode) : 'home');
    if (session) showControls();
  };
  setFloating = function (value) {
    if (!session) return;
    requestMode(value ? 'floating' : 'immersive');
    showControls();
  };
  toggleNativeFullscreen = function () {
    if (!session) return;
    requestMode(host.mode === 'immersive' ? 'practice' : 'immersive');
    showControls();
  };
  start = async function (method, config) {
    const pending = original.start(method, config);
    // start creates the session before its first audio await, preserving the user gesture.
    if (session) requestMode('immersive');
    return await pending;
  };
  finish = function (completed) {
    const wasPractising = !!session;
    original.finish(completed);
    if (wasPractising) {
      original.wake();
      requestMode('home');
    }
  };

  // These handlers originally held direct function references; rebind them explicitly.
  document.querySelector('#miniBtn').onclick = () => collapse();
  document.querySelector('#wake').onclick = () => wake();
  const miniButton = document.querySelector('#miniBtn');
  miniButton.setAttribute('aria-label', '收起到 Mac 菜单栏');
  miniButton.title = '收起到 Mac 菜单栏';

  // Keep the same configuration flow while making storage/timer labels accurate for the host.
  dialog = function (content) {
    const adapted = content
      .replaceAll('当前浏览器', '这台 Mac')
      .replaceAll('这个浏览器', '这台 Mac')
      .replaceAll('清除浏览器数据', '清除本机应用数据')
      .replaceAll('浏览器记录', '本机记录')
      .replaceAll('提醒 · 页面内计时', '提醒 · 应用内计时')
      .replaceAll('固定间隔 · 页面打开时', '固定间隔 · 应用运行时')
      .replaceAll('仅当前页面有效', '仅应用运行期间有效')
      .replaceAll('页面计时中', '应用计时中')
      .replaceAll('本页关闭后停止；系统使用时间、锁屏感知和系统通知尚未接入，不会申请权限。',
        '退出应用后停止；累计电脑使用时间、锁屏感知和系统通知尚未接入。');
    return original.dialog(adapted);
  };
  about = function () {
    dialog(`<span class="badge">片刻 · Mac 桌面体验版</span><h2 id="dialogTitle">留一点空白。</h2>
      <p>留一点空白，让注意力慢慢回来。烟圈与水波由这台 Mac 实时绘制，随 4 秒吸气、6 秒呼气展开和散去。</p>
      <h3>桌面体验</h3><p>点击 Mac 菜单栏水波图标${shortcutRegistered() ? '，或按 ⌘ ⇧ K' : ''}随时呼出。选择练习后，在首屏设置并开始。支持玻璃面板、沉浸全屏和可拖动浮窗。控制默认隐藏，点击画面唤出；收起时暂停，再次打开后可以继续。界面过渡遵循系统的减少动态效果设置。</p>
      <h3>练习与记录</h3><p>三个入口、手动时长与局数、真实点击结果、声音与动效同步暂停。记录按你的选择保存在这台 Mac，没有账号或云同步。提醒使用应用内计时；累计电脑使用时间、锁屏感知和系统通知待接入。</p>
      <h3>素材与练习说明</h3><p>自然画面、声音及眼部练习的来源与适用说明见各练习页和随附资料。练习记录只反映本次操作，不代表放松、注意力或视力改善的测量。</p>
      <p><a href="assets/ASSETS.md" target="_blank">摄影素材来源</a> · <a href="README.md" target="_blank">启动与研究说明</a></p>`);
  };
  document.querySelector('#aboutBtn').onclick = () => about();

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    // Existing dialog/notice Escape handlers retain priority.
    if (!document.querySelector('#overlay').hidden || !document.querySelector('#notice').hidden) return;
    if (session && host.mode === 'immersive') {
      event.preventDefault();
      event.stopImmediatePropagation();
      setFloating(true);
    } else if (!session) {
      event.preventDefault();
      event.stopImmediatePropagation();
      collapse();
    }
  }, true);

  // Replace simulated element dragging with real window movement.
  let pointer = null;
  const dragHandle = document.querySelector('#dragHandle');
  dragHandle.onpointerdown = event => {
    if (host.mode !== 'floating' || event.button !== 0 || event.target.closest('button')) return;
    pointer = {id:event.pointerId, x:event.screenX, y:event.screenY};
    dragHandle.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  dragHandle.onpointermove = event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.screenX - pointer.x, dy = event.screenY - pointer.y;
    pointer.x = event.screenX;
    pointer.y = event.screenY;
    if (Number.isFinite(dx) && Number.isFinite(dy) && (dx || dy)) post('drag', {dx,dy});
  };
  const releaseDrag = event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    pointer = null;
    if (dragHandle.hasPointerCapture(event.pointerId)) dragHandle.releasePointerCapture(event.pointerId);
  };
  dragHandle.onpointerup = releaseDrag;
  dragHandle.onpointercancel = releaseDrag;
  dragHandle.onlostpointercapture = () => { pointer = null; };

  applyState(host);
  syncAppearance();
  post('ready', {details:{
    title:document.title,
    bridge:'pianke-desktop-v2',
    methods:METHODS.length,
    cards:document.querySelectorAll('[data-method]').length,
    renderer:motion?.backend || 'unavailable',
    chineseVoices:voices.filter(voice => /^zh[-_]/i.test(voice.lang)).length,
    mode:host.mode,
    currentPractice:!!session
  }});
})();
