'use strict';

// Captions are derived from song time, including seeking and seamless loops.
(() => {
  const lines = window.LYRIC_LINES;
  const stage = document.getElementById('stage');
  const layer = document.getElementById('lyricLayer');
  const design = document.getElementById('lyricDesign');
  const card = document.getElementById('lyricCard');
  const indexNode = document.getElementById('lyricIndex');
  const englishNode = document.getElementById('lyricEnglish');
  const chineseNode = document.getElementById('lyricChinese');
  const progressNode = document.getElementById('lyricProgress');
  const params = new URLSearchParams(location.search);
  let enabled = params.get('lyrics') !== '0';
  let currentIndex = -1;

  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const v = clamp(value); return v * v * (3 - 2 * v); };

  function resize() {
    design.style.transform = `scale(${stage.getBoundingClientRect().width / 1280})`;
  }

  function findIndex(time) {
    let low = 0;
    let high = lines.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (lines[mid].start <= time) low = mid + 1;
      else high = mid;
    }
    const index = low - 1;
    return index >= 0 && time < lines[index].end ? index : -1;
  }

  function setEnglish(value) {
    const parts = value.split(/(\b[A-Z]{2,}\b)/g);
    englishNode.replaceChildren(...parts.filter(Boolean).map(part => {
      if (!/^[A-Z]{2,}$/.test(part)) return document.createTextNode(part);
      const highlight = document.createElement('span');
      highlight.className = 'lyric-keyword';
      highlight.textContent = part;
      return highlight;
    }));
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) {
      layer.hidden = true;
      currentIndex = -1;
    }
  }

  function update(time) {
    if (!enabled) return;
    const index = findIndex(time);
    if (index < 0) {
      layer.hidden = true;
      currentIndex = -1;
      return;
    }
    const line = lines[index];
    layer.hidden = false;
    if (index !== currentIndex) {
      currentIndex = index;
      indexNode.textContent = String(line.n).padStart(3, '0');
      setEnglish(line.en);
      chineseNode.textContent = line.zh;
    }
    const elapsed = time - line.start;
    const remaining = line.end - time;
    const opacity = Math.min(smooth(elapsed / 0.16), smooth(remaining / 0.17));
    card.style.opacity = opacity;
    card.style.setProperty('--lift', `${Math.round((1 - opacity) * 6)}px`);
    progressNode.style.width = `${(100 * clamp(elapsed / (line.end - line.start))).toFixed(2)}%`;
  }

  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  resize();
  window.updateBilingualLyrics = update;
  window.setBilingualLyricsEnabled = setEnabled;
})();
