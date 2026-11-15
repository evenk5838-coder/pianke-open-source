/* Selected, locally bundled recordings. HTMLAudio deliberately bypasses the
   Web Audio graph: WKWebView file:// media must not depend on CORS routing. */
(() => {
  'use strict';
  const TRACKS = Object.freeze({
    A01: {file:'A01.m4a',crossfade:2}, A02: {file:'A02.m4a',crossfade:2},
    A03: {file:'A03.m4a',crossfade:.8}, A04: {file:'A04.m4a',crossfade:2},
    A05: {file:'A05.m4a',crossfade:2}, A06: {file:'A06.m4a',crossfade:3},
    A07: {file:'A07.m4a',crossfade:2},
    M01: {file:'M01.m4a',crossfade:3}, M02: {file:'M02.m4a',crossfade:3},
    M03: {file:'M03.m4a',crossfade:3}, M04: {file:'M04.m4a',crossfade:3}
  });
  const bounded = (n, fallback=0) => Number.isFinite(+n) ? Math.max(0,Math.min(1,+n)) : fallback;

  function start({id,volume=0,level=.7,paused=false,onError=()=>{}}={}) {
    const track=TRACKS[id];
    if(!track)return null;
    const players=[new Audio(),new Audio()];
    let disposed=false,failed=false,playing=false,epoch=0,active=0,pending=null,transition=null;
    let timer=0,releaseTimer=0,lastTick=performance.now(),gain=0,duck=false;
    let masterVolume=bounded(volume),backgroundLevel=bounded(level,.7);
    const weights=[1,0];
    const targetGain=()=>masterVolume*backgroundLevel*(duck ? .28 : 1);
    const apply=()=>players.forEach((p,i)=>{p.volume=bounded(gain*weights[i]);});
    const resetInactive=i=>{players[i].pause();weights[i]=0;};
    const wanted=i=>i===active||i===pending||transition?.to===i;
    const fail=error=>{
      if(disposed||failed)return;
      failed=true;playing=false;epoch++;clearInterval(timer);timer=0;
      players.forEach(p=>{p.volume=0;p.pause();});
      onError(error);
    };
    async function play(i,token) {
      try {
        await players[i].play();
        // A settled old play() must never re-enable a paused/disposed player,
        // or pause a newer valid play request on the same media element.
        if(disposed||!playing||!wanted(i)){players[i].pause();return false;}
        return token===epoch;
      } catch(error) {
        if(!disposed&&playing&&token===epoch&&wanted(i))fail(error);
        return false;
      }
    }
    function nextLoop() {
      if(!playing||disposed||failed||transition||pending!==null)return;
      const from=active,to=1-active,token=epoch;
      pending=to;weights[to]=0;players[to].volume=0;
      try{players[to].currentTime=0;}catch{}
      play(to,token).then(ok=>{
        if(!ok||disposed||!playing||token!==epoch||pending!==to)return;
        pending=null;
        const remaining=Math.max(0,players[from].duration-players[from].currentTime);
        transition={from,to,elapsed:0,duration:Math.min(track.crossfade,remaining||.15)};
      });
    }
    function tick() {
      if(disposed||!playing||failed)return;
      const now=performance.now(),dt=Math.min(.2,Math.max(0,(now-lastTick)/1000));lastTick=now;
      const target=targetGain();
      gain += (target-gain)*(1-Math.exp(-dt/(target<gain ? .24 : 1.25)));
      if(transition){
        transition.elapsed+=dt;
        const progress=Math.min(1,transition.elapsed/Math.max(.05,transition.duration));
        // Linear overlap avoids a level bump when the same recording correlates.
        weights[transition.from]=1-progress;weights[transition.to]=progress;
        if(progress>=1){resetInactive(transition.from);active=transition.to;transition=null;}
      }else{
        const p=players[active];
        if(Number.isFinite(p.duration)&&p.duration>0&&p.duration-p.currentTime<=Math.min(track.crossfade,p.duration*.25))nextLoop();
      }
      apply();
    }
    async function resume() {
      if(disposed||failed||playing)return false;
      playing=true;const token=++epoch;gain=0;apply();lastTick=performance.now();
      if(!timer)timer=setInterval(tick,40);
      const indices=transition?[transition.from,transition.to]:[active];
      const results=await Promise.all(indices.map(i=>play(i,token)));
      return token===epoch&&playing&&results.every(Boolean);
    }
    function pause() {
      if(disposed)return;
      playing=false;epoch++;clearInterval(timer);timer=0;
      if(pending!==null){resetInactive(pending);pending=null;}
      players.forEach(p=>{p.pause();p.volume=0;});gain=0;
    }
    function release() {
      clearInterval(timer);clearTimeout(releaseTimer);timer=0;
      players.forEach(p=>{p.volume=0;p.pause();p.removeAttribute('src');p.load();});
    }
    function stop({immediate=false}={}) {
      if(disposed)return;
      disposed=true;epoch++;clearInterval(timer);timer=0;
      players.forEach(p=>{p.onerror=null;p.onended=null;});
      if(immediate||!playing||masterVolume===0){release();return;}
      const initial=players.map(p=>p.volume),started=performance.now();
      timer=setInterval(()=>{
        const remaining=Math.max(0,1-(performance.now()-started)/180);
        players.forEach((p,i)=>{p.volume=initial[i]*remaining;});
        if(!remaining)release();
      },20);
      releaseTimer=setTimeout(release,220);
    }
    players.forEach(p=>{
      p.preload='auto';p.loop=false;p.volume=0;
      p.setAttribute('playsinline','');
      p.src=`assets/audio/${track.file}`;
      p.onerror=()=>fail(new Error(`Unable to load ${id}`));
      p.onended=()=>{if(p===players[active]&&playing&&!transition)nextLoop();};
      p.load();
    });
    const api={
      pause,resume,stop,
      setVolume(value){masterVolume=bounded(value);if(masterVolume===0){gain=0;apply();}},
      setLevel(value){backgroundLevel=bounded(value);if(backgroundLevel===0){gain=0;apply();}},
      setDucking(value){duck=!!value;},
      diagnostics(){return {track:id,playing,disposed,failed,ducking:duck,volume:masterVolume,level:backgroundLevel,crossfading:!!transition,players:players.map(p=>({paused:p.paused,time:p.currentTime,duration:Number.isFinite(p.duration)?p.duration:null,volume:p.volume,readyState:p.readyState}))};}
    };
    if(!paused)resume();
    return api;
  }
  window.PiankeRecordedAudio=Object.freeze({start,tracks:TRACKS});
})();
