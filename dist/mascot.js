/* Ayan mascot controller: picks a clip for a game event, manages timers, pause and static mode.
   Correctness never depends on it. Assets: assets/ayan/webp (animated, 300x400, looped) and stills (PNG). */
(function (root) {
  'use strict';
  var BASE = 'assets/ayan/';
  var CLIPS = ['Idle', 'Wave', 'Explain', 'Point', 'Think', 'Celebrate', 'Encourage', 'Rest'];
  var ONCE = { Wave: 1, Point: 1, Celebrate: 1, Encourage: 1 }; // play once (3 s), then back to Idle
  var EVENT_CLIP = { 'session:start': 'Wave', 'instruction:show': 'Explain', 'hint:show': 'Point', 'answer:retry': 'Encourage',
    'answer:correct': 'Idle', 'session:complete': 'Celebrate', 'session:pause': 'Rest', 'session:resume': 'Idle', 'wait': 'Think' };

  function reducedMotion() { try { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

  function create(host, opts) {
    opts = opts || {};
    var img = new Image(150, 200);
    img.className = 'ayan-img'; img.alt = ''; img.setAttribute('aria-hidden', 'true'); img.decoding = 'async'; img.draggable = false;
    host.appendChild(img);
    var timer = null, current = 'Idle', n = 0, motion = opts.motion !== false, failed = false;
    function staticMode() { return !motion || reducedMotion() || document.hidden || failed; }
    function show(clip) {
      var url = staticMode() ? BASE + 'stills/' + clip + '.png' : BASE + 'webp/' + clip + '.webp?r=' + (++n); // query restarts the animation
      if (img.getAttribute('src') !== url) img.src = url;
    }
    img.onerror = function () {
      if (img.src.indexOf('stills/Idle.png') >= 0) { img.style.visibility = 'hidden'; return; } // task keeps working without the mascot
      failed = true; img.src = BASE + 'stills/Idle.png';
    };
    function play(clip) {
      if (CLIPS.indexOf(clip) < 0) clip = 'Idle';
      clearTimeout(timer); current = clip; show(clip);
      if (ONCE[clip]) timer = setTimeout(function () { current = 'Idle'; show('Idle'); }, 3000);
    }
    function onEvent(ev) { if (EVENT_CLIP[ev]) play(EVENT_CLIP[ev]); }
    function onVis() { show(document.hidden ? current : current); }
    document.addEventListener('visibilitychange', onVis);
    play('Idle');
    return {
      play: play, onEvent: onEvent,
      setMotion: function (on) { motion = !!on; show(current); },
      destroy: function () { clearTimeout(timer); document.removeEventListener('visibilitychange', onVis); if (img.parentNode) img.parentNode.removeChild(img); }
    };
  }
  root.AyanMascot = { create: create, CLIPS: CLIPS, EVENT_CLIP: EVENT_CLIP, still: function (clip) { return BASE + 'stills/' + (clip || 'Idle') + '.png'; } };
})(typeof self !== 'undefined' ? self : this);
