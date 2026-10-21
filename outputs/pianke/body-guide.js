/*
 * 片刻 · Luminous 3D body-awareness scene, 2026.
 * Approved neutral artwork plus original procedural light and water-air waves.
 * Local glow indicates an attention region, not an anatomical or massage point.
 * No independent timer/RAF: all transitions use the host's active elapsed time.
 */
(function () {
  'use strict';

  var serial = 0;
  var mounted = new WeakMap();
  var ASSET = 'assets/body-luminous-v3.png';
  // Registration against the delivered 1254 × 1254 RGBA cutout. One native
  // aspect ratio is shared by the image, alpha mask and every local light.
  var IMAGE = Object.freeze({ x: 190, y: 0, width: 620, height: 620, sourceWidth: 1254, sourceHeight: 1254 });
  var PREVIEW_VIEWBOX = '150 0 700 655';
  var regions = Object.freeze([
    { title: '鼻尖与气息', sourcePoints: [[627, 218, 20, 27]] },
    { title: '眼睛', sourcePoints: [[587, 179, 22, 13], [667, 179, 22, 13]] },
    { title: '额头', sourcePoints: [[627, 115, 38, 20]] },
    { title: '脸颊', sourcePoints: [[573, 230, 25, 30], [681, 230, 25, 30]] },
    { title: '嘴唇与下颌', sourcePoints: [[627, 275, 33, 23]] },
    { title: '耳朵', sourcePoints: [[529, 218, 17, 36], [725, 218, 17, 36]] },
    { title: '颈部', sourcePoints: [[627, 350, 31, 40]] },
    { title: '肩膀', sourcePoints: [[418, 451, 55, 37], [836, 451, 55, 37]] },
    { title: '手臂', sourcePoints: [[386, 598, 41, 84], [869, 598, 41, 84], [439, 839, 56, 46], [816, 839, 56, 46]] },
    { title: '双手', sourcePoints: [[589, 934, 48, 29], [676, 949, 52, 29]] },
    { title: '胸口', sourcePoints: [[627, 530, 72, 64]] },
    { title: '腹部', sourcePoints: [[627, 770, 80, 96]] },
    { title: '背部', sourcePoints: [[627, 635, 70, 150]] },
    { title: '腰与髋部', sourcePoints: [[506, 910, 64, 43], [748, 910, 64, 43]] },
    { title: '大腿', sourcePoints: [[361, 1000, 100, 56], [893, 1000, 100, 56]] },
    { title: '小腿', sourcePoints: [[450, 1100, 89, 41], [804, 1100, 89, 41]] },
    { title: '双脚', sourcePoints: [[568, 1155, 52, 27], [697, 1127, 52, 27]] },
    { title: '整个身体', sourcePoints: [[627, 641, 510, 581]] }
  ].map(function (region, index) {
    region.index = index;
    region.sourcePoints = Object.freeze(region.sourcePoints.map(function (point) { return Object.freeze(point); }));
    region.points = Object.freeze(region.sourcePoints.map(function (point) {
      return Object.freeze([
        IMAGE.x + point[0] * IMAGE.width / IMAGE.sourceWidth,
        IMAGE.y + point[1] * IMAGE.height / IMAGE.sourceHeight,
        point[2] * IMAGE.width / IMAGE.sourceWidth,
        point[3] * IMAGE.height / IMAGE.sourceHeight
      ]);
    }));
    return Object.freeze(region);
  }));

  function finite(value, fallback) { return typeof value === 'number' && isFinite(value) ? value : fallback; }
  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function clampIndex(value) { return clamp(Math.floor(finite(value, 0)), 0, regions.length - 1); }
  function smooth(value) { value = clamp(value, 0, 1); return value * value * (3 - 2 * value); }
  function imageMarkup(extra) {
    return '<image ' + (extra || '') + ' href="' + ASSET + '" x="' + IMAGE.x + '" y="' + IMAGE.y + '" width="' + IMAGE.width + '" height="' + IMAGE.height + '" preserveAspectRatio="xMidYMid meet"/>';
  }

  function markup(options) {
    options = options || {};
    var preview = !!options.preview;
    var id = 'pianke-body-' + (++serial);
    var lights = preview ? '' : regions.map(function (region) {
      return '<g class="bg-region' + (region.index === 0 ? ' is-active' : '') + '" data-region="' + region.index + '">' + region.points.map(function (p) {
        return '<ellipse class="bg-local-haze" cx="' + p[0] + '" cy="' + p[1] + '" rx="' + (p[2] * 1.70) + '" ry="' + (p[3] * 1.70) + '" fill="url(#' + id + '-light)"/>' +
          '<ellipse class="bg-local-light" cx="' + p[0] + '" cy="' + p[1] + '" rx="' + p[2] + '" ry="' + p[3] + '" fill="url(#' + id + '-light)"/>';
      }).join('') + '</g>';
    }).join('');
    var rearWaves = preview ? '' : '<g class="bg-rear-waves" aria-hidden="true">' + [0, 1, 2].map(function (i) {
      return '<g data-wave="' + i + '" opacity="0"><ellipse class="bg-wave-haze" cx="500" cy="622" rx="210" ry="55" filter="url(#' + id + '-wave-soft)"/><ellipse class="bg-wave-shadow" cx="500" cy="626" rx="210" ry="55"/><ellipse class="bg-wave-light" cx="500" cy="622" rx="210" ry="55" filter="url(#' + id + '-wave-crisp)"/></g>';
    }).join('') + '</g>';
    var frontWaves = preview ? '' : '<g class="bg-front-waves" aria-hidden="true">' + [0, 1, 2].map(function (i) {
      return '<path class="bg-front-arc" data-wave-front="' + i + '" d="M290 622A210 55 0 0 0 710 622" opacity="0" filter="url(#' + id + '-wave-crisp)"/>';
    }).join('') + '</g>';
    return '<div class="body-guide' + (preview ? ' bg-preview' : '') + '" data-preview="' + preview + '"' + (preview ? ' style="position:absolute;inset:0;width:100%;height:100%;min-height:0"' : '') + '>' +
      '<svg class="bg-figure" style="stroke:none;fill:none;width:100%;height:100%" viewBox="' + (preview ? PREVIEW_VIEWBOX : '0 0 1000 780') + '" role="img" aria-label="无面容、无性别特征的冰蓝发光三维打坐形象">' +
      '<defs>' +
      '<radialGradient id="' + id + '-light"><stop class="bg-light-core"/><stop offset=".40" class="bg-light-mid"/><stop offset="1" class="bg-light-edge"/></radialGradient>' +
      '<radialGradient id="' + id + '-air"><stop class="bg-air-core"/><stop offset=".54" class="bg-air-middle"/><stop offset="1" class="bg-air-edge"/></radialGradient>' +
      '<filter id="' + id + '-soft" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="7"/></filter>' +
      '<filter id="' + id + '-wave-soft" x="-35%" y="-55%" width="170%" height="210%"><feGaussianBlur stdDeviation="9"/></filter>' +
      '<filter id="' + id + '-wave-crisp" x="-15%" y="-55%" width="130%" height="210%"><feGaussianBlur stdDeviation="3.8"/></filter>' +
      (preview ? '' : '<mask id="' + id + '-body-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="780" style="mask-type:alpha">' + imageMarkup() + '</mask>') +
      '</defs>' +
      '<ellipse class="bg-air" cx="500" cy="351" rx="315" ry="310" fill="url(#' + id + '-air)"/>' +
      '<ellipse class="bg-floor" cx="500" cy="626" rx="184" ry="22" filter="url(#' + id + '-soft)"/>' +
      rearWaves + imageMarkup('class="bg-person-image"') +
      (preview ? '' : '<g class="bg-attention" mask="url(#' + id + '-body-mask)"><g filter="url(#' + id + '-soft)">' + lights + '</g></g>') +
      frontWaves + '</svg></div>';
  }

  function findRoot(container) {
    if (!container) return null;
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return null;
    return container.classList && container.classList.contains('body-guide') ? container : container.querySelector('.body-guide');
  }

  function update(container, options) {
    options = options || {};
    var root = findRoot(container);
    if (!root) return null;
    var state = mounted.get(root);
    if (!state) {
      state = { elapsed: Math.max(0, finite(options.elapsed, 0)), index: -1, previousIndex: -1, changedAt: 0,
        regions: Array.prototype.slice.call(root.querySelectorAll('[data-region]')),
        waves: Array.prototype.slice.call(root.querySelectorAll('[data-wave]')).map(function (group) { return { node: group, ellipses: Array.prototype.slice.call(group.querySelectorAll('ellipse')) }; }),
        front: Array.prototype.slice.call(root.querySelectorAll('[data-wave-front]')),
        svg: root.querySelector('svg') };
      mounted.set(root, state);
    }
    var preview = root.getAttribute('data-preview') === 'true';
    var paused = !!options.paused;
    var index = paused && state.index >= 0 ? state.index : clampIndex(options.index);
    var reduced = !!options.reducedMotion || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var time = paused ? state.elapsed : Math.max(0, finite(options.elapsed, state.elapsed));
    if (!paused) state.elapsed = time;
    var theme = options.theme || document.documentElement.getAttribute('data-theme') || 'minimal';
    root.setAttribute('data-theme', theme);
    root.classList.toggle('bg-paused', paused);
    root.classList.toggle('bg-reduced', reduced);
    // Every swell and local fade derives from this same effective time.
    var sceneTime = reduced ? 5 : time;
    state.waves.forEach(function (wave, i) {
      var phase = ((sceneTime / 10 + i / 3) % 1 + 1) % 1;
      var spread = 1 - Math.pow(1 - phase, 1.65);
      var rx = 168 + spread * 320;
      var ry = 32 + spread * 88;
      var arrival = smooth(phase / 0.12);
      var release = 1 - smooth((phase - 0.46) / 0.54);
      var presence = arrival * release;
      var darkFactor = theme === 'dusk' ? 0.56 : 1;
      wave.node.setAttribute('opacity', (presence * 0.48 * darkFactor).toFixed(4));
      wave.ellipses.forEach(function (ellipse, part) {
        ellipse.setAttribute('rx', rx.toFixed(2));
        ellipse.setAttribute('ry', ry.toFixed(2));
        ellipse.style.strokeWidth = (part === 0 ? 29 + spread * 14 : part === 1 ? 14 + spread * 4 : 8 + spread * 5).toFixed(2);
      });
      var front = state.front[i];
      if (front) {
        front.setAttribute('d', 'M' + (500 - rx).toFixed(2) + ' 622A' + rx.toFixed(2) + ' ' + ry.toFixed(2) + ' 0 0 0 ' + (500 + rx).toFixed(2) + ' 622');
        front.setAttribute('opacity', (presence * 0.16 * darkFactor).toFixed(4));
        front.style.strokeWidth = (11 + spread * 6).toFixed(2);
      }
    });
    if (state.index !== index) {
      state.previousIndex = state.index;
      state.index = index;
      state.changedAt = time;
      state.regions.forEach(function (region) { region.classList.toggle('is-active', !preview && Number(region.getAttribute('data-region')) === index); });
      if (state.svg) state.svg.setAttribute('aria-label', preview ? '无面容、无性别特征的冰蓝发光三维打坐形象' : '冰蓝发光三维打坐形象，柔光示意：' + regions[index].title);
    }
    var transition = reduced || state.previousIndex < 0 ? 1 : smooth((time - state.changedAt) / 1.35);
    state.regions.forEach(function (region) {
      var regionIndex = Number(region.getAttribute('data-region'));
      var opacity = preview ? 0 : regionIndex === index ? transition : regionIndex === state.previousIndex ? 1 - transition : 0;
      region.style.opacity = opacity.toFixed(4);
    });
    var local = sceneTime % 10;
    var breath = local < 4 ? smooth(local / 4) : 1 - smooth((local - 4) / 6);
    root.style.setProperty('--bg-attention-presence', (0.66 + breath * 0.18).toFixed(4));
    root.style.setProperty('--bg-air-presence', (0.76 + breath * 0.13).toFixed(4));
    return { index: index, title: regions[index].title, elapsed: time, paused: paused, reducedMotion: reduced, theme: theme, preview: preview, points: regions[index].points };
  }

  function mount(container, options) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return false;
    container.innerHTML = markup(options);
    update(container, options);
    return true;
  }

  function destroy(container) {
    var root = findRoot(container);
    if (!root) return;
    mounted.delete(root);
    if (root.parentNode) root.parentNode.removeChild(root);
  }

  window.PiankeBodyGuide = Object.freeze({ markup: markup, update: update, mount: mount, destroy: destroy, regions: regions, asset: ASSET, imageLayout: IMAGE, previewViewBox: PREVIEW_VIEWBOX, version: 'luminous-seated-2026-10-18' });
}());
