/*
 * 片刻 · Original procedural ambience, 2026.
 * No recordings, third-party samples, remote services, or therapeutic claims.
 * All musical and environmental timing follows AudioContext.currentTime.
 * The host owns AudioContext suspend/resume and the user's volume control.
 */
(function () {
  'use strict';

  var cache = new WeakMap();
  var SCENES = Object.freeze({
    water: '水波 · 合成环境声',
    rain: '细雨 · 合成环境声',
    wind: '微风 · 合成环境声',
    leaves: '树叶 · 合成环境声',
    fire: '篝火 · 合成环境声',
    night: '夜间 · 合成环境声'
  });

  function clamp(value, min, max, fallback) {
    return typeof value === 'number' && isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  }

  function randomGenerator(seed) {
    return function () {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 4294967296;
    };
  }

  function resources(ctx) {
    var saved = cache.get(ctx);
    if (saved) return saved;
    // A short mono buffer is shared across starts. No long impulse is generated.
    var length = Math.round(ctx.sampleRate * 2.75);
    var white = ctx.createBuffer(1, length, ctx.sampleRate);
    var soft = ctx.createBuffer(1, length, ctx.sampleRate);
    var drift = ctx.createBuffer(1, length, ctx.sampleRate);
    var w = white.getChannelData(0);
    var s = soft.getChannelData(0);
    var d = drift.getChannelData(0);
    var rand = randomGenerator(183741125);
    var slow = 0;
    var slower = 0;
    var low = 0;
    var sum = 0;
    for (var i = 0; i < length; i++) {
      var noise = rand() * 2 - 1;
      slow += (noise - slow) * 0.13;
      slower += (noise - slower) * 0.014;
      low = low * 0.997 + noise * 0.017;
      w[i] = noise;
      s[i] = noise * 0.17 + slow * 0.85 + slower * 1.30;
      d[i] = low;
      sum += low;
    }
    var mean = sum / length;
    var start = d[0] - mean;
    var end = d[length - 1] - mean;
    var peak = 0;
    for (var j = 0; j < length; j++) {
      // Remove the end-to-start step so low wind has no loop-edge click.
      d[j] = d[j] - mean - (start + (end - start) * j / (length - 1));
      peak = Math.max(peak, Math.abs(d[j]));
    }
    var normal = peak > 0 ? 0.8 / peak : 1;
    for (var k = 0; k < length; k++) d[k] *= normal;
    var real = new Float32Array(6);
    var imag = new Float32Array([0, 1, 0.14, 0.045, 0.013, 0.004]);
    var wave = typeof ctx.createPeriodicWave === 'function' ? ctx.createPeriodicWave(real, imag) : null;
    saved = { white: white, soft: soft, drift: drift, wave: wave };
    cache.set(ctx, saved);
    return saved;
  }

  function start(ctx, destination, options) {
    options = options || {};
    if (!ctx || !destination || typeof ctx.createGain !== 'function') {
      throw new TypeError('PiankeAmbience needs an AudioContext and destination AudioNode.');
    }
    var requestedScene = options.scene;
    var scene = Object.prototype.hasOwnProperty.call(SCENES, requestedScene) ? requestedScene : null;
    var kind = options.kind || 'ambient';
    if (!scene && (kind === 'nature' || kind === 'environment' || kind === 'wind')) scene = kind === 'wind' ? 'wind' : 'water';
    var stopped = false;
    var released = false;
    var timer = null;
    var cleanupTimer = null;
    var nodes = new Set();
    var sources = new Set();
    var currentDucking = 1;
    var owned = resources(ctx);
    var rand = randomGenerator((Date.now() ^ Math.floor(ctx.currentTime * 1000)) | 1);
    var now = ctx.currentTime;

    function own(node) { nodes.add(node); return node; }
    function source(node) { sources.add(node); return own(node); }
    function gain(value) {
      var node = own(ctx.createGain());
      node.gain.value = value;
      return node;
    }
    function filter(type, frequency, q) {
      var node = own(ctx.createBiquadFilter());
      node.type = type;
      node.frequency.value = frequency;
      node.Q.value = q == null ? 0.7 : q;
      return node;
    }
    function pan(value) {
      if (typeof ctx.createStereoPanner !== 'function') return gain(1);
      var node = own(ctx.createStereoPanner());
      node.pan.value = value;
      return node;
    }
    function dispose(group) {
      group.forEach(function (node) {
        sources.delete(node);
        nodes.delete(node);
        try { node.disconnect(); } catch (_) {}
      });
    }
    function afterEnd(ending, group) {
      ending.onended = function () { dispose(group); };
    }
    function oscillator(frequency, type) {
      var node = source(ctx.createOscillator());
      node.type = type || 'sine';
      node.frequency.value = frequency;
      return node;
    }
    function loop(bufferName, out, rate) {
      var node = source(ctx.createBufferSource());
      node.buffer = owned[bufferName];
      node.loop = true;
      node.playbackRate.value = rate || 1;
      node.connect(out);
      node.start(now, rand() * node.buffer.duration);
      return node;
    }
    function lfo(param, speed, depth) {
      var node = oscillator(speed);
      var amount = gain(depth);
      node.connect(amount);
      amount.connect(param);
      node.start(now);
      return node;
    }

    var input = gain(1);
    var dry = gain(scene ? 0.92 : 0.84);
    var send = gain(scene ? 0.10 : kind === 'soft' ? 0.33 : 0.29);
    var sum = gain(1);
    var highpass = filter('highpass', scene === 'fire' ? 65 : 92, 0.5);
    var lowpass = filter('lowpass', scene ? 7600 : 4500, 0.6);
    var compressor = own(ctx.createDynamicsCompressor());
    compressor.threshold.value = -20;
    compressor.knee.value = 3;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.008;
    compressor.release.value = 0.55;
    var duck = gain(1);
    var output = gain(0);
    input.connect(dry);
    dry.connect(sum);
    input.connect(send);
    sum.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(compressor);
    compressor.connect(duck);
    duck.connect(output);
    output.connect(destination);
    // This is a quiet source mix, not a loud master needing extreme attenuation.
    output.gain.setValueAtTime(0, now);
    output.gain.linearRampToValueAtTime(0.82, now + 1.8);

    // Four filtered feedback paths make a soft, diffuse tail without a generated
    // convolution impulse. Feedback remains well below unity in every branch.
    [0.173, 0.313, 0.457, 0.593].forEach(function (seconds, index) {
      var delay = own(ctx.createDelay(1));
      delay.delayTime.value = seconds;
      var damping = filter('lowpass', 2200 - index * 260, 0.45);
      var feedback = gain(0.40 + (index % 2) * 0.025);
      var wet = gain(0.19);
      var stereo = pan(index % 2 ? 0.55 : -0.55);
      send.connect(delay);
      delay.connect(damping);
      damping.connect(feedback);
      feedback.connect(delay);
      damping.connect(wet);
      wet.connect(stereo);
      stereo.connect(sum);
    });

    function transientNoise(at, duration, level, type, frequency, q, stereo) {
      if (stopped) return;
      var node = source(ctx.createBufferSource());
      node.buffer = owned.white;
      var tone = filter(type || 'bandpass', frequency || 2000, q || 0.65);
      var envelope = gain(0);
      var panner = pan(stereo || 0);
      node.connect(tone);
      tone.connect(envelope);
      envelope.connect(panner);
      panner.connect(input);
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(level, at + Math.min(0.05, duration * 0.16));
      envelope.gain.exponentialRampToValueAtTime(0.00001, at + duration);
      node.start(at, rand() * (owned.white.duration - duration - 0.01));
      node.stop(at + duration + 0.02);
      afterEnd(node, [node, tone, envelope, panner]);
    }

    function pluck(at, midi, level, duration, stereo) {
      if (stopped) return;
      var frequency = 440 * Math.pow(2, (midi - 69) / 12);
      var fundamental = oscillator(frequency);
      var overtone = oscillator(frequency * 2.002);
      var softHarmonic = gain(0.14);
      var envelope = gain(0);
      var tone = filter('lowpass', 1800, 0.55);
      var panner = pan(stereo);
      fundamental.connect(envelope);
      overtone.connect(softHarmonic);
      softHarmonic.connect(envelope);
      envelope.connect(tone);
      tone.connect(panner);
      panner.connect(input);
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(level, at + 0.028);
      envelope.gain.exponentialRampToValueAtTime(0.00001, at + duration);
      fundamental.start(at);
      overtone.start(at);
      fundamental.stop(at + duration + 0.03);
      overtone.stop(at + duration + 0.03);
      afterEnd(fundamental, [fundamental, overtone, softHarmonic, envelope, tone, panner]);
    }

    var chords = [[50, 57, 60, 64], [48, 55, 60, 64], [43, 55, 59, 62], [45, 52, 57, 62]];
    var chordIndex = 0;
    function pad(at) {
      var notes = chords[chordIndex++ % chords.length];
      notes.forEach(function (midi, index) {
        var note = oscillator(440 * Math.pow(2, (midi - 69) / 12));
        if (owned.wave) note.setPeriodicWave(owned.wave);
        note.detune.value = [-2.2, 1.8, -0.7, 2.3][index];
        var envelope = gain(0);
        var tone = filter('lowpass', kind === 'soft' ? 950 : 1450, 0.4);
        var panner = pan([-0.38, 0.24, -0.12, 0.4][index]);
        note.connect(envelope);
        envelope.connect(tone);
        tone.connect(panner);
        panner.connect(input);
        var peak = (kind === 'soft' ? 0.016 : 0.018) * (index === 0 ? 1.05 : 1);
        envelope.gain.setValueAtTime(0, at);
        envelope.gain.linearRampToValueAtTime(peak * 0.65, at + 4.8);
        envelope.gain.linearRampToValueAtTime(peak, at + 9.5);
        envelope.gain.linearRampToValueAtTime(peak * 0.72, at + 21);
        envelope.gain.exponentialRampToValueAtTime(0.00001, at + 32);
        tone.frequency.setValueAtTime(kind === 'soft' ? 650 : 900, at);
        tone.frequency.linearRampToValueAtTime(kind === 'soft' ? 1150 : 1750, at + 15);
        tone.frequency.linearRampToValueAtTime(620, at + 32);
        note.start(at);
        note.stop(at + 32.05);
        afterEnd(note, [note, envelope, tone, panner]);
      });
    }

    function continuousNoise(bufferName, type, frequency, level, speed, depth, stereo, playbackRate) {
      var tone = filter(type, frequency, 0.5);
      var envelope = gain(level);
      var panner = pan(stereo || 0);
      loop(bufferName, tone, playbackRate);
      tone.connect(envelope);
      envelope.connect(panner);
      panner.connect(input);
      if (speed && depth) lfo(envelope.gain, speed, level * depth);
      return { filter: tone, envelope: envelope };
    }

    if (!scene) {
      // A barely audible breath of texture joins the sustained harmonic field.
      continuousNoise('soft', 'lowpass', 460, 0.015, 0.027, 0.34, -0.15, 0.79);
    } else if (scene === 'water') {
      var water = continuousNoise('soft', 'lowpass', 820, 0.085, 0.072, 0.44, -0.3, 0.81);
      lfo(water.filter.frequency, 0.039, 260);
      continuousNoise('white', 'bandpass', 1680, 0.027, 0.113, 0.62, 0.36, 0.93);
    } else if (scene === 'rain') {
      continuousNoise('white', 'lowpass', 6200, 0.078, 0.019, 0.10, -0.42, 0.97);
      continuousNoise('white', 'highpass', 1600, 0.035, 0.027, 0.14, 0.44, 0.83);
    } else if (scene === 'wind') {
      var wind = continuousNoise('drift', 'lowpass', 720, 0.14, 0.041, 0.58, -0.24, 0.65);
      lfo(wind.filter.frequency, 0.023, 390);
      continuousNoise('soft', 'bandpass', 1150, 0.035, 0.033, 0.72, 0.31, 0.73);
    } else if (scene === 'leaves') {
      continuousNoise('white', 'highpass', 1550, 0.015, 0.037, 0.70, 0, 0.72);
    } else if (scene === 'fire') {
      continuousNoise('drift', 'lowpass', 540, 0.15, 0.084, 0.24, -0.1, 0.76);
      continuousNoise('soft', 'bandpass', 1350, 0.048, 0.13, 0.43, 0.2, 0.88);
    } else if (scene === 'night') {
      continuousNoise('soft', 'lowpass', 640, 0.027, 0.031, 0.32, -0.26, 0.70);
      continuousNoise('white', 'bandpass', 3800, 0.006, 0.063, 0.48, 0.35, 0.82);
    }

    function environmentalEvent(at) {
      var side = (rand() * 2 - 1) * 0.6;
      if (scene === 'water') {
        // Irregular filtered swells, not a repeated pitched "water" melody.
        transientNoise(at, 0.7 + rand() * 0.55, 0.035 + rand() * 0.02, 'bandpass', 480 + rand() * 850, 1.4, side);
        return 3.8 + rand() * 5.2;
      }
      if (scene === 'rain') {
        transientNoise(at, 0.08 + rand() * 0.16, 0.010 + rand() * 0.018, 'bandpass', 2200 + rand() * 2600, 0.75, side);
        return 0.55 + rand() * 1.5;
      }
      if (scene === 'wind') {
        transientNoise(at, 1.25 + rand() * 0.35, 0.035, 'lowpass', 450 + rand() * 250, 0.55, side);
        return 10 + rand() * 11;
      }
      if (scene === 'leaves') {
        transientNoise(at, 0.38 + rand() * 0.85, 0.045 + rand() * 0.045, 'bandpass', 2100 + rand() * 1700, 0.55, side);
        return 1.35 + rand() * 3.1;
      }
      if (scene === 'fire') {
        transientNoise(at, 0.025 + rand() * 0.15, 0.018 + rand() * 0.037, 'bandpass', 1100 + rand() * 2300, 0.65, side);
        if (rand() < 0.28) transientNoise(at + 0.09, 0.045, 0.018, 'highpass', 2600, 0.5, -side);
        return 0.4 + rand() * 1.7;
      }
      // A distant, quiet insect-like phrase is synthetic and deliberately sparse.
      var frequency = 1750 + rand() * 520;
      var tone = oscillator(frequency);
      var flutter = oscillator(27 + rand() * 10);
      var flutterDepth = gain(0.35);
      var flutterGain = gain(0.65);
      var envelope = gain(0);
      var panner = pan(side);
      tone.connect(flutterGain);
      flutter.connect(flutterDepth);
      flutterDepth.connect(flutterGain.gain);
      flutterGain.connect(envelope);
      envelope.connect(panner);
      panner.connect(input);
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(0.010, at + 0.12);
      envelope.gain.setValueAtTime(0.010, at + 0.56);
      envelope.gain.linearRampToValueAtTime(0, at + 0.83);
      tone.start(at);
      flutter.start(at);
      tone.stop(at + 0.85);
      flutter.stop(at + 0.85);
      afterEnd(tone, [tone, flutter, flutterDepth, flutterGain, envelope, panner]);
      return 5.5 + rand() * 8.5;
    }

    var nextPad = now + 0.06;
    var nextEvent = now + (scene ? 0.8 + rand() * 1.1 : 8.5 + rand() * 4);
    function schedule() {
      if (stopped || ctx.state === 'closed' || ctx.state === 'suspended') return;
      var current = ctx.currentTime;
      var horizon = current + 0.7;
      if (!scene && nextPad < horizon) {
        pad(Math.max(nextPad, current + 0.035));
        nextPad = Math.max(nextPad + 19, current + 19);
      }
      if (nextEvent < horizon) {
        var at = Math.max(nextEvent, current + 0.035);
        if (scene) nextEvent = at + environmentalEvent(at);
        else {
          var currentChord = chords[Math.max(0, chordIndex - 1) % chords.length];
          var midi = currentChord[1 + Math.floor(rand() * 3)] + 12;
          pluck(at, midi, kind === 'soft' ? 0.014 : 0.020, 5.4 + rand() * 2, (rand() - 0.5) * 0.7);
          nextEvent = at + (kind === 'soft' ? 16 : 11) + rand() * 11;
        }
      }
    }
    // A suspended AudioContext has a frozen currentTime, so no phrase, noise
    // envelope, or musical position advances while the host pauses practice.
    schedule();
    timer = setInterval(schedule, 250);

    function release() {
      if (released) return;
      released = true;
      if (timer != null) clearInterval(timer);
      if (cleanupTimer != null) clearTimeout(cleanupTimer);
      timer = cleanupTimer = null;
      sources.forEach(function (node) {
        node.onended = null;
        try { node.stop(); } catch (_) {}
      });
      nodes.forEach(function (node) { try { node.disconnect(); } catch (_) {} });
      sources.clear();
      nodes.clear();
    }

    return {
      kind: scene ? 'environment' : kind,
      scene: scene,
      label: scene ? SCENES[scene] : kind === 'soft' ? '柔和音垫 · 原创程序配乐' : '缓慢和声 · 原创程序配乐',
      setDucking: function (value) {
        if (stopped) return;
        var factor = typeof value === 'boolean' ? (value ? 0.30 : 1) : clamp(value, 0, 1, 1);
        var current = ctx.currentTime;
        duck.gain.cancelScheduledValues(current);
        duck.gain.setValueAtTime(duck.gain.value, current);
        duck.gain.linearRampToValueAtTime(factor, current + (factor < currentDucking ? 0.22 : 0.95));
        currentDucking = factor;
      },
      stop: function (immediate) {
        if (stopped) { if (immediate) release(); return; }
        stopped = true;
        if (timer != null) clearInterval(timer);
        timer = null;
        if (immediate || ctx.state !== 'running') { release(); return; }
        var current = ctx.currentTime;
        output.gain.cancelScheduledValues(current);
        output.gain.setValueAtTime(output.gain.value, current);
        output.gain.linearRampToValueAtTime(0, current + 0.065);
        // This short cleanup runs even if the host suspends immediately after
        // stop; it is cleared when release completes. No scheduler survives.
        cleanupTimer = setTimeout(release, 95);
      },
      inspect: function () {
        return { stopped: stopped, released: released, nodes: nodes.size, sources: sources.size, scheduled: timer != null, scene: scene };
      }
    };
  }

  window.PiankeAmbience = Object.freeze({ start: start, scenes: SCENES });
}());
