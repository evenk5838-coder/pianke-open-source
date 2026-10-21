/*
 * 片刻 · Real-time ambient motion
 * Original procedural artwork. No image, video, font, network, or third-party code.
 * elapsed is active practice time in seconds. The host owns the animation clock.
 */
(function () {
  'use strict';

  var VERTEX = [
    'attribute vec2 aPosition;',
    'void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }'
  ].join('\n');

  var FRAGMENT = [
    'precision highp float;',
    'uniform vec2 uResolution;',
    'uniform float uTime;',
    'uniform float uHue;',
    'uniform float uStyle;',
    'uniform float uInhale;',
    'uniform float uExhale;',
    'uniform float uDark;',
    'const float PI = 3.14159265359;',
    'float hash21(vec2 p) {',
    '  p = fract(p * vec2(123.34, 456.21));',
    '  p += dot(p, p + 45.32);',
    '  return fract(p.x * p.y);',
    '}',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),',
    '             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + 1.0), f.x), f.y);',
    '}',
    'float fbm(vec2 p) {',
    '  float value = 0.0;',
    '  float amplitude = 0.53;',
    '  mat2 turn = mat2(0.80, -0.60, 0.60, 0.80);',
    '  for (int i = 0; i < 4; i++) {',
    '    value += amplitude * noise(p);',
    '    p = turn * p * 2.06 + vec2(9.3, 7.1);',
    '    amplitude *= 0.48;',
    '  }',
    '  return value;',
    '}',
    'vec3 hsl(float h, float s, float l) {',
    '  vec3 v = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);',
    '  return l + s * (v - 0.5) * (1.0 - abs(2.0 * l - 1.0));',
    '}',
    'float bell(float d, float width) { return exp(-d * d / (width * width)); }',
    'vec4 breathing(float t) {',
    '  float cycle = uInhale + uExhale;',
    '  float local = mod(t, cycle);',
    '  float ip = clamp(local / uInhale, 0.0, 1.0);',
    '  float ep = clamp((local - uInhale) / uExhale, 0.0, 1.0);',
    '  float expansion = ip * ip * (3.0 - 2.0 * ip);',
    '  float release = ep * ep * (3.0 - 2.0 * ep);',
    '  float presence = smoothstep(0.0, 0.16, ip) * (1.0 - smoothstep(0.24, 1.0, ep));',
    '  float phaseClock = floor(t / cycle) + (local < uInhale ? ip * 0.5 : 0.5 + ep * 0.5);',
    '  return vec4(expansion, release, presence, phaseClock);',
    '}',
    'vec3 background(vec2 p) {',
    '  vec3 c = hsl(uHue, 0.32, 0.955);',
    '  float blue = exp(-dot(p - vec2(-0.67, 0.31), p - vec2(-0.67, 0.31)) / 0.66);',
    '  float lilac = exp(-dot(p - vec2(0.72, -0.38), p - vec2(0.72, -0.38)) / 0.72);',
    '  float pearl = exp(-dot(p - vec2(0.06, 0.10), p - vec2(0.06, 0.10)) / 0.24);',
    '  c = mix(c, hsl(uHue, 0.40, 0.861), blue * 0.49);',
    '  c = mix(c, hsl(uHue + 0.095, 0.32, 0.881), lilac * 0.37);',
    '  c = mix(c, vec3(0.986, 0.989, 0.997), pearl * 0.45);',
    '  vec3 dusk = hsl(uHue, 0.22, 0.135);',
    '  dusk = mix(dusk, hsl(uHue, 0.26, 0.217), blue * 0.57);',
    '  dusk = mix(dusk, hsl(uHue + 0.095, 0.24, 0.207), lilac * 0.44);',
    '  dusk = mix(dusk, hsl(uHue, 0.20, 0.248), pearl * 0.30);',
    '  return mix(c, dusk, uDark);',
    '}',
    'vec3 ripples(vec2 p, vec3 c, float t) {',
    '  float r = length(p);',
    '  float refraction = 0.0;',
    '  float light = 0.0;',
    '  float shade = 0.0;',
    '  vec4 breath = breathing(t);',
    '  for (int i = 0; i < 3; i++) {',
    '    float echo = float(i);',
    '    float radius = 0.080 + (0.290 - echo * 0.086) * breath.x + 0.205 * breath.y;',
    '    float width = 0.023 + breath.x * 0.016 + breath.y * 0.018;',
    '    float life = breath.z * pow(0.55, echo);',
    '    float bend = (noise(p * 3.4 + vec2(breath.w * 0.09, 2.1)) - 0.5) * 0.004;',
    '    float d = r - radius + bend;',
    '    light += bell(d + width * 0.23, width * 0.72) * life;',
    '    shade += bell(d - width * 0.72, width * 0.91) * life;',
    '    refraction += (d / width) * bell(d, width * 1.55) * life;',
    '  }',
    '  vec2 normal = p / max(r, 0.001);',
    '  c = background(p + normal * refraction * 0.021);',
    '  c -= hsl(uHue, 0.25, 0.66) * shade * 0.060;',
    '  c = mix(c, vec3(1.0), clamp(light * mix(0.76, 0.14, uDark), 0.0, 0.86));',
    '  c += vec3(0.005, 0.007, 0.009) * light;',
    '  return c;',
    '}',
    'vec3 smoke(vec2 p, vec3 c, float t) {',
    '  // A single open torus, viewed straight down. Cartesian domain warping',
    '  // avoids evenly repeated petals or a radial flower silhouette.',
    '  vec4 breath = breathing(t);',
    '  float radius = 0.070 + 0.300 * breath.x + 0.205 * breath.y;',
    '  float life = breath.z;',
    '  vec2 drift = vec2(breath.w * 0.10, -breath.w * 0.06);',
    '  float broad = fbm(p * 3.6 + drift + vec2(1.5, 8.2));',
    '  float cross = fbm(p * 4.1 - drift * 0.70 + vec2(17.2, 2.8));',
    '  vec2 q = p + vec2(broad - 0.48, cross - 0.48) * 0.071;',
    '  float flow = fbm(q * 10.3 + vec2(cross, broad) * 2.4 + drift * 1.45);',
    '  float fine = noise(q * 20.0 + vec2(flow, cross) * 2.6 - drift * 1.8);',
    '  float r = length(q);',
    '  float d = r - radius + (broad - 0.47) * 0.034;',
    '  float width = 0.014 + breath.x * 0.015 + breath.y * 0.021;',
    '  float cover = smoothstep(0.19, 0.69, cross * 0.51 + flow * 0.49);',
    '  float body = bell(d + (flow - 0.5) * 0.040, width);',
    '  float strand = bell(d + (fine - 0.46) * 0.052, width * 0.58);',
    '  float outside = bell(d - 0.026 + (flow - 0.5) * 0.079, width * 0.66);',
    '  float haze = bell(d, width * 2.65);',
    '  float density = (body * 0.51 + strand * 0.20 + outside * 0.12 + haze * 0.15) * cover * life;',
    '  // The blue-grey shadow is broad and restrained; highlights stay diffuse.',
    '  float shadow = bell(d - 0.016, width * 1.72) * cover * life;',
    '  c -= hsl(uHue, 0.22, 0.66) * shadow * 0.025;',
    '  c = mix(c, vec3(0.999, 0.999, 1.0), clamp(density * mix(1.45, 0.22, uDark), 0.0, 0.91));',
    '  return c;',
    '}',
    'void main() {',
    '  // Both axes use the same physical-pixel unit: circles remain circular.',
    '  vec2 p = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y);',
    '  vec3 c = background(p);',
    '  if (uStyle < 0.5) c = ripples(p, c, uTime);',
    '  else c = smoke(p, c, uTime);',
    '  float grain = (hash21(gl_FragCoord.xy) - 0.5) * 0.0017;',
    '  gl_FragColor = vec4(clamp(c + grain, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  function finite(value, fallback) {
    return typeof value === 'number' && isFinite(value) ? value : fallback;
  }

  function smooth(a, b, x) {
    var v = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return v * v * (3 - 2 * v);
  }

  function breathState(time, inhale, exhale) {
    var cycle = inhale + exhale;
    var local = time % cycle;
    var isInhale = local < inhale;
    var ip = Math.max(0, Math.min(1, local / inhale));
    var ep = Math.max(0, Math.min(1, (local - inhale) / exhale));
    var release = smooth(0, 1, ep);
    return {
      phase: isInhale ? 'inhale' : 'exhale',
      phaseProgress: isInhale ? ip : ep,
      expansion: smooth(0, 1, ip),
      release: release,
      presence: smooth(0, 0.16, ip) * (1 - smooth(0.24, 1, ep)),
      phaseClock: Math.floor(time / cycle) + (isInhale ? ip * 0.5 : 0.5 + ep * 0.5)
    };
  }

  function PiankeMotion(canvas) {
    this.canvas = canvas;
    this.supported = false;
    this.backend = 'unavailable';
    this.error = null;
    this.width = 0;
    this.height = 0;
    this.renderScale = 1;
    this._gl = null;
    this._program = null;
    this._buffer = null;
    this._uniforms = null;
    this._ctx = null;
    this._fallbackCanvas = null;
    this._destroyed = false;
    this._lost = false;
    this._last = null;
    // Inspection only: elapsed is the effective time sent to the renderer,
    // including the settled exhale composition used for reduced motion.
    this.lastDraw = null;
    this._originalVisibility = canvas && canvas.style ? canvas.style.visibility : '';
    if (!canvas || typeof canvas.getContext !== 'function') return;

    var self = this;
    this._onLost = function (event) {
      event.preventDefault();
      self._lost = true;
      self._program = null;
      self._buffer = null;
      self._uniforms = null;
      self._setupFallback();
      self.resize();
      if (self._last) self.draw(self._last);
    };
    this._onRestored = function () {
      if (self._destroyed) return;
      self._lost = false;
      if (self._setupWebGL()) {
        self._removeFallback();
        self.resize();
        if (self._last) self.draw(self._last);
      }
    };
    this._onResize = function () {
      if (self._destroyed) return;
      self.resize();
      if (self._last) self.draw(self._last);
    };
    canvas.addEventListener('webglcontextlost', this._onLost, false);
    canvas.addEventListener('webglcontextrestored', this._onRestored, false);
    window.addEventListener('resize', this._onResize, { passive: true });

    if (!this._setupWebGL()) this._setupFallback();
    this.resize();
  }

  PiankeMotion.prototype._setupWebGL = function () {
    var gl = this._gl;
    var program = null;
    var vertex = null;
    var fragment = null;
    var buffer = null;
    try {
      if (!gl) {
        gl = this.canvas.getContext('webgl', {
          alpha: false,
          antialias: false,
          depth: false,
          stencil: false,
          premultipliedAlpha: false,
          preserveDrawingBuffer: false,
          powerPreference: 'low-power'
        });
        this._gl = gl;
      }
      if (!gl || gl.isContextLost()) return false;

      function compile(type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          var message = gl.getShaderInfoLog(shader) || 'Unable to compile motion shader.';
          gl.deleteShader(shader);
          throw new Error(message);
        }
        return shader;
      }

      vertex = compile(gl.VERTEX_SHADER, VERTEX);
      var precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      var source = precision && precision.precision > 0 ? FRAGMENT : FRAGMENT.replace('precision highp float;', 'precision mediump float;');
      fragment = compile(gl.FRAGMENT_SHADER, source);
      program = gl.createProgram();
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.bindAttribLocation(program, 0, 'aPosition');
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'Unable to link motion shader.');
      }
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.useProgram(program);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      this._program = program;
      this._buffer = buffer;
      this._uniforms = {
        resolution: gl.getUniformLocation(program, 'uResolution'),
        time: gl.getUniformLocation(program, 'uTime'),
        hue: gl.getUniformLocation(program, 'uHue'),
        style: gl.getUniformLocation(program, 'uStyle'),
        inhale: gl.getUniformLocation(program, 'uInhale'),
        exhale: gl.getUniformLocation(program, 'uExhale'),
        dark: gl.getUniformLocation(program, 'uDark')
      };
      this.supported = true;
      this.backend = 'webgl';
      this.error = null;
      return true;
    } catch (error) {
      this.error = error && error.message ? error.message : String(error);
      if (gl && !gl.isContextLost()) {
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
      }
      return false;
    } finally {
      if (gl && !gl.isContextLost()) {
        if (vertex) gl.deleteShader(vertex);
        if (fragment) gl.deleteShader(fragment);
      }
    }
  };

  PiankeMotion.prototype._setupFallback = function () {
    if (this._destroyed || this._ctx) return !!this._ctx;
    try {
      var target = this.canvas;
      // A canvas that has owned WebGL cannot subsequently acquire a 2D context.
      // In that case a sibling canvas supplies the compatible renderer.
      if (this._gl) {
        target = document.createElement('canvas');
        target.className = this.canvas.className;
        target.style.cssText = this.canvas.style.cssText;
        target.setAttribute('aria-hidden', 'true');
        target.setAttribute('data-pianke-motion-fallback', '');
        target.style.pointerEvents = 'none';
        this._fallbackCanvas = target;
        if (this.canvas.style) this.canvas.style.visibility = 'hidden';
        this._attachFallback();
      }
      this._ctx = target.getContext('2d', { alpha: false });
      this.supported = !!this._ctx;
      this.backend = this._ctx ? 'canvas2d' : 'unavailable';
      return this.supported;
    } catch (error) {
      this.error = error && error.message ? error.message : String(error);
      this.supported = false;
      this.backend = 'unavailable';
      return false;
    }
  };

  PiankeMotion.prototype._attachFallback = function () {
    if (this._fallbackCanvas && this.canvas.parentNode && !this._fallbackCanvas.parentNode) {
      this.canvas.parentNode.insertBefore(this._fallbackCanvas, this.canvas.nextSibling);
    }
  };

  PiankeMotion.prototype._removeFallback = function () {
    if (this._fallbackCanvas && this._fallbackCanvas.parentNode) {
      this._fallbackCanvas.parentNode.removeChild(this._fallbackCanvas);
    }
    this._fallbackCanvas = null;
    this._ctx = null;
    if (this.canvas && this.canvas.style) this.canvas.style.visibility = this._originalVisibility;
  };

  PiankeMotion.prototype.resize = function () {
    if (this._destroyed || !this.canvas) return;
    var rect = typeof this.canvas.getBoundingClientRect === 'function' ? this.canvas.getBoundingClientRect() : null;
    var cssWidth = Math.max(1, Math.round(rect && rect.width || this.canvas.clientWidth || window.innerWidth || 800));
    var cssHeight = Math.max(1, Math.round(rect && rect.height || this.canvas.clientHeight || window.innerHeight || 600));
    // Cap both texture dimensions and pixel count; no retina-sized video buffer.
    var scale = Math.min(finite(window.devicePixelRatio, 1), 1.25, 1600 / cssWidth, 1000 / cssHeight, Math.sqrt(1280000 / (cssWidth * cssHeight)));
    var width = Math.max(1, Math.round(cssWidth * scale));
    var height = Math.max(1, Math.round(cssHeight * scale));
    this.renderScale = scale;
    this.width = width;
    this.height = height;
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
    if (this._fallbackCanvas) {
      this._attachFallback();
      if (this._fallbackCanvas.width !== width) this._fallbackCanvas.width = width;
      if (this._fallbackCanvas.height !== height) this._fallbackCanvas.height = height;
    }
    if (this._gl && !this._lost) this._gl.viewport(0, 0, width, height);
  };

  PiankeMotion.prototype.draw = function (options) {
    if (this._destroyed || !this.supported) return false;
    options = options || {};
    var elapsed = Math.max(0, finite(options.elapsed, 0));
    var hue = ((finite(options.hue, 210) % 360) + 360) % 360;
    var style = options.style === 'smoke' ? 'smoke' : 'ripple';
    var reduced = !!options.reduced;
    var inhale = Math.max(2, Math.min(12, finite(options.inhale, 4)));
    var exhale = Math.max(2, Math.min(12, finite(options.exhale, 6)));
    var theme = options.theme || document.documentElement.getAttribute('data-theme') || 'minimal';
    var dark = theme === 'dusk';
    this._last = { elapsed: elapsed, hue: hue, style: style, reduced: reduced, inhale: inhale, exhale: exhale, theme: theme };
    // Reduced motion preserves a legible, settled composition instead of pulsing.
    var time = reduced ? inhale + exhale * 0.18 : elapsed;
    var breath = breathState(time, inhale, exhale);
    if (this.backend === 'webgl' && this._gl && this._program && !this._lost) {
      try {
        var gl = this._gl;
        gl.useProgram(this._program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(this._uniforms.resolution, this.width, this.height);
        gl.uniform1f(this._uniforms.time, time);
        gl.uniform1f(this._uniforms.hue, hue / 360);
        gl.uniform1f(this._uniforms.style, style === 'smoke' ? 1 : 0);
        gl.uniform1f(this._uniforms.inhale, inhale);
        gl.uniform1f(this._uniforms.exhale, exhale);
        gl.uniform1f(this._uniforms.dark, dark ? 1 : 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } catch (error) {
        this.error = error && error.message ? error.message : String(error);
        this._setupFallback();
        this.resize();
        if (this._ctx) this._draw2D(time, style, hue, inhale, exhale, dark);
      }
    } else if (this._ctx) {
      this._attachFallback();
      this._draw2D(time, style, hue, inhale, exhale, dark);
    }
    this.lastDraw = {
      elapsed: time, style: style, hue: hue, reduced: reduced, backend: this.backend, theme: theme,
      phase: breath.phase, phaseProgress: breath.phaseProgress, inhale: inhale, exhale: exhale
    };
    return { backend: this.backend, width: this.width, height: this.height, reduced: reduced };
  };

  PiankeMotion.prototype._draw2D = function (time, style, hue, inhale, exhale, dark) {
    var ctx = this._ctx;
    if (!ctx) return;
    var width = this.width;
    var height = this.height;
    var unit = Math.min(width, height);
    var cx = width / 2;
    var cy = height / 2;
    var breath = breathState(time, inhale, exhale);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'hsl(' + hue + (dark ? ', 22%, 14%)' : ', 32%, 96%)');
    ctx.fillRect(0, 0, width, height);

    function tint(x, y, radius, color) {
      var gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(240,245,251,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
    tint(width * 0.05, height * 0.13, unit * 1.2, 'hsla(' + hue + (dark ? ', 26%, 32%, .33)' : ', 40%, 81%, .33)'));
    tint(width * 0.97, height * 0.92, unit * 1.1, 'hsla(' + ((hue + 34) % 360) + (dark ? ', 24%, 30%, .28)' : ', 30%, 84%, .28)'));
    tint(cx, cy, unit * 0.65, dark ? 'rgba(164,197,232,.07)' : 'rgba(255,255,255,.55)');

    if (style === 'ripple') {
      for (var i = 0; i < 3; i++) {
        var radius = unit * (0.080 + (0.290 - i * 0.086) * breath.expansion + 0.205 * breath.release);
        var band = unit * (0.023 + breath.expansion * 0.016 + breath.release * 0.018);
        var life = breath.presence * Math.pow(0.55, i) * (dark ? 0.25 : 1);
        var radial = ctx.createRadialGradient(cx, cy, Math.max(0, radius - band * 2), cx, cy, radius + band * 2);
        radial.addColorStop(0, 'rgba(255,255,255,0)');
        radial.addColorStop(0.27, 'rgba(255,255,255,0)');
        radial.addColorStop(0.43, 'rgba(255,255,255,' + (life * 0.68) + ')');
        radial.addColorStop(0.54, 'rgba(255,255,255,' + (life * 0.25) + ')');
        radial.addColorStop(0.72, 'hsla(' + hue + ', 25%, 63%, ' + (life * 0.09) + ')');
        radial.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      var smokeRadius = unit * (0.070 + 0.300 * breath.expansion + 0.205 * breath.release);
      var opacity = breath.presence * (dark ? 0.25 : 1);
      var flowTime = breath.phaseClock * 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Uneven, overlapping wisps retain an open centre and a circular footprint.
      // Their phases have no equal angular spacing, so there is no petal motif.
      for (var layer = 0; layer < 12; layer++) {
        ctx.beginPath();
        for (var point = 0; point <= 128; point++) {
          var angle = point / 128 * Math.PI * 2;
          var irregular = Math.sin(angle * 3 + Math.sin(angle * 5.0 + 1.2) * 1.2 + layer * 0.21 + flowTime * 0.018) * unit * 0.006;
          irregular += Math.sin(angle * 7 + Math.sin(angle * 2.0 + 4.5) * 1.3 + layer * 0.31 - flowTime * 0.031) * unit * 0.0033;
          irregular += Math.sin(angle * 13 + layer * 0.15 + flowTime * 0.025) * unit * 0.0018;
          var ring = smokeRadius + (layer - 5.5) * unit * 0.0021 + irregular;
          var x = cx + Math.cos(angle) * ring;
          var y = cy + Math.sin(angle) * ring;
          if (point === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.filter = 'blur(' + (unit * (layer % 3 === 0 ? 0.010 : 0.0042)).toFixed(2) + 'px)';
        ctx.lineWidth = unit * (layer % 3 === 0 ? 0.023 : 0.0070);
        ctx.strokeStyle = 'rgba(255,255,255,' + (opacity * (layer % 3 === 0 ? 0.14 : 0.18)) + ')';
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  PiankeMotion.prototype.destroy = function () {
    if (this._destroyed) return;
    this._destroyed = true;
    this.supported = false;
    this.backend = 'destroyed';
    if (this.canvas && this._onLost) {
      this.canvas.removeEventListener('webglcontextlost', this._onLost, false);
      this.canvas.removeEventListener('webglcontextrestored', this._onRestored, false);
    }
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    if (this._gl && !this._gl.isContextLost()) {
      if (this._buffer) this._gl.deleteBuffer(this._buffer);
      if (this._program) this._gl.deleteProgram(this._program);
    }
    this._removeFallback();
    this._buffer = null;
    this._program = null;
    this._uniforms = null;
    this._gl = null;
    this._ctx = null;
    this._last = null;
    this.lastDraw = null;
  };

  window.PiankeMotion = PiankeMotion;
}());
