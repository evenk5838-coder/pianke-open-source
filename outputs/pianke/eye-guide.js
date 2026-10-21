/* 片刻 · 原创眼部动作示意。动作依据和节拍取舍见 assets/eye-guide-sources.md。 */
(() => {
  'use strict';
  const BEAT_SECONDS = 1, COUNTDOWN_SECONDS = 2, PRACTICE_SECONDS = 32;
  const SPEECH_START_TIMEOUT = 3;
  const sections = [
    {id:'brow',title:'按揉攒竹穴',location:'两侧眉头的凹陷处',instruction:'拇指指腹轻贴眉头，其余指尖自然抵在前额。',action:'拇指小幅轻揉',reminder:'每拍轻揉一圈，手指留在原处。',voice:'第一节，按揉攒竹穴。双手拇指轻贴两侧眉头的凹陷，其余指尖自然抵在前额。',view:'front',points:[[260,160],[300,160]],finger:'thumb'},
    {id:'inner',title:'按压睛明穴',location:'鼻根两旁，靠近内眼角的凹陷处',instruction:'两手食指指腹轻贴鼻根两侧，其余手指自然握起。',action:'轻按，放松',reminder:'轻轻上下按压，不挤压眼球。',voice:'第二节，按压睛明穴。双手食指轻贴鼻根两侧，靠近内眼角的凹陷。动作轻柔，不压眼球。',view:'front',points:[[264,184],[296,184]],finger:'index'},
    {id:'cheek',title:'按揉四白穴',location:'瞳孔正下方，眼眶下缘再往下的凹陷处',instruction:'食指和中指并拢定位：中指第一关节对齐鼻翼，再收回中指，以食指轻揉。',action:'食指小幅轻揉',reminder:'轻贴面颊，不向上顶压眼球。',voice:'第三节，按揉四白穴。食指和中指并拢，中指第一关节对齐鼻翼。收回中指，食指在眼眶下方轻轻按揉。',view:'front',points:[[242,224],[318,224]],finger:'index'},
    {id:'temple',title:'按揉太阳穴 · 刮上眼眶',location:'眉梢外后方的凹陷处；刮动沿眉骨向外',instruction:'拇指轻贴太阳穴。前四拍轻揉；后四拍用食指第二指节内侧沿眉骨向外轻刮两次。',action:'先揉四拍，再轻刮两次',reminder:'拇指留在原处，只沿上方眉骨，不碰眼球。',voice:'第四节，按揉太阳穴，刮上眼眶。前四拍拇指轻揉太阳穴。后四拍，食指第二指节内侧沿眉骨，从眉头向眉梢轻刮两次。',view:'front',points:[[192,178],[368,178]],finger:'thumb'},
    {id:'neck',title:'按揉风池穴',location:'后脑枕骨下，两侧大筋外缘的凹陷处',instruction:'双掌贴近耳侧，手指自然抱头，拇指指腹轻贴枕骨下两侧凹陷。',action:'拇指小幅轻揉',reminder:'头颈自然放松，小幅度，不用力深压。',voice:'第五节，按揉风池穴。双手自然抱头，拇指轻贴后脑枕骨下、两侧大筋外缘的凹陷，小幅度轻揉。',view:'back',points:[[251,290],[309,290]],finger:'thumb'},
    {id:'ear',title:'揉捏耳垂 · 脚趾抓地',location:'两侧耳垂正中；双脚自然落地',instruction:'拇指和食指轻捏耳垂，脚趾跟随同一节拍轻抓、放松。',action:'轻捏耳垂，脚趾轻抓',reminder:'每拍一次，动作轻，不屏住呼吸。',voice:'第六节，揉捏耳垂，脚趾抓地。拇指和食指轻捏耳垂正中。双脚落地，脚趾跟随节拍轻抓，再放松。',view:'front',points:[[183,223],[377,223]],finger:'pinch'}
  ];
  // Spoken explanations finish before the countdown. These are deliberately
  // shorter than the written instructions, which remain visible throughout.
  const shortVoices = [
    '第一节。拇指轻贴两侧眉头，其余指尖抵在前额，小幅轻揉。',
    '第二节。食指轻贴鼻根两侧，靠近内眼角，轻轻上下按压，不压眼球。',
    '第三节。食指和中指并拢，中指第一关节对齐鼻翼。收回中指，用食指轻揉。',
    '第四节。拇指轻揉太阳穴四拍，再用食指第二指节内侧，沿眉骨向外轻刮两次。',
    '第五节。双手抱头，拇指轻贴后脑枕骨下、两侧大筋外缘的凹陷，小幅轻揉。',
    '第六节。拇指和食指轻捏耳垂，双脚落地，脚趾跟随节拍轻抓、放松。'
  ];
  sections.forEach((section,index)=>Object.assign(section,{number:index+1,kind:'section',voice:shortVoices[index],countdownDuration:COUNTDOWN_SECONDS,practiceDuration:PRACTICE_SECONDS,beats:32}));
  const opening = Object.freeze({id:'prepare',title:'眼保健操',kind:'prepare',instructions:['跟随示意，轻柔完成六节动作。','先清洁双手，不压眼球；眼睛红肿或皮肤破损时跳过按摩。'],voice:'眼保健操。跟随示意，轻柔完成六节动作。'});
  const ending = Object.freeze({id:'finish',title:'六节已完成',kind:'finish',instructions:['双手自然放下，缓慢睁眼。','给自己一点过渡的时间。'],voice:''});
  const timeline = Object.freeze([opening,...sections.map(Object.freeze),ending]);
  // Speech duration varies by local voice. There is intentionally no fixed total.
  const totalDuration = null;
  const sources = [{title:'福建省教育厅 · 新版眼保健操解析',url:'https://jyt.fujian.gov.cn/jyyw/jyt/202006/t20200608_5295124.htm'}, {title:'银海眼科医院 · 眼保健操注意事项',url:'https://ineyehospital.com/m/news/ineye/364.html'}];
  const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let mountNode = null, lastStage = '', mounted = false;
  /** Pure active-time state machine. No browser clock or audio side effects.
   * The host drains effects, and reports speech events with the same elapsed.
   * Tokens are invalidated before cancellation, since cancel may never callback.
   */
  function createPacer() {
    let clock=0,inputTime=0,phase='opening',index=-1,phaseStart=0,paused=false,disposed=false;
    let voiceEnabled=true,voiceFailed=false,mode='pending',serial=0,request=null,effects=[];
    const currentStep=()=>phase==='opening'?opening:phase==='done'?ending:sections[index];
    function sync(elapsed) {
      const next=Math.max(inputTime,Number(elapsed)||0);
      if(!paused&&!disposed)clock+=next-inputTime;
      inputTime=next;
    }
    function cancelRequest(reason) {
      if(request)effects.push({type:'cancel',token:request.token,reason});
      request=null;serial++;
    }
    function narration(section,at) {
      index=section;phase=section<0?'opening':'explanation';phaseStart=at;mode='pending';request=null;
    }
    function countdown(at) {phase='countdown';phaseStart=at;mode='text';request=null;}
    function fallback(at,reason) {
      cancelRequest(reason);
      if(phase==='opening'){mode='text';phaseStart=at;}
      else if(phase==='explanation')countdown(at);
    }
    function ensureNarration() {
      if(mode!=='pending'||request)return;
      if(!voiceEnabled||voiceFailed){fallback(phaseStart,'text-only');return;}
      const text=currentStep().voice;
      request={token:++serial,text,requestedAt:clock,startedAt:null};mode='waiting';
      effects.push({type:'speak',token:request.token,text});
    }
    function tick(elapsed=0,options={}) {
      sync(elapsed);
      if('voiceEnabled' in options)voiceEnabled=!!options.voiceEnabled;
      if(disposed||paused)return snapshot();
      // A single late frame may cross a countdown/beat boundary. Preserve that
      // boundary rather than adding a frame of delay to every section.
      for(let transitions=0;transitions<16;transitions++) {
        const previous=phase+':'+index;
        if(phase==='opening'||phase==='explanation') {
          ensureNarration();
          if(request&&!voiceEnabled)fallback(clock,'voice-disabled');
          if(request&&request.startedAt===null&&clock-request.requestedAt>=SPEECH_START_TIMEOUT){voiceFailed=true;fallback(clock,'speech-start-timeout');}
          if(request&&request.startedAt!==null&&clock-request.startedAt>=Math.min(40,Math.max(12,request.text.length*.6+5))){voiceFailed=true;fallback(clock,'speech-end-timeout');}
          if(phase==='opening'&&mode==='text'&&clock-phaseStart>=COUNTDOWN_SECONDS)narration(0,phaseStart+COUNTDOWN_SECONDS);
        }
        if(phase==='countdown'&&clock-phaseStart>=COUNTDOWN_SECONDS){phase='practice';phaseStart+=COUNTDOWN_SECONDS;}
        if(phase==='practice'&&clock-phaseStart>=PRACTICE_SECONDS) {
          const boundary=phaseStart+PRACTICE_SECONDS;
          if(index===sections.length-1){phase='done';phaseStart=boundary;mode='done';}
          else narration(index+1,boundary);
        }
        if(previous===phase+':'+index)break;
      }
      return snapshot();
    }
    function speechStarted(token,elapsed) {
      if(disposed||paused||request?.token!==token)return false;
      sync(elapsed);request.startedAt=clock;mode='speaking';return true;
    }
    function speechFinished(token,reason,elapsed) {
      if(disposed||paused||request?.token!==token)return false;
      sync(elapsed);request=null;serial++;
      if(reason!=='end'){voiceFailed=true;fallback(clock,'speech-failed');}
      else if(phase==='opening')narration(0,clock);
      else if(phase==='explanation')countdown(clock);
      return true;
    }
    function interrupt(reason,elapsed) {
      if(disposed)return snapshot();sync(elapsed);
      // Paused explanations must still replay after a volume adjustment. Sound
      // eligibility is checked on resume, so a muted resume takes text fallback.
      if(paused)return snapshot();
      if(phase==='opening'||phase==='explanation')fallback(clock,reason||'interrupted');
      return snapshot();
    }
    function setPaused(value,elapsed) {
      sync(elapsed);if(disposed||paused===!!value)return snapshot();paused=!!value;
      if(phase==='opening'||phase==='explanation') {
        if(paused){cancelRequest('paused');mode='pending';}
        // Resume starts this sentence again; countdown/practice retain progress.
        else {phaseStart=clock;mode='pending';}
      }
      return snapshot();
    }
    function snapshot() {
      const step=currentStep(),local=Math.max(0,clock-phaseStart),practicing=phase==='practice';
      const practice=practicing?Math.min(PRACTICE_SECONDS,local):0;
      const beatIndex=practicing?Math.min(31,Math.floor(practice/BEAT_SECONDS)):-1;
      const beat=practicing?beatIndex%8+1:0,set=practicing?Math.floor(beatIndex/8)+1:0;
      const sweep=practicing&&step.id==='temple'&&beat>4;
      const remaining=phase==='countdown'?Math.max(0,COUNTDOWN_SECONDS-local):practicing?Math.max(0,PRACTICE_SECONDS-local):phase==='opening'&&mode==='text'?Math.max(0,COUNTDOWN_SECONDS-local):null;
      return {step,elapsed:clock,phase,local,paused,disposed,narration:mode,voiceFailed,practicing,practice,beat,set,beatIndex,beatFraction:practice%1,sweep,remaining,countdown:phase==='countdown'?Math.ceil(remaining):null,done:phase==='done',cueKey:step.id+':'+phase,spoken:phase==='opening'||phase==='explanation'?step.voice:'',action:sweep?'沿眉骨向外轻刮':step.action};
    }
    function drainEffects(){const batch=effects;effects=[];return batch;}
    function dispose(){if(disposed)return;cancelRequest('disposed');disposed=true;}
    return Object.freeze({tick,snapshot,speechStarted,speechFinished,interrupt,setPaused,drainEffects,dispose,isCurrentSpeech:token=>!disposed&&!paused&&request?.token===token});
  }
  function stateAt(state) {return state&&state.step&&state.phase?state:createPacer().snapshot();}
  function point(x,y,i) {return `<g class="eg-point" data-point="${i}" transform="translate(${x} ${y})"><circle class="eg-point-halo" r="17"/><circle class="eg-point-ring" r="10"/><circle class="eg-point-core" r="4"/></g>`;}
  function hand(x,y,side,kind) {
    const mirror=side===0?1:-1;
    let path='';
    if(kind==='thumb') path='<path d="M-55 84L-56 40Q-57 27-49 18L-33-16Q-30-22-25-20T-22-11L-29 10L-20-22Q-17-30-12-27T-10-17L-16 12L-8-16Q-5-22 0-19T1-9L-5 22L-2 6Q0-7 7-6T15 6L17 40Q15 57-1 67L-8 84Z"/>';
    else if(kind==='pinch') path='<path d="M-40 82L-42 49Q-43 38-34 23L-14-2Q-7-10-1-5T-2 5L-16 26Q-8 30-3 21L4 8Q9-1 15 3T17 14L10 38Q8 49-6 57L-9 82Z"/><path class="eg-hand-line" d="M-28 39L-16 26M-19 54L-6 43"/>';
    else path='<path d="M-43 84L-44 52Q-44 43-35 37L-14 24L-10 2Q-9-10-2-10T6 2L9 30Q24 32 24 46L19 66L11 84Z"/><path class="eg-hand-line" d="M-31 47L-15 40M-24 58L-8 51M-15 68L0 61"/>';
    return `<g class="eg-hand-wrap" transform="translate(${x} ${y}) scale(${mirror} 1)"><g class="eg-hand" data-hand="${side}">${path}<ellipse class="eg-finger-pad" cx="2" cy="2" rx="6" ry="8"/></g></g>`;
  }
  function face(back=false) {
    if(back) return '<path class="eg-shoulders" d="M143 396Q149 352 224 342L244 326V282H316V326L336 342Q411 352 417 396"/><path class="eg-head" d="M187 174Q187 69 280 68Q373 69 373 174L365 241Q353 288 317 305H243Q207 288 195 241Z"/><path class="eg-hairline" d="M202 219Q220 232 223 258Q241 269 244 292M358 219Q340 232 337 258Q319 269 316 292M259 306L254 338M301 306L306 338"/><path class="eg-neck-guide" d="M242 281Q280 299 318 281M267 303L267 334M293 303L293 334"/><text class="eg-svg-caption" x="280" y="115" text-anchor="middle">后侧</text>';
    return '<path class="eg-shoulders" d="M136 396Q145 352 224 338L246 322V293H314V322L336 338Q415 352 424 396"/><path class="eg-ear" d="M191 172Q169 161 170 192Q171 217 184 230L195 222M369 172Q391 161 390 192Q389 217 376 230L365 222"/><path class="eg-head" d="M190 171Q185 69 280 68Q375 69 370 171L363 238Q344 293 280 312Q216 293 197 238Z"/><path class="eg-feature" d="M220 164Q243 152 262 161M298 161Q317 152 340 164M224 185Q242 196 261 184M299 184Q318 196 336 185M280 191L276 220Q280 226 287 222M263 256Q280 263 297 256"/><path class="eg-feature eg-orbit" d="M219 205Q241 216 261 203M299 203Q320 216 341 205"/>';
  }
  function sceneMarkup(state) {
    const {step}=state;const pts=step.points||[];const back=step.view==='back';
    const title=step.kind==='section'?`${step.title}位置及手部示意`:'自然坐姿与闭眼休息示意';
    const hands=pts.map(([x,y],i)=>hand(x,y,i,step.finger)).join('');
    const browPaths=step.id==='temple'?'<path class="eg-sweep-track" d="M260 151Q240 143 218 157M300 151Q320 143 342 157"/><g class="eg-sweep-knuckle" data-sweep="0"><rect x="-9" y="-7" width="18" height="14" rx="6"/><path d="M-3-5V5M3-5V5"/></g><g class="eg-sweep-knuckle" data-sweep="1"><rect x="-9" y="-7" width="18" height="14" rx="6"/><path d="M-3-5V5M3-5V5"/></g>':'';
    const footShape='<path class="eg-foot" d="M16 67Q6 51 9 36L9 27Q9 21 13 21Q17 21 18 27V22Q18 16 22 16Q26 16 26 22V18Q26 12 30 12Q34 12 34 18V16Q34 8 39 8Q44 8 44 16V22Q44 15 50 15Q56 15 56 23L54 45Q51 56 49 68Q33 77 16 67Z"/>';
    const feet=step.id==='ear'?`<g class="eg-feet" transform="translate(421 282)"><rect class="eg-inset-bg" x="-7" y="-13" width="114" height="109" rx="24"/><g transform="translate(0 8) scale(.82)">${footShape}</g><g transform="translate(105 8) scale(-.82 .82)">${footShape}</g><path class="eg-ground" d="M5 73H100"/><text class="eg-svg-caption" x="50" y="90" text-anchor="middle">脚趾轻抓 · 放松</text></g>`:'';
    const zoom=pts.length?`<g class="eg-detail"><rect class="eg-inset-bg" x="420" y="67" width="110" height="126" rx="24"/><svg x="428" y="75" width="94" height="94" viewBox="${pts[0][0]-25} ${pts[0][1]-25} 50 50" overflow="hidden">${face(back)}${hand(pts[0][0],pts[0][1],0,step.finger)}${point(pts[0][0],pts[0][1],2)}</svg><text class="eg-svg-caption" x="475" y="182" text-anchor="middle">指腹轻贴 · 局部放大</text></g>`:'';
    return `<svg class="eg-figure" viewBox="100 35 440 390" role="img" aria-label="${esc(title)}"><defs><linearGradient id="egSkin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fcfdfd"/><stop offset="1" stop-color="#dbe7eb"/></linearGradient><linearGradient id="egHand" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f7f9f6"/><stop offset="1" stop-color="#d7e3df"/></linearGradient></defs><ellipse class="eg-figure-glow" cx="280" cy="227" rx="174" ry="183"/>${face(back)}${hands}${browPaths}${pts.map(([x,y],i)=>point(x,y,i)).join('')}${zoom}${feet}</svg>`;
  }
  function bodyMarkup(state) {
    const {step}=state,section=step.kind==='section';
    return `<div class="eg-visual">${sceneMarkup(state)}<span class="eg-visual-label">${section?(step.view==='back'?'后侧示意':'正面示意'):'自然呼吸 · 肩膀放松'}</span></div><div class="eg-copy"><div class="eg-eyebrow">${section?`第 ${step.number} 节 / 共 6 节`:(step.kind==='prepare'?'开场 · 完整六节':'完成 · 稍作停留')}</div><h2>${esc(step.title)}</h2>${section?`<div class="eg-location"><span>找准位置</span><p>${esc(step.location)}</p></div><p class="eg-instruction">${esc(step.instruction)}</p><div class="eg-status"><span class="eg-status-label"></span><strong class="eg-current-action"></strong><span class="eg-stage-time"></span><span class="eg-countdown" role="status" aria-label="即将开始"></span></div><div class="eg-beats" aria-hidden="true">${Array.from({length:8},(_,i)=>`<i data-beat="${i+1}"></i>`).join('')}</div><p class="eg-count"></p><p class="eg-reminder">${esc(step.reminder)}</p>`:`<p class="eg-instruction">${esc(step.instructions[0])}</p><p class="eg-reminder eg-prepare-note">${esc(step.instructions[1])}</p><div class="eg-rest-breath" aria-hidden="true"><i></i><span>保持自然呼吸</span></div>`}<div class="eg-section-progress" aria-hidden="true">${Array.from({length:6},(_,i)=>`<span class="${section&&i<step.number-1?'done':section&&i===step.number-1?'current':''}"></span>`).join('')}</div></div>`;
  }
  function render(options={}) {
    const state=stateAt(options.state);return `<div class="eye-guide${options.reducedMotion?' eg-reduced':''}${options.paused?' eg-paused':''}" data-step="${state.step.id}">${bodyMarkup(state)}</div>`;
  }
  function mount(container,options={}) {destroy();mountNode=typeof container==='string'?document.querySelector(container):container;if(!mountNode)return false;mountNode.innerHTML=render(options);mounted=true;lastStage=stateAt(options.state).step.id;update(options);return true;}
  function update(options={}) {
    const state=stateAt(options.state);if(!mountNode||!mounted)return state;
    let root=mountNode.querySelector('.eye-guide');if(!root)return state;
    if(lastStage!==state.step.id){root.innerHTML=bodyMarkup(state);root.dataset.step=state.step.id;lastStage=state.step.id;}
    root.classList.toggle('eg-reduced',!!options.reducedMotion);root.classList.toggle('eg-paused',!!options.paused);root.classList.toggle('eg-practicing',state.practicing);root.classList.toggle('eg-counting',state.phase==='countdown');root.classList.toggle('eg-sweeping',state.sweep);root.dataset.phase=state.phase;
    const label=root.querySelector('.eg-status-label'),action=root.querySelector('.eg-current-action'),time=root.querySelector('.eg-stage-time'),count=root.querySelector('.eg-count'),countdown=root.querySelector('.eg-countdown');
    if(label)label.textContent=state.paused?'已暂停':state.practicing?'跟着节拍':state.phase==='countdown'?'准备开始':'手法讲解';
    if(action)action.textContent=state.practicing?state.action:state.phase==='countdown'?'轻贴指腹，准备跟练':'看清示意，找到位置';
    if(time)time.textContent=state.practicing?`${Math.ceil(state.remaining)} 秒`:'每节四个八拍';
    if(countdown)countdown.textContent=state.phase==='countdown'?String(state.countdown):'';
    if(count)count.textContent=state.practicing?`第 ${state.set} 个八拍 · ${state.beat}`:state.phase==='countdown'?'倒数结束后，直接跟随节拍':'讲解结束后倒数 2 秒开始';
    root.querySelectorAll('[data-beat]').forEach(n=>n.classList.toggle('active',state.practicing&&Number(n.dataset.beat)===state.beat));
    const moving=state.practicing&&!options.reducedMotion,theta=state.beatFraction*Math.PI*2;
    const dx=moving?Math.sin(theta)*1.8:0,dy=moving?Math.cos(theta)*1.8:0;
    root.querySelectorAll('[data-hand]').forEach(n=>{const press=state.step.id==='inner';n.setAttribute('transform',`translate(${press?0:dx} ${press?(moving?Math.sin(theta)*1.3:0):dy})`);});
    root.querySelectorAll('.eg-point-halo').forEach(n=>{n.setAttribute('r',String(moving?17+2*Math.sin(theta):17));});
    root.querySelectorAll('[data-sweep]').forEach(n=>{const i=Number(n.dataset.sweep),p=state.sweep?((state.beat-5+state.beatFraction)%2)/2:0;n.setAttribute('transform',`translate(${i===0?260-42*p:300+42*p} ${151-6*Math.sin(Math.PI*p)})`);});
    root.style.setProperty('--eg-beat-pressure',String(moving?.5+.5*Math.cos(theta):0));
    return state;
  }
  function destroy() {if(mountNode)mountNode.innerHTML='';mountNode=null;lastStage='';mounted=false;}
  const restTimeline=Object.freeze([
    {id:'blink',start:0,end:12,title:'自然地，完整眨几次眼',instruction:'不用挤眼，保持自己的舒服节奏。',voice:'自然地，完整眨几次眼，不用挤眼。',x:0,y:0},
    {id:'center',start:12,end:16,title:'头部放松，目光回到正前方',instruction:'只在舒服的小范围内移动，不追求极限。',voice:'头部放松，目光回到正前方。接下来只做舒服的小范围移动。',x:0,y:0},
    {id:'up',start:16,end:20,title:'目光轻轻向上',instruction:'不抬头，不用力；然后自然返回。',voice:'目光轻轻向上，不抬头，不用力。',x:0,y:-1},
    {id:'center-up',start:20,end:24,title:'回到正前方',instruction:'自然眨眼，不必保持凝视。',voice:'回到正前方，自然眨眼。',x:0,y:0},
    {id:'down',start:24,end:28,title:'目光轻轻向下',instruction:'只在舒服的范围，不低头。',voice:'目光轻轻向下，保持头部自然。',x:0,y:1},
    {id:'center-down',start:28,end:32,title:'回到正前方',instruction:'放松一下，保持自然呼吸。',voice:'回到正前方，放松一下。',x:0,y:0},
    {id:'left',start:32,end:36,title:'目光轻轻向左',instruction:'头不跟着转，不需要看得很远。',voice:'目光轻轻向左，头不跟着转。',x:-1,y:0},
    {id:'center-left',start:36,end:40,title:'回到正前方',instruction:'自然眨眼，不必保持凝视。',voice:'回到正前方，自然眨眼。',x:0,y:0},
    {id:'right',start:40,end:44,title:'目光轻轻向右',instruction:'小范围即可，不用追到边缘。',voice:'目光轻轻向右，小范围就好。',x:1,y:0},
    {id:'center-right',start:44,end:48,title:'回到正前方',instruction:'不舒服时可以直接闭眼休息。',voice:'回到正前方，放松一下。',x:0,y:0},
    {id:'close',start:48,end:Infinity,title:'现在，轻轻闭上眼睛',instruction:'休息片刻，结束时会轻柔提示。',voice:'现在轻轻闭上眼睛，休息一会儿。',x:0,y:0}
  ].map(Object.freeze));
  function restStateAt(elapsed=0){const e=Math.max(0,Number(elapsed)||0);const step=restTimeline.find(s=>e<s.end)||restTimeline[restTimeline.length-1];return {...step,elapsed:e,local:e-step.start};}
  window.PiankeEyeGuide=Object.freeze({timeline,totalDuration,sections:Object.freeze(sections),sources:Object.freeze(sources),createPacer,stateAt,render,mount,update,destroy,restTimeline,restStateAt,beatSeconds:BEAT_SECONDS,countdownSeconds:COUNTDOWN_SECONDS,practiceSeconds:PRACTICE_SECONDS,version:'six-section-speech-paced-2026-10-18'});
})();
