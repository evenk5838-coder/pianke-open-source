/* Fixed, locally bundled AI narration. Preserve the generated recording at 1x. */
(() => {
  'use strict';
  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  function create({recordings = {}, createAudio = src => new Audio(src), onActivity = () => {}} = {}) {
    let current = null, serial = 0;
    const valid = item => current === item && !item.settled;
    function activity(item, active) {
      if (!valid(item)) return;
      item.active = active;
      onActivity(active);
    }
    function release(item) {
      item.audio.pause();
      item.audio.removeAttribute('src');
      item.audio.load();
    }
    function stop() {
      const item = current;
      if (!item) return;
      current = null; item.settled = true; serial++;
      onActivity(false); release(item);
    }
    function play(text, {volume = 1, onstart, onfinish} = {}) {
      stop();
      const entry = recordings[text];
      if (!entry || !entry.src) {
        onfinish?.('error', 'recording-missing');
        return null;
      }
      let audio;
      try { audio = createAudio(entry.src); }
      catch { onfinish?.('error', 'audio-unavailable'); return null; }
      const item = {audio, entry, text, token: ++serial, settled: false, started: false, active: false, paused: false, playAttempt: 0};
      current = item;
      audio.preload = 'auto'; audio.loop = false;
      audio.defaultPlaybackRate = 1; audio.playbackRate = 1; audio.volume = clamp(volume);
      const finish = (reason, error) => {
        if (!valid(item)) return;
        current = null; item.settled = true; onActivity(false); release(item);
        onfinish?.(reason, error);
      };
      audio.onplaying = () => {
        if (!valid(item)) return;
        // play() may resolve after a pause or host hide. Never resume implicitly.
        if (item.paused) { audio.pause(); return; }
        activity(item, true);
        if (!item.started) { item.started = true; onstart?.(); }
      };
      audio.onended = () => finish('end');
      audio.onerror = () => finish('error', 'recording-unavailable');
      function begin() {
        if (!valid(item) || item.paused) return false;
        const attempt = ++item.playAttempt;
        audio.playbackRate = 1;
        try {
          Promise.resolve(audio.play()).catch(() => {
            if (valid(item) && !item.paused && attempt === item.playAttempt) finish('error', 'playback-blocked');
          });
        } catch { finish('error', 'playback-blocked'); }
        return valid(item);
      }
      item.begin = begin;
      begin();
      return {cancel() { if (valid(item)) stop(); }};
    }
    function pause() {
      if (!current) return false;
      current.paused = true; current.playAttempt++;
      current.audio.pause(); activity(current, false);
      return true;
    }
    function resume() {
      if (!current) return false;
      current.paused = false;
      return current.begin();
    }
    function setVolume(value) { if (current) current.audio.volume = clamp(value); }
    function diagnostics() {
      return current ? {id: current.entry.id, src: current.entry.src, state: current.paused ? 'paused' : current.active ? 'playing' : 'loading', currentTime: current.audio.currentTime, duration: current.audio.duration, playbackRate: current.audio.playbackRate, volume: current.audio.volume} : null;
    }
    return Object.freeze({play, stop, pause, resume, setVolume, diagnostics, has: text => !!recordings[text]});
  }
  window.PiankeFixedVoice = Object.freeze({create});
})();
