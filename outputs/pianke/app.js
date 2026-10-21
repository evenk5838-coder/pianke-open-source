'use strict';

// 片刻 · Local interactive preview. All practice results come from this session.
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#icon-${name}"/></svg>`;
const clockIcon = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>';
const closedEye = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9c4 6 14 6 18 0M6 13l-2 3m7-1v3m6-5 2 3"/></svg>';
const METHODS = [
  {id:'breath',cat:'relax',name:'呼吸引导',desc:'跟着舒适的节奏，让呼吸慢慢放松',times:[3,5,10],detail:'鼻子轻轻吸气，嘴巴缓缓呼气。人声只带前两轮，之后听高音吸气、低音呼气。无需刻意深呼吸，也不屏息；保持自己舒服的节奏。',audio:'ambient',voice:true,closed:true},
  {id:'body',cat:'relax',name:'身体扫描',desc:'从头到脚，留意身体此刻的感受',times:[5,10],detail:'坐得舒服一些，可以闭眼听引导。睁眼时，人形轮廓会在当前部位微微亮起。不需要收紧、按摩或改变什么。',audio:'soft',voice:true,closed:true},
  {id:'nature',cat:'relax',name:'自然声景',desc:'风、水声与树叶声，陪你停一会儿',times:[3,5,10],detail:'选一种声音，让环境陪你停一会儿。可以睁眼，也可以闭眼聆听。',audio:'wind',voice:false,closed:true},
  {id:'imagine',cat:'relax',name:'引导想象',desc:'跟随简短语音，想象安静的湖边',times:[5,10],detail:'闭眼想象一处安静、安全的林间。不需要清晰画面，人声之间会留出长一些的安静时间。',audio:'soft',voice:true,closed:true},
  {id:'focus',cat:'focus',name:'视觉聚焦',desc:'在简短提醒中，练习觉察与返回',times:[3,5],detail:'轻轻观察圆心与周围的明暗。简短人声会间隔提醒你觉察注意力，发现走神就回来，不必一直盯紧。',audio:'none',voice:true},
  {id:'sound',cat:'focus',name:'声音聚焦',desc:'关注柔和音色，听见下一声就回来',times:[3,5],detail:'留意每隔几秒出现的柔和音色，不必数拍，也不需要点击。',audio:'bell',voice:true,closed:true},
  {id:'schulte',cat:'focus',name:'舒尔特表',desc:'从 1 开始，按顺序找到每个数字',times:[5,10],detail:'依次点击数字。点错可以继续，练习中不展示成绩。默认 4×4，难度由你选择，不自动改变。',audio:'none',voice:false,game:true},
  {id:'search',cat:'focus',name:'视觉搜索',desc:'在相似图形中，找到指定的目标',times:[10,20,30],detail:'找出颜色和形状都与目标一致的唯一图形。点错可以继续，不自动改变难度。',audio:'none',voice:false,game:true},
  {id:'eye',cat:'eyes',name:'眼保健操',desc:'跟随完整六节，轻柔找到按摩位置',times:[],detail:'每节先听简短手法，倒数 2 秒后跟随四个八拍，每分钟 60 拍。静音时可看文字跟练。先清洁双手，不压眼球；眼睛红肿或皮肤破损时跳过按摩。',audio:'beat',voice:true,fixed:true},
  {id:'combo',cat:'eyes',name:'组合休息',desc:'眨眼、轻缓眼动，再闭眼休息',times:[3,5],detail:'先自然眨眼，再在舒服的小范围内向上、下、左、右移动目光，最后闭眼休息。不快速绕圈，不用力，随时可以闭眼或结束。',audio:'soft',voice:true,closed:true}

];
const CATEGORIES = {
  relax:['放松一下','选一种方式，停留几分钟','可以闭眼 · 不需要完成任何任务'],
  focus:['找回专注','把注意，交给一件简单的事','无需表现得更好 · 按自己的节奏'],
  eyes:['眼睛休息','暂时放下文字，留一点空白','两种方式 · 随时可以停止']
};
const BREATH = {inhale:4,exhale:6}; // Experience pacing, not a clinical prescription.
const defaults = {save:null,volume:22,opacity:73,hue:212,visual:'smoke',voice:true,theme:'minimal',scene:'water'};
let prefs = {...defaults};
try { const p = JSON.parse(localStorage.getItem('pianke.prefs') || '{}'); prefs = {...defaults,...p}; } catch {}
if (![true,false,null].includes(prefs.save)) prefs.save = null;
prefs.volume = clamp(prefs.volume,0,100,22); prefs.opacity = clamp(prefs.opacity,35,95,73); prefs.hue = clamp(prefs.hue,0,360,212);
if (!['smoke','ripple'].includes(prefs.visual)) prefs.visual = 'smoke';
if (!['minimal','mist','dusk'].includes(prefs.theme)) prefs.theme = 'minimal';
if (!PiankeContent.scenes.some(x=>x.id===prefs.scene)) prefs.scene='water';
let history = [];
if (prefs.save === true) { try { const h = JSON.parse(localStorage.getItem('pianke.records') || '[]'); if(Array.isArray(h)) history = h.slice(0,100); } catch {} }
else { try { localStorage.removeItem('pianke.records'); } catch {} }
let category = 'relax', chosen = null, duration = 3, difficulty = 4;
let session = null, reminder = null, lastFrame = performance.now(), controlsTimer = 0, controlsAdjusting = false, keyboardMode = false;
let audioCtx = null, master = null, nodes = [], reverb = null, padGain = null, audioEpoch = 0, audioEnabled = false, audioVolume = 22, auditionTimer = 0;
let ambience = null, speechDuckingTimer = 0, lastSpeechText = '';
let voices = [], voiceAvailable = false, speechFailed = false, audioFailed = false;
const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
let motion = null;
try { motion = new window.PiankeMotion($('#motionCanvas')); } catch {}
let frames = [], frameCount = 0;
function clamp(n,min,max,fallback) { return Number.isFinite(+n) ? Math.max(min,Math.min(max,+n)) : fallback; }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function savePrefs() { try { localStorage.setItem('pianke.prefs',JSON.stringify(prefs)); } catch { toast('浏览器没有允许保存偏好，本次仍可体验。'); } }
function applyAppearance() {
  const root=document.documentElement;
  root.dataset.theme=prefs.theme;
  root.style.setProperty('--panel-opacity',prefs.opacity/100);
  root.style.setProperty('--effect-hue',prefs.hue);
  window.dispatchEvent(new CustomEvent('pianke:appearance',{detail:{theme:prefs.theme}}));
  drawMotion();
}
function loadVoices() { voices = window.speechSynthesis?.getVoices() || []; voiceAvailable = voices.some(v=>/^zh[-_]/i.test(v.lang)); if(session) updateAudioStatus(); }
loadVoices(); window.speechSynthesis?.addEventListener('voiceschanged',loadVoices);
function toast(message) { clearTimeout(toast.timer); const n=$('#notice'); n.className='notice'; n.textContent=message; n.hidden=false; toast.timer=setTimeout(()=>n.hidden=true,3500); }
function renderCards() {
  const c=CATEGORIES[category]; $('#heading').textContent=c[0]; $('#subheading').textContent=c[1]; $('#categoryTitle').textContent=c[0]; $('#categoryHint').textContent=c[2];
  $$('[data-category]').forEach(b=>{const active=b.dataset.category===category;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
  $('#cards').innerHTML=METHODS.filter(m=>m.cat===category).map(m=>`<button class="card" data-method="${m.id}" aria-label="${m.name}，${m.desc}"><div class="art ${m.id}" aria-hidden="true">${m.id==='body'?PiankeBodyGuide.markup({preview:true}):''}</div><div class="cardcontent"><div class="cardtitle">${m.name}<i aria-hidden="true">↗</i></div><p>${m.desc}</p><div class="cardmeta"><span class="duration">${clockIcon}${m.fixed?'完整六节 · 跟随节拍':m.times.join(' · ')+(m.game?' 局':' 分钟')}</span>${m.closed?`<span class="eyebadge">${closedEye}可闭眼</span>`:`<span class="badge">${m.fixed?'动画跟练':m.game?'点击练习':m.id==='focus'?'轻引导':'无需点击'}</span>`}</div></div></button>`).join('');
  $$('[data-method]').forEach(b=>b.onclick=()=>configure(b.dataset.method));
}
let dialogReturn = null;
function updateFocusLayers() { const blocked=!!session||!$('#overlay').hidden; $$('.app,.macbar,#wake').forEach(el=>el.inert=blocked); }
function dialog(content) { if($('#overlay').hidden) dialogReturn=document.activeElement; $('#dialog').innerHTML=`<button class="close" aria-label="关闭">×</button>${content}`; $('#overlay').hidden=false; updateFocusLayers(); $('#dialog .close').onclick=closeDialog; $('#dialog').focus(); }
function closeDialog() { $('#overlay').hidden=true; updateFocusLayers(); if(!session) { clearTimeout(auditionTimer); stopAudio(); } if(dialogReturn?.isConnected&&!dialogReturn.closest('[inert]')) dialogReturn.focus({preventScroll:true}); }
function configure(id) { chosen=METHODS.find(m=>m.id===id); duration=chosen.times[0]; difficulty=4; drawConfig(); }
function drawConfig() {
  const m=chosen;
  const durationChoices=m.fixed?'<div class="session-summary"><strong>完整六节</strong><span>讲解后倒数 2 秒 · 每节四个八拍</span></div>':`<h3>${m.game?'练习局数':'停留多久'}</h3><div class="choices">${m.times.map(t=>`<button data-duration="${t}" class="${duration===t?'selected':''}" aria-pressed="${duration===t}">${t}${m.game?' 局':' 分钟'}</button>`).join('')}</div>`;
  const gameChoices=m.game?`<h3>${m.id==='schulte'?'手动选择难度':'搜索密度'}</h3><div class="choices">${[3,4,5].map(n=>`<button data-difficulty="${n}" class="${difficulty===n?'selected':''}" aria-pressed="${difficulty===n}">${m.id==='schulte'?`${n} × ${n}`:['5 × 5','7 × 7','9 × 9'][n-3]}</button>`).join('')}</div>`:'';
  const breathing=m.id==='breath'?`<div class="breath-timing"><span><b>4</b> 秒吸气</span><i></i><span><b>6</b> 秒呼气</span></div><h3>呼吸视觉</h3><div class="choices">${[['smoke','轻薄烟圈'],['ripple','宽柔水波']].map(([v,label])=>`<button data-visual="${v}" class="${prefs.visual===v?'selected':''}" aria-pressed="${prefs.visual===v}">${label}</button>`).join('')}</div>`:'';
  const nature=m.id==='nature'?`<h3>选择声音</h3><div class="sound-scenes">${PiankeContent.scenes.map(x=>`<button data-scene="${x.id}" class="${prefs.scene===x.id?'selected':''}" aria-pressed="${prefs.scene===x.id}"><span>${x.name}</span><small>${x.hint}</small></button>`).join('')}</div><p class="small">当前为合成环境声；新的自然视频等你挑选后更新。</p>`:'';
  dialog(`<div class="config-shell"><div class="config-main"><span class="badge">${m.fixed?'完整动画跟练':m.game?'按自己的节奏':'留一点空白'}</span><h2 id="dialogTitle">${m.name}</h2><p class="config-description">${m.detail}</p>${durationChoices}${gameChoices}${breathing}${nature}<details class="config-detail"><summary>声音与更多设置</summary><div class="field"><label for="startSound">练习声音</label><select id="startSound"><option value="on" ${m.audio!=='none'||m.voice?'selected':''}>开启</option><option value="off" ${m.audio==='none'&&!m.voice?'selected':''}>静音</option></select></div><div class="field"><label for="startVolume">音量</label><input id="startVolume" type="range" min="0" max="100" value="${prefs.volume}"></div>${m.voice?`<label class="voice-option"><input type="checkbox" id="startVoice" ${prefs.voice?'checked':''}> ${m.id==='focus'?'间隔语音提醒':'人声引导'}</label><p class="small">已选 V01 轻柔陪伴女声，专用引导词待制作；当前为原有人声，可关闭。</p>`:''}<p class="small">随时点击画面可唤出暂停、音量与结束。可以保持自己的舒服节奏。</p>${m.id==='eye'?'<a href="assets/eye-guide-sources.md" target="_blank">查看动作来源与说明 ↗</a>':''}</details></div><div class="config-footer"><span class="small">${m.game?'无需赶时间':m.id==='breath'?'不用刻意深呼吸':'给自己留一点空白'}</span><button id="startBtn" class="primary">开始${m.id==='eye'?'跟练':'这段片刻'} <span aria-hidden="true">↗</span></button></div></div>`);
  $$('[data-duration]').forEach(b=>b.onclick=()=>{duration=+b.dataset.duration;$$('[data-duration]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',x===b);});});
  $$('[data-difficulty]').forEach(b=>b.onclick=()=>{difficulty=+b.dataset.difficulty;$$('[data-difficulty]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',x===b);});});
  $$('[data-visual]').forEach(b=>b.onclick=()=>{prefs.visual=b.dataset.visual;$$('[data-visual]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',x===b);});savePrefs();});
  $$('[data-scene]').forEach(b=>b.onclick=()=>{prefs.scene=b.dataset.scene;$$('[data-scene]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',x===b);});savePrefs();});
  $('#startBtn').onclick=()=>{
    const config={sound:$('#startSound').value==='on',volume:+$('#startVolume').value,opening:false,voice:!!$('#startVoice')?.checked,scene:prefs.scene};
    clearTimeout(auditionTimer);stopAudio();
    if(prefs.save===null)askStorage(()=>start(m,config));else start(m,config);
  };
}
function askStorage(next) { dialog(`<h2 id="dialogTitle">这段片刻，要留下吗？</h2><p>可以只查看本次，也可以把练习记录保存在当前浏览器。无需账号，以后可以修改。</p><p class="small">未选择保存时，不持久化练习明细。设置偏好会保留；清除浏览器数据会移除本地记录。</p><button id="keep" class="primary wide">保存在这个浏览器</button><button id="discard" class="wide">只看本次，不保留记录</button>`);$('#keep').onclick=()=>{prefs.save=true;savePrefs();next();};$('#discard').onclick=()=>{prefs.save=false;savePrefs();next();}; }

// Local original accompaniment; no remote audio is requested at practice start.
async function initAudio(on,volume,epoch=audioEpoch) {
  audioEnabled=on;audioVolume=volume;
  if(!on)return false;
  try {
    if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    await audioCtx.resume();if(epoch!==audioEpoch)return false;
    master=audioCtx.createGain();master.gain.setValueAtTime(0,audioCtx.currentTime);
    master.gain.linearRampToValueAtTime(volume/100*.9,audioCtx.currentTime+.8);
    master.connect(audioCtx.destination);return true;
  } catch {audioFailed=true;if(session)updateAudioStatus();return false;}
}
function adjustGain(value) {
  if(!master||!audioCtx)return;
  const g=master.gain,t=audioCtx.currentTime;
  if(g.cancelAndHoldAtTime)g.cancelAndHoldAtTime(t);else g.cancelScheduledValues(t);
  g.setTargetAtTime(value,t,.12);
}
function startBed(type) {
  if(!audioEnabled||!audioCtx||!master)return;
  ambience?.stop();ambience=null;
  if(window.PiankeAmbience&&['wind','soft','ambient'].includes(type)){
    ambience=PiankeAmbience.start(audioCtx,master,{kind:type,scene:type==='wind'?(session?.scene||prefs.scene):undefined});
  }
}
function pulse(frequency=330,length=2) {
  if(!audioCtx||!master||audioCtx.state!=='running')return;
  const output=master,rev=reverb;[1,2].forEach((harmonic,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;o.frequency.value=frequency*harmonic;o.type='sine';g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.13/(i+1),t+.17);g.gain.exponentialRampToValueAtTime(.0001,t+length);o.connect(g).connect(output);if(rev)g.connect(rev);o.start();o.stop(t+length+.05);nodes.push(o,g);o.onended=()=>{o.disconnect();g.disconnect();nodes=nodes.filter(n=>n!==o&&n!==g);};});
}
function speak(text,force=false,lifecycle=null) {
  if(!audioEnabled||!voiceAvailable||!window.speechSynthesis)return null;
  if(session&&(!session.sound||!session.voice||session.paused)&&!force)return null;
  const speechId=++speak.sequence;
  try{window.speechSynthesis.cancel();}catch{speechFailed=true;lifecycle?.onfinish?.('error','unavailable');return null;}
  clearTimeout(speechDuckingTimer);
  let settled=false,u;
  const release=()=>{if(speechId===speak.sequence)ambience?.setDucking(false);};
  const complete=(reason,error)=>{
    if(settled||speechId!==speak.sequence)return;settled=true;clearTimeout(speechDuckingTimer);release();
    if(reason==='error'&&!['canceled','interrupted'].includes(error)){speechFailed=true;if(session)updateAudioStatus();}
    lifecycle?.onfinish?.(reason,error);
  };
  const handle={cancel(){
    if(settled||speechId!==speak.sequence)return;
    settled=true;clearTimeout(speechDuckingTimer);release();speak.sequence++;
    // Invalidate first. Several native engines never emit an event for cancel().
    try{window.speechSynthesis.cancel();}catch{}
  }};
  try {
    u=new SpeechSynthesisUtterance(text);lastSpeechText=text;
    u.lang='zh-CN';u.voice=voices.find(v=>/^zh[-_](CN|cn)/.test(v.lang)&&/Ting|ting|婷婷/.test(v.name))||voices.find(v=>/^zh[-_](CN|cn)/.test(v.lang))||voices.find(v=>/^zh[-_]/.test(v.lang));
    u.rate=session?.method.id==='body'?1:.98;u.volume=(session?.volume??audioVolume)/100;
    u.onstart=()=>{if(settled||speechId!==speak.sequence)return;ambience?.setDucking(true);lifecycle?.onstart?.();};
    u.onend=()=>complete('end');u.onerror=e=>complete('error',e.error);
    speechDuckingTimer=setTimeout(release,Math.max(5000,text.length*550));
    window.speechSynthesis.speak(u);
  }catch{complete('error','unavailable');}
  return handle;
}
speak.sequence=0;
function eyeVoiceEnabled(s) {return !!(s.sound&&s.voice&&s.volume>0&&audioEnabled&&voiceAvailable&&typeof window.speechSynthesis?.speak==='function'&&typeof window.speechSynthesis?.cancel==='function'&&typeof SpeechSynthesisUtterance==='function');}
function flushEyeEffects(s) {
  if(!s.eyePacer)return;
  // Synchronous speech failure can enqueue a cancellation/fallback immediately.
  for(let pass=0;pass<8;pass++) {
    const effects=s.eyePacer.drainEffects();if(!effects.length)break;
    for(const effect of effects) {
      if(effect.type==='cancel') {
        if(s.eyeSpeech?.token===effect.token){s.eyeSpeech.handle?.cancel();s.eyeSpeech=null;}
        if(effect.reason.includes('timeout')){speechFailed=true;if(session===s)updateAudioStatus();}
      } else if(effect.type==='speak'&&session===s&&s.ready&&!s.paused&&s.eyePacer.isCurrentSpeech(effect.token)) {
        const token=effect.token;
        const onfinish=(reason)=>{
          if(session!==s||s.paused||!s.eyePacer.isCurrentSpeech(token))return;
          advance();s.eyePacer.speechFinished(token,reason,s.elapsed);
          s.eyeSpeech=null;cue(s.elapsed);updateTimeLabel();
        };
        const handle=speak(effect.text,false,{
          onstart(){if(session!==s||s.paused||!s.eyePacer.isCurrentSpeech(token))return;advance();s.eyePacer.speechStarted(token,s.elapsed);},
          onfinish
        });
        // A throwing/unavailable engine may have settled synchronously above.
        if(s.eyePacer.isCurrentSpeech(token)) {
          if(handle)s.eyeSpeech={token,handle};
          else onfinish('error');
        }
      }
    }
  }
}
function interruptEyeNarration(s,reason) {
  if(s?.method.id!=='eye'||!s.eyePacer)return;
  advance();s.eyePacer.interrupt(reason,s.elapsed);flushEyeEffects(s);
  PiankeEyeGuide.update({state:s.eyePacer.snapshot(),paused:s.paused,reducedMotion:reduceQuery.matches});
}
function stopAudio({preserveEye=false}={}) {
  if(session?.eyePacer){
    if(preserveEye)session.eyePacer.setPaused(true,session.elapsed);else session.eyePacer.dispose();
    flushEyeEffects(session);
  }
  audioEpoch++;speak.sequence++;clearTimeout(speechDuckingTimer);window.speechSynthesis?.cancel();
  ambience?.stop();ambience=null;
  nodes.forEach(n=>{try{n.stop?.();n.disconnect();}catch{}});nodes=[];padGain=null;reverb=null;
  if(master&&audioCtx){const old=master;master=null;old.gain.cancelScheduledValues(audioCtx.currentTime);old.gain.setTargetAtTime(0,audioCtx.currentTime,.04);setTimeout(()=>old.disconnect(),240);}
  audioEnabled=false;
}

function waitForPresentation(current) {
  if(!window.__piankeNativeInstalled)return Promise.resolve();
  const root=document.documentElement;
  if(root.dataset.nativeMode!=='home'&&root.dataset.nativeTransition==='settled')return Promise.resolve();
  return new Promise(resolve=>{
    let finished=false;
    const done=()=>{if(finished)return;finished=true;clearTimeout(timer);window.removeEventListener('pianke:mode-transition',check);resolve();};
    const check=event=>{if(session!==current||event.detail?.phase==='settled'&&event.detail?.mode!=='home')done();};
    const timer=setTimeout(done,1200);
    window.addEventListener('pianke:mode-transition',check);
  });
}
async function start(m,config) {
  closeDialog();stopAudio();audioFailed=false;speechFailed=false;
  prefs.volume=config.volume;if(m.voice)prefs.voice=config.voice;savePrefs();
  session={method:m,total:m.fixed?PiankeEyeGuide.totalDuration:duration*60,rounds:duration,difficulty,elapsed:0,paused:false,ready:false,sound:config.sound,volume:config.volume,voice:config.voice,scene:config.scene||prefs.scene,opening:0,openingDone:true,lastCue:-1,lastBeat:-1,results:[],round:1,next:1,mistakes:0,roundStart:0,waiting:false,started:new Date().toISOString(),timing:{clickedAt:performance.now()}};
  if(m.id==='eye')session.eyePacer=PiankeEyeGuide.createPacer();
  updateFocusLayers();const s=session,box=$('#session');
  box.hidden=false;box.className='session'+(m.id==='breath'?' breath':'')+(m.game?' game-session':'')+(['nature','imagine'].includes(m.id)?' natural':'')+(m.id==='imagine'?' forest-scene':'')+` ${m.id}-session`+(reduceQuery.matches?' reduced-motion':'');box.removeAttribute('style');
  box.tabIndex=-1;box.focus({preventScroll:true});
  $('#sessionLabel').textContent=m.name;$('#viewBtn').textContent='切为浮窗';$('#pauseBtn').textContent='暂停';$('#pauseBtn').setAttribute('aria-label','暂停');$('#volume').value=config.volume;$('#muteBtn').setAttribute('aria-label',config.sound?'静音':'开启声音');$('#muteBtn').classList.toggle('muted',!config.sound);
  $('#motionCanvas').hidden=m.id!=='breath';motion?.resize();
  lastFrame=performance.now();frameCount=0;frames=[];
  if(m.game)setupRound();else renderExperience();
  updateTimeLabel();updateAudioStatus();hideControls();
  requestAnimationFrame(()=>{if(session===s)s.timing.firstFrameMs=performance.now()-s.timing.clickedAt;});
  const epoch=audioEpoch;
  await initAudio(config.sound,config.volume,epoch);
  if(session!==s||epoch!==audioEpoch)return;
  s.timing.audioReadyMs=performance.now()-s.timing.clickedAt;
  await waitForPresentation(s);if(session!==s||epoch!==audioEpoch)return;
  s.timing.presentationReadyMs=performance.now()-s.timing.clickedAt;
  startBed(m.audio);s.ready=true;
  lastFrame=performance.now();if(s.paused)await audioCtx?.suspend();else cue(0);
  drawMotion();updateAudioStatus();
}
function renderExperience() {
  if(!session)return;const s=session,m=s.method;let html='';
  PiankeEyeGuide.destroy();
  if(m.id==='breath') html='<div class="breath-copy"><p class="phase-eyebrow" id="phaseLabel">鼻吸 · 4 秒</p><h2 id="breathTitle">鼻子轻轻吸气</h2><p>不用刻意深呼吸</p><p class="closed-eyes" id="phaseHint">前两轮跟随人声，之后跟随提示音</p></div>';
  else if(m.id==='body') html=PiankeBodyGuide.markup()+'<p class="phase-eyebrow" id="bodyRegion">身体扫描 · 可闭眼聆听</p><h2 id="phase">从鼻尖，感受这一刻</h2><p class="subtle" id="guidance">可以闭眼，让身体自然地放着</p>';
  else if(m.id==='nature') html=`<div class="nature-haze" aria-hidden="true"></div><p class="phase-eyebrow">${PiankeContent.scenes.find(x=>x.id===s.scene)?.name||'水波'} · 合成环境声</p><h2>让环境陪你停一会儿</h2><p>可以闭眼聆听，不需要寻找任何声音</p><span class="scene-credit">Misty Lake · Dan Field / CC BY 3.0 · 静态摄影与动态光雾</span>`;
  else if(m.id==='imagine') html='<h2>想象一处安静的林间</h2><p id="guidance">可以闭眼，给思绪留一点空白</p><span class="scene-credit">Forest Away Path · Seaq68 / CC0</span>';
  else if(m.id==='focus') html='<div class="focus-anchor" aria-hidden="true"></div><h2 class="focus-title" id="phase">让目光轻轻停留</h2><p id="guidance">正常眨眼，不必一直盯紧</p><span class="focus-guide-caption">觉察 · 返回</span>';
  else if(m.id==='sound') html=`<div class="minimal-ring" aria-hidden="true">${icon('speaker')}</div><h2>听见声音，走神后再回来</h2><p>可闭眼，无需点击</p>`;
  else if(m.id==='combo') html='<div class="rest-eye-visual" aria-hidden="true"><svg viewBox="0 0 240 130"><path d="M25 65Q60 12 100 65Q60 110 25 65M140 65Q180 12 215 65Q180 110 140 65"/><circle class="rest-pupil" data-x="63" cx="63" cy="65" r="11"/><circle class="rest-pupil" data-x="178" cx="178" cy="65" r="11"/></svg></div><h2 id="phase">自然地，完整眨几次眼</h2><p id="guidance">不用用力，保持自己的舒服节奏</p>';
  else if(m.id==='eye'){PiankeEyeGuide.mount($('#experience'),{state:s.eyePacer.snapshot(),paused:s.paused,reducedMotion:reduceQuery.matches});return;}
  $('#experience').innerHTML=html;
}
function cue(t) {
  const s=session;if(!s||!s.ready)return;const m=s.method,e=Math.max(0,t);
  if(m.id==='breath') {
    const period=BREATH.inhale+BREATH.exhale,within=e%period,inhaling=within<BREATH.inhale;
    const key=Math.floor(e/period)*2+(inhaling?0:1),phase=inhaling?'鼻子轻轻吸气':'嘴巴缓缓呼气';
    if(key!==s.lastCue){
      s.lastCue=key;
      $('#breathTitle').textContent=phase;$('#phaseLabel').textContent=(inhaling?'鼻吸 · 4 秒':'口呼 · 6 秒');
      $('#phaseHint').textContent=key<3?'前两轮跟随人声，之后跟随提示音':'高音吸气 · 低音呼气 · 可闭眼聆听';
      $('#session').dataset.breathPhase=inhaling?'inhale':'exhale';
      pulse(inhaling?293.665:220,2.8);
      if(key<4)speak(PiankeContent.breathIntro[key]);
    }
  } else if(m.id==='sound') {
    const key=Math.floor(e/5);if(key!==s.lastCue){s.lastCue=key;pulse(349.228,2.5);if(key===0)speak('留意每次出现的柔和声音，走神后轻轻回来。');}
  } else if(m.id==='body') {
    const key=Math.min(PiankeContent.body.length-1,Math.floor(e/s.total*PiankeContent.body.length));
    if(key!==s.lastCue){s.lastCue=key;const part=PiankeContent.body[key];$('#phase').textContent=part.title;$('#bodyRegion').textContent=`身体扫描 · ${key+1} / ${PiankeContent.body.length} · 可闭眼聆听`;$('#guidance').textContent=part.text;speak(part.text);}
    PiankeBodyGuide.update($('#experience'),{index:key,elapsed:e,paused:s.paused,reducedMotion:reduceQuery.matches,theme:prefs.theme});
  } else if(m.id==='focus') {
    const part=PiankeContent.focusAt(e);
    if(part.key!==s.lastCue){s.lastCue=part.key;$('#phase').textContent=part.title;$('#guidance').textContent=part.text;speak(part.text);}
  } else if(m.id==='imagine') {
    const texts=['如果舒服，可以闭上眼睛。想象一处安静的林间。','柔和的光透过树叶，远处有平静的水。','你可以在这里，什么都不用做。','不必抓住思绪，给它一点经过的空间。','再安静地停留一会儿。'];
    const key=Math.min(4,Math.floor(e/(s.total/5)));if(key!==s.lastCue){s.lastCue=key;$('#guidance').textContent=texts[key];speak(texts[key]);}
  } else if(m.id==='combo') {
    const part=PiankeEyeGuide.restStateAt(e);
    if(part.id!==s.lastCue){
      s.lastCue=part.id;$('#phase').textContent=part.title;$('#guidance').textContent=part.instruction;
      $('.rest-eye-visual')?.classList.toggle('eyes-closed',part.id==='close');
      $$('.rest-pupil').forEach(el=>{el.setAttribute('cx',+el.dataset.x+part.x*9);el.setAttribute('cy',65+part.y*8);});
      speak(part.id==='center'?'头部放松，看正前方。':part.id.startsWith('center-')?'回到正前方。':part.id==='up'?'目光轻轻向上。':part.id==='down'?'目光轻轻向下。':part.id==='left'?'目光轻轻向左。':part.id==='right'?'目光轻轻向右。':part.voice);
    }
  } else if(m.id==='eye') {
    s.eyePacer.tick(e,{voiceEnabled:eyeVoiceEnabled(s)});flushEyeEffects(s);
    const state=PiankeEyeGuide.update({state:s.eyePacer.snapshot(),paused:s.paused,reducedMotion:reduceQuery.matches});
    s.eyeDone=state.done;
    const beat=state.step.id+':'+state.beatIndex;
    if(state.practicing&&s.lastBeat!==beat){s.lastBeat=beat;pulse(state.beat===1?330:261.626,.18);}
  } else if(s.lastCue!==0){s.lastCue=0;if(!m.game)pulse(293.665,2);}
}

function drawMotion() { if(!session||session.method.id!=='breath'||(session.opening&&session.elapsed<session.opening))return;motion?.draw({elapsed:Math.max(0,session.elapsed-session.opening),style:prefs.visual,hue:prefs.hue,theme:prefs.theme,reduced:reduceQuery.matches,inhale:BREATH.inhale,exhale:BREATH.exhale}); }
function advance(now=performance.now()) {if(!session)return;const delta=Math.max(0,(now-lastFrame)/1000);lastFrame=now;if(session.ready&&!session.paused&&!session.waiting)session.elapsed+=delta;}
function updateTimeLabel() {
  if(!session)return;
  if(session.method.id==='eye') {
    const state=session.eyePacer.snapshot(),stage={opening:'开场',explanation:'手法讲解',countdown:'准备开始',practice:'跟随节拍',done:'完成'}[state.phase];
    $('#timeLabel').innerHTML=`${state.step.kind==='section'?`第 ${state.step.number} / 6 节`:'完整六节'}<span>${stage}</span>`;
  }else $('#timeLabel').innerHTML=session.method.game?`第 ${session.round} 局<span>共 ${session.rounds} 局</span>`:`${formatTime(session.total+session.opening-session.elapsed)}<span>剩余</span>`;
}
function frame(now) { const delta=now-lastFrame;if(session){advance(now);if(session.ready&&!session.paused){if(!session.waiting)cue(session.elapsed);if(!reduceQuery.matches||frameCount%30===0)drawMotion();}frameCount++;if(frames.length<180&&delta>0)frames.push(delta);updateTimeLabel();if(session.ready&&!session.method.game&&(session.method.id==='eye'?session.eyeDone:session.elapsed>=session.total+session.opening))finish(true);}else lastFrame=now;requestAnimationFrame(frame); }
requestAnimationFrame(frame);
function formatTime(seconds) {seconds=Math.max(0,Math.ceil(seconds));return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
function shuffle(a) {for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function shapeName(value) {
  const [shape,color]=value.split(' ');
  return {blue:'雾蓝色',gold:'米金色',rose:'玫瑰色',teal:'青绿色'}[color]+{circle:'圆形',square:'方形',diamond:'菱形',pill:'圆角长方形'}[shape];
}
function setupRound() {
  const s=session;s.mistakes=0;s.roundStart=s.elapsed;s.waiting=false;s.next=1;
  const n=s.method.id==='search'?({3:5,4:7,5:9}[s.difficulty]):s.difficulty;
  s.boardSize=n;let cells;
  if(s.method.id==='schulte'){
    s.numbers=shuffle(Array.from({length:n*n},(_,i)=>i+1));
    cells=s.numbers.map(v=>`<button data-number="${v}" aria-label="数字 ${v}">${v}</button>`);
  } else {
    const shapes=['circle','square','diamond','pill'],colors=['blue','gold','rose','teal'];
    const shape=shapes[Math.floor(Math.random()*shapes.length)],color=colors[Math.floor(Math.random()*colors.length)];
    const otherShapes=shapes.filter(x=>x!==shape),otherColors=colors.filter(x=>x!==color);
    const pick=a=>a[Math.floor(Math.random()*a.length)];
    s.target=shape+' '+color;s.targetIndex=Math.floor(Math.random()*(n*n));
    s.shapes=Array.from({length:n*n},(_,i)=>{
      if(i===s.targetIndex)return s.target;
      const r=Math.random();
      return r<.45?shape+' '+pick(otherColors):r<.9?pick(otherShapes)+' '+color:pick(otherShapes)+' '+pick(otherColors);
    });
    cells=s.shapes.map((v,i)=>`<button data-cell="${i}" aria-label="${shapeName(v)}"><span class="shape ${v}" aria-hidden="true"></span></button>`);
  }
  $('#experience').innerHTML=`<p class="round-label">第 ${s.round} 局 · 共 ${s.rounds} 局</p><h2 class="game-title">${s.method.id==='schulte'?'请依次点击':'颜色与形状，都要相同'}</h2>${s.method.id==='schulte'?'<div class="next-number">下一个：<strong id="nextNumber">1</strong></div>':`<div class="target">目标 <span class="shape ${s.target}"></span><span class="small">${shapeName(s.target)}</span></div>`}<div class="board ${s.method.id==='search'?'search-board':''}" style="--grid-size:${n};grid-template-columns:repeat(${n},minmax(0,1fr))">${cells.join('')}</div><div class="gamehint" role="status"></div>`;
  $$('.board button').forEach(b=>b.onclick=e=>{
    e.stopPropagation();if(session!==s||s.paused||s.waiting||!s.ready)return;
    advance();if(b.classList.contains('done'))return;
    const correct=s.method.id==='schulte'?+b.dataset.number===s.next:+b.dataset.cell===s.targetIndex;
    if(correct){
      b.classList.add('done');b.setAttribute('aria-disabled','true');$('.gamehint').textContent='';
      if(s.method.id==='search'||s.next===n*n)roundDone();else{s.next++;$('#nextNumber').textContent=s.next;}
    }else{
      s.mistakes++;$('.gamehint').textContent=s.method.id==='schulte'?`没关系，继续找 ${s.next}`:'再看一眼，颜色和形状都要相同';
      b.classList.add('miss');setTimeout(()=>b.classList.remove('miss'),450);
    }
  });
}

function roundDone() {const s=session;s.results.push({round:s.round,seconds:Math.round((s.elapsed-s.roundStart)*100)/100,mistakes:s.mistakes});s.waiting=true;if(s.round>=s.rounds){finish(true);return;}$('#experience').innerHTML=`<div class="minimal-ring">✓</div><h2>这一局完成了</h2><p>按自己的节奏，继续下一局。</p><button id="nextRound" class="primary">开始第 ${s.round+1} 局</button>`;$('#nextRound').onclick=e=>{e.stopPropagation();s.round++;setupRound();};}
function updateAudioStatus() {
  if(!session)return;const s=session;
  const bed=s.method.id==='nature'?`${PiankeContent.scenes.find(x=>x.id===s.scene)?.name||'自然'} · 合成环境声`:s.method.audio==='none'?'安静练习':s.method.audio==='beat'?'轻柔节拍':['soft','ambient'].includes(s.method.audio)?'原创氛围配乐':'柔和音色';
  $('#audioStatus').textContent=s.paused?'已暂停 · 声音与画面一起停留':!s.sound?'已静音':audioFailed?'声音未能启动，仍可跟随画面':speechFailed?'人声未能播放，仍可跟随文字':!s.ready?'声音准备中':bed+(s.voice&&voiceAvailable?' · 当前本机人声':'');
}
async function togglePause(forcePause=false) {
  if(!session||(session.resuming&&forcePause!==true))return;
  const s=session;advance();
  if(forcePause===true||!s.paused){
    // A host hide must cancel an in-flight resume even while paused is still true.
    s.pauseIntent=true;s.resumeToken=(s.resumeToken||0)+1;s.resuming=false;
    s.paused=true;$('#session').classList.add('paused');
    $('#pauseBtn').textContent='继续';$('#pauseBtn').setAttribute('aria-label','继续');$('#pauseBtn').title='继续';
    if(s.method.id==='eye'){s.eyePacer.setPaused(true,s.elapsed);flushEyeEffects(s);PiankeEyeGuide.update({state:s.eyePacer.snapshot(),paused:true,reducedMotion:reduceQuery.matches});}
    window.speechSynthesis?.cancel();ambience?.setDucking(false);
    if(s.method.id==='body')PiankeBodyGuide.update($('#experience'),{index:Math.min(17,Math.floor(s.elapsed/s.total*18)),elapsed:s.elapsed,paused:true,reducedMotion:reduceQuery.matches,theme:prefs.theme});
    showControls();updateAudioStatus();
    try{await audioCtx?.suspend();}catch{audioFailed=true;}
  }else{
    s.pauseIntent=false;
    const token=s.resumeToken=(s.resumeToken||0)+1;
    s.resuming=true;
    try{
      // A browser page restored from its back/forward cache retains a safely
      // paused eye state; pagehide released its audio graph, so recreate it.
      if(s.method.id==='eye'&&s.sound&&!master)await initAudio(true,s.volume,audioEpoch);
      else await audioCtx?.resume();
    }catch{if(session===s&&s.resumeToken===token)audioFailed=true;}
    if(session!==s)return;
    if(s.resumeToken!==token||s.pauseIntent){
      // resume() may settle after hide; retain the latest explicit pause intent.
      if(s.pauseIntent){try{await audioCtx?.suspend();}catch{if(session===s)audioFailed=true;}}
      return;
    }
    if(s.method.id==='eye'){
      // Sound/volume may change while the audio graph is being recreated.
      audioEnabled=s.sound;audioVolume=s.volume;adjustGain(s.sound?s.volume/100*.9:0);
    }
    s.resuming=false;s.paused=false;lastFrame=performance.now();
    $('#session').classList.remove('paused');$('#pauseBtn').textContent='暂停';$('#pauseBtn').setAttribute('aria-label','暂停');$('#pauseBtn').title='暂停';
    if(s.method.id==='eye')s.eyePacer.setPaused(false,s.elapsed);
    s.lastCue=-1;if(s.method.id!=='eye')s.lastBeat=-1;cue(s.elapsed);
    showControls();updateAudioStatus();
  }
}
function resultRows(rows) {return rows?.length?rows.map(r=>`<div class="record">第 ${r.round} 局 <span>${r.seconds.toFixed(2)} 秒 · 误点 ${r.mistakes} 次</span></div>`).join(''):'<p>还没有完成的局数。</p>';}
function finish(completed) {
  if(!session)return;advance();const s=session;if(s.eyePacer){s.eyePacer.dispose();flushEyeEffects(s);}PiankeEyeGuide.destroy();if(completed&&!s.method.game&&s.method.id!=='eye')s.elapsed=Math.min(s.elapsed,s.total+s.opening);session=null;clearTimeout(controlsTimer);stopAudio();$('#session').hidden=true;$('#session').classList.remove('controls-visible','paused');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
  const record={name:s.method.name,date:new Date().toLocaleString('zh-CN'),completed,seconds:Math.round(s.elapsed),rounds:s.results,demo:!!s.method.demo};
  if(prefs.save===true&&!s.method.demo){history.unshift(record);history=history.slice(0,100);try{localStorage.setItem('pianke.records',JSON.stringify(history));}catch{toast('本次记录保存失败，结果仍可查看。');}}
  dialog(`<span class="badge">${s.method.demo?'界面演示结束':completed?'这段片刻，完成了':'已提前结束'}</span><h2 id="dialogTitle">${completed?'慢慢回到你的节奏。':'到这里，也可以。'}</h2><p>${s.method.demo?'整套眼保健操待核验，此样机不计练习记录。':completed?'准备好了，就继续手边的阅读。':'未完成的部分没有记为完成。'}</p>${s.method.game?resultRows(s.results)+(completed?'':'<p class="small">未完成局不计入各局结果。</p>'):`<p class="elapsed-result">本次停留 ${formatTime(s.elapsed)}${s.opening?'（含可选开场）':''}</p>`}<p class="small">${prefs.save===true&&!s.method.demo?'已保存在当前浏览器。':'只显示本次结果，关闭后不保留练习明细。'}</p><button id="backWork" class="primary wide">收起，回到工作</button><button id="backHome" class="wide">返回方法</button>`);
  $('#backHome').onclick=closeDialog;$('#backWork').onclick=()=>{closeDialog();collapse();};
  if(s.sound){const epoch=audioEpoch;initAudio(true,s.volume,epoch).then(ok=>{if(!ok||epoch!==audioEpoch||session)return;pulse(392,2.5);if(s.voice)speak('这一段结束了。准备好了，再慢慢回到手边的事情。',true);auditionTimer=setTimeout(()=>{if(!session)stopAudio();},5000);});}
}

function hideControls() {clearTimeout(controlsTimer);if(session?.paused||controlsAdjusting)return;$('#session').classList.remove('controls-visible');}
function showControls() {if(!session)return;clearTimeout(controlsTimer);$('#session').classList.add('controls-visible');controlsTimer=setTimeout(()=>{if(session?.paused||controlsAdjusting||(keyboardMode&&document.activeElement?.closest('.session-chrome'))){showControls();return;}hideControls();},5000);}
function toggleControls() {if($('#session').classList.contains('controls-visible'))hideControls();else showControls();}
function collapse() {$('.app').hidden=true;$('#wake').hidden=false;$('#menuToggle').setAttribute('aria-expanded','false');}
function wake() {$('.app').hidden=false;$('#wake').hidden=true;$('#menuToggle').setAttribute('aria-expanded','true');}
function setFloating(value) {
  if(!session)return;const box=$('#session');if(value&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});box.classList.toggle('floating',value);box.removeAttribute('style');$('#viewBtn').textContent=value?'沉浸展开':'切为浮窗';if(value){const left=Math.max(10,(innerWidth-Math.min(420,innerWidth-20))/2);box.style.left=left+'px';box.style.top=Math.max(35,Math.min(100,innerHeight-box.offsetHeight-10))+'px';}motion?.resize();drawMotion();showControls();
}
async function toggleNativeFullscreen() {if(!session)return;try {if(document.fullscreenElement)await document.exitFullscreen();else {setFloating(false);if(!document.documentElement.requestFullscreen){toast('当前浏览器不支持全屏，可继续使用页面沉浸模式。');return;}await document.documentElement.requestFullscreen();}}catch{toast('浏览器没有允许全屏，可继续使用页面沉浸模式。');}updateFullscreenLabel();showControls();}
function updateFullscreenLabel() {const value=document.fullscreenElement?'退出全屏':'进入全屏';$('#fullscreenBtn').setAttribute('aria-label',value);$('#fullscreenBtn').title=value;}

function settings() {
  dialog(`<h2 id="dialogTitle">按自己的节奏</h2><h3>界面主题</h3><div class="theme-choices" role="group" aria-label="界面主题">${[["minimal","极简","原有主题"],["mist","雾光玻璃","浅冰蓝 · 珍珠白"],["dusk","暮色玻璃","深蓝灰 · 柔光"]].map(([id,name,desc])=>`<button data-theme-choice="${id}" class="theme-choice ${prefs.theme===id?'selected':''}" aria-pressed="${prefs.theme===id}"><i class="theme-preview ${id}"></i><strong>${name}</strong><small>${desc}</small></button>`).join('')}</div><p class="small">主题只改变视觉，布局和使用方式保持一致。</p><h3>外观</h3><div class="field"><label for="opacitySelect">玻璃面板透明度</label><input id="opacitySelect" type="range" min="35" max="95" value="${prefs.opacity}"></div><p class="small">向右增加面板承托，文字更清楚。</p><div class="field"><label for="visualSelect">呼吸视觉</label><select id="visualSelect"><option value="smoke" ${prefs.visual==='smoke'?'selected':''}>轻薄烟圈</option><option value="ripple" ${prefs.visual==='ripple'?'selected':''}>宽柔水波</option></select></div><div class="field"><label for="hueSelect">动效色调</label><input id="hueSelect" type="range" min="170" max="280" value="${prefs.hue}"></div><p class="small">${reduceQuery.matches?'系统已开启减少动态效果，练习将显示静态视觉。':'支持系统的减少动态效果偏好。'}烟圈与水波仅用于呼吸，不改变其他方法。</p><h3>练习记录</h3><div class="field"><label for="saveSelect">保存偏好</label><select id="saveSelect"><option value="null" ${prefs.save===null?'selected':''}>首次开始时询问</option><option value="true" ${prefs.save===true?'selected':''}>保存在当前浏览器</option><option value="false" ${prefs.save===false?'selected':''}>只看本次，不留明细</option></select></div><p class="small">改为不保存会清除已有明细；设置偏好仍保留。没有账号或云同步。</p><h3>提醒 · 页面内计时</h3><div class="field"><label for="reminderMode">计时方式</label><select id="reminderMode"><option value="fixed">固定间隔 · 页面打开时</option><option value="system">累计电脑使用 · Mac 待接入</option><option value="reading">主动开启阅读计时</option></select></div><div class="field"><label for="interval">提醒间隔</label><select id="interval"><option value="20">20 分钟</option><option value="30" selected>30 分钟</option><option value="45">45 分钟</option></select></div><div class="field"><label for="reminderStyle">提醒形式</label><select id="reminderStyle"><option value="small">小提示</option><option value="full">全屏提醒</option></select></div><p id="reminderStatus">${reminder?'页面计时中，剩余 '+formatTime((reminder.due-performance.now())/1000):'提醒默认关闭'}</p><p class="small">本页关闭后停止；系统使用时间、锁屏感知和系统通知尚未接入，不会申请权限。</p><div class="choices"><button id="enableReminder">开启所选计时</button><button id="disableReminder">关闭提醒</button><button id="previewReminder">预览提醒</button></div>`);
  $$('[data-theme-choice]').forEach(b=>b.onclick=()=>{prefs.theme=b.dataset.themeChoice;applyAppearance();savePrefs();$$('[data-theme-choice]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',x===b);});});
  $('#opacitySelect').oninput=e=>{prefs.opacity=+e.target.value;applyAppearance();savePrefs();};$('#hueSelect').oninput=e=>{prefs.hue=+e.target.value;savePrefs();drawMotion();};$('#visualSelect').onchange=e=>{prefs.visual=e.target.value;savePrefs();drawMotion();};
  $('#saveSelect').onchange=e=>{prefs.save=JSON.parse(e.target.value);if(prefs.save!==true){history=[];try{localStorage.removeItem('pianke.records');}catch{}}savePrefs();};
  $('#enableReminder').onclick=()=>{if($('#reminderMode').value==='system'){$('#reminderStatus').textContent='累计电脑使用时间未接入，未启动计时。可预览提醒样式。';return;}const interval=+$('#interval').value*60;reminder={due:performance.now()+interval*1000,interval,mode:$('#reminderMode').value,style:$('#reminderStyle').value};$('#reminderStatus').textContent=reminder.mode==='reading'?'阅读计时已由你主动开启。':'固定间隔已开启，仅当前页面有效。';};
  $('#disableReminder').onclick=()=>{reminder=null;$('#reminderStatus').textContent='提醒已关闭';};$('#previewReminder').onclick=()=>showReminder($('#reminderStyle').value,true);
}
function records() {dialog(`<h2 id="dialogTitle">留下的片刻</h2><p class="small">${prefs.save===true?'仅当前浏览器，最近 100 次。':'目前未开启保存，不会持久化练习明细。'}</p>${history.length?history.map(r=>`<div class="record"><strong>${escapeHtml(r.name)}</strong>　${r.completed?'已完成':'提前结束'}<br><span>${escapeHtml(r.date)} · ${formatTime(r.seconds)}</span>${r.rounds?.length?resultRows(r.rounds):''}</div>`).join(''):'<div class="empty-record"><p>还没有留下的记录。</p><p class="small">不留下，也是一种轻松。</p></div>'}<button id="clearRecords" class="wide">清除全部练习记录</button>`);$('#clearRecords').onclick=()=>{history=[];try{localStorage.removeItem('pianke.records');}catch{}records();};}
function showReminder(style,preview) {const n=$('#notice');clearTimeout(toast.timer);n.className='notice'+(style==='full'?' full':'');n.hidden=false;n.innerHTML=`<span class="badge">${preview?'提醒样式预览':'页面计时提醒'}</span><h2>要不要，停留片刻？</h2><p>如果正读到投入处，也可以稍后再来。</p><div><button id="takeBreak" class="primary">打开片刻</button><button id="snooze">5 分钟后</button><button id="ignore">忽略</button></div>`;$('#takeBreak').onclick=()=>{n.hidden=true;closeDialog();wake();};$('#ignore').onclick=()=>n.hidden=true;$('#snooze').onclick=()=>{n.hidden=true;if(!reminder)reminder={interval:300,style,mode:'fixed',once:true};reminder.due=performance.now()+300000;};}
setInterval(()=>{if(!reminder||performance.now()<reminder.due)return;if(session){reminder.due=performance.now()+300000;return;}const r=reminder;showReminder(r.style,false);if(r.once)reminder=null;else r.due=performance.now()+r.interval*1000;},500);
function about() {
  dialog(`<span class="badge">片刻 · 0.3.1</span><h2 id="dialogTitle">留一点空白。</h2><p>保留原有极简界面，新增雾光玻璃、暮色玻璃与更柔和的界面过渡。</p><h3>这轮更新</h3><p>4 秒吸气、6 秒呼气；简洁设置与首屏开始；身体扫描从五官向下；视觉聚焦增加间隔提醒；舒尔特 5 / 10 局、视觉搜索 10 / 20 / 30 局；完整六节眼保健操动画与轻缓方向性眼动。</p><h3>声音与自然画面</h3><p>背景为原创程序氛围配乐与六种合成声景。V01 轻柔陪伴女声已选，专用引导词待制作；当前人声仍可关闭。免费8K自然视频正在整理，选定后再接入。目前的自然画面仍为授权静态摄影与动态光雾。</p><p class="small">练习时长是产品预设，不承诺注意力、阅读或视力改善。按摩示意按公开教学资料原创绘制，尚未经过专业人员逐图审校。</p><p><a href="assets/ASSETS.md" target="_blank">素材来源</a> · <a href="assets/eye-guide-sources.md" target="_blank">眼部动作来源</a></p>`);
}

$$('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;renderCards();});$('.brand').onclick=e=>{e.preventDefault();category='relax';renderCards();};$('#recordsBtn').onclick=records;$('#settingsBtn').onclick=settings;$('#aboutBtn').onclick=about;$('#miniBtn').onclick=collapse;$('#wake').onclick=wake;$('#menuToggle').onclick=()=>$('.app').hidden?wake():collapse();
$('#pauseBtn').onclick=e=>{e.stopPropagation();togglePause();};$('#endBtn').onclick=$('#endControlBtn').onclick=e=>{e.stopPropagation();finish(false);};$('#viewBtn').onclick=e=>{e.stopPropagation();setFloating(!$('#session').classList.contains('floating'));};$('#fullscreenBtn').onclick=e=>{e.stopPropagation();toggleNativeFullscreen();};
$('#muteBtn').onclick=async e=>{
  e.stopPropagation();if(!session)return;const current=session;
  current.sound=!current.sound;audioEnabled=current.sound;
  if(!current.sound)interruptEyeNarration(current,'muted');
  window.speechSynthesis?.cancel();ambience?.setDucking(false);
  if(current.sound&&!master){
    const epoch=audioEpoch;await initAudio(true,current.volume,epoch);
    if(session!==current||epoch!==audioEpoch)return;
    startBed(current.method.audio);if(current.paused)await audioCtx?.suspend();
  }
  adjustGain(current.sound?current.volume/100*.9:0);
  $('#muteBtn').setAttribute('aria-label',current.sound?'静音':'开启声音');$('#muteBtn').classList.toggle('muted',!current.sound);
  if(current.sound&&!current.paused){current.lastCue=-1;if(current.method.id!=='eye')current.lastBeat=-1;cue(current.elapsed);}
  updateAudioStatus();showControls();
};
$('#volume').oninput=e=>{if(!session)return;session.volume=+e.target.value;audioVolume=session.volume;interruptEyeNarration(session,'volume-changed');window.speechSynthesis?.cancel();adjustGain(session.sound?session.volume/100*.9:0);showControls();};
$('#session').onclick=e=>{if(e.target.closest('button,input,select,a,.session-chrome,.board'))return;toggleControls();};
$$('.session-chrome').forEach(el=>{el.addEventListener('pointerdown',()=>{controlsAdjusting=true;showControls();});el.addEventListener('pointermove',()=>{if($('#session').classList.contains('controls-visible'))showControls();});});window.addEventListener('pointerup',()=>{if(controlsAdjusting){controlsAdjusting=false;showControls();}});
let drag=null;$('#dragHandle').onpointerdown=e=>{if(!$('#session').classList.contains('floating')||e.target.closest('button'))return;const b=$('#session').getBoundingClientRect();drag={x:e.clientX-b.left,y:e.clientY-b.top};$('#dragHandle').setPointerCapture(e.pointerId);};$('#dragHandle').onpointermove=e=>{if(!drag)return;const box=$('#session');box.style.left=Math.max(0,Math.min(innerWidth-box.offsetWidth,e.clientX-drag.x))+'px';box.style.top=Math.max(0,Math.min(innerHeight-60,e.clientY-drag.y))+'px';};$('#dragHandle').onpointerup=()=>drag=null;$('#dragHandle').onpointercancel=()=>drag=null;
$('#overlay').onclick=e=>{if(e.target===$('#overlay'))closeDialog();};
let lastFullscreenExit=-1000;
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)lastFullscreenExit=performance.now();updateFullscreenLabel();motion?.resize();drawMotion();});
document.addEventListener('pointerdown',()=>keyboardMode=false);
document.addEventListener('keydown',e=>{
  if(e.key==='Tab'){keyboardMode=true;if(session)showControls();const root=!$('#overlay').hidden?$('#dialog'):session?$('#session'):null;if(root){const focus=[...root.querySelectorAll('button:not(:disabled),input,select,summary,a')].filter(el=>el.getClientRects().length&&!el.closest('details:not([open]) :not(summary)'));const first=focus[0],last=focus.at(-1);if(e.shiftKey&&(document.activeElement===first||!focus.includes(document.activeElement))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){e.preventDefault();first?.focus();}}}
  if(e.key.toLowerCase()==='k'&&e.metaKey&&e.shiftKey){e.preventDefault();wake();if(session)showControls();}
  if(e.key==='Escape'){if(!$('#notice').hidden){$('#notice').hidden=true;return;}if(!$('#overlay').hidden){closeDialog();return;}if(session){if(document.fullscreenElement||performance.now()-lastFullscreenExit<250)return;if(!$('#session').classList.contains('floating'))setFloating(true);else showControls();}else collapse();}
  if(e.code==='Space'&&session&&!e.target.closest('input,select,button,textarea')){e.preventDefault();togglePause();}
});
window.addEventListener('resize',()=>{motion?.resize();drawMotion();if(session&&$('#session').classList.contains('floating')){const b=$('#session'),r=b.getBoundingClientRect();b.style.left=Math.max(0,Math.min(innerWidth-b.offsetWidth,r.left))+'px';b.style.top=Math.max(0,Math.min(innerHeight-60,r.top))+'px';}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(session)togglePause(true);else stopAudio();}});
function handlePageHide() {
  const eye=session?.method.id==='eye',preserveEye=eye&&session.ready;
  if(preserveEye)togglePause(true);
  stopAudio({preserveEye});
  if(eye&&!preserveEye){
    // Startup has not finished, and its old audio epoch is now invalid. Cancel
    // this unstarted session instead of restoring a permanently !ready screen.
    PiankeEyeGuide.destroy();session=null;clearTimeout(controlsTimer);
    $('#session').hidden=true;$('#session').classList.remove('controls-visible','paused');updateFocusLayers();
  }
  motion?.destroy();
}
window.addEventListener('pagehide',handlePageHide);
reduceQuery.addEventListener('change',()=>{if(session){$('#session').classList.toggle('reduced-motion',reduceQuery.matches);drawMotion();}});
applyAppearance();renderCards();$('#menuToggle').setAttribute('aria-expanded','true');

window.piankeDiagnostics=()=>({version:"0.3.1",build:8,theme:prefs.theme,method:session?.method.id||null,ready:session?.ready??false,paused:session?.paused??false,elapsed:session?.elapsed??null,phase:$("#session").dataset.breathPhase||null,timing:session?.timing?{...session.timing}:null,frameIntervals:frames.slice(),audioState:audioCtx?.state||"not-created",activeAudioNodes:nodes.length});
