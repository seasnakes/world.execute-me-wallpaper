'use strict';

// Browser-only port of render_chat.py. All states derive from song time, so
// seeking, pausing, restarting and Wallpaper Engine loops stay deterministic.
(() => {
  const SEGMENTS = [
    { mode: 'first', start: 16, duration: 13 },
    { mode: 'second', start: 134.3, duration: 13 },
    { mode: 'third', start: 194, duration: 11.4 },
  ];
  const HEIGHTS = { user: 100, assistant: 125, status: 61, summary: 61,
                    row: 59, error: 59, preview: 171 };
  const layer = document.getElementById('claudeLayer');
  const stage = document.getElementById('stage');
  const design = document.getElementById('claudeDesign');
  const panel = document.getElementById('claudePanel');
  const viewport = document.getElementById('claudeViewport');
  const thumb = document.getElementById('claudeScrollThumb');
  const toggle = document.getElementById('uiToggle');
  const params = new URLSearchParams(location.search);
  let enabled = params.get('claude') === '1';
  let active = null;
  const screens = {};

  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => {
    const v = clamp(value);
    return v * v * (3 - 2 * v);
  };

  function createEvent(event) {
    const node = document.createElement('div');
    node.className = `claude-event ${event.kind}`;
    node.style.height = `${HEIGHTS[event.kind]}px`;
    if (event.kind === 'user') {
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.textContent = event.text;
      const timestamp = document.createElement('div');
      timestamp.className = 'timestamp';
      timestamp.textContent = '3 hours ago';
      node.append(bubble, timestamp);
    } else if (event.kind === 'assistant' || event.kind === 'status' || event.kind === 'summary') {
      node.textContent = event.text;
    } else {
      const line = document.createElement('div');
      line.className = 'line';
      const prefix = document.createElement('span');
      prefix.className = 'prefix';
      prefix.textContent = event.prefix || '';
      const main = document.createElement('span');
      main.className = 'main';
      main.textContent = event.text || '';
      line.append(prefix, main);
      node.append(line);
      if (event.kind === 'preview') {
        const image = document.createElement('img');
        image.className = 'preview-image';
        image.src = `claude-assets/${event.image.split('/').pop()}`;
        image.alt = event.text || '预览图';
        node.append(image);
      }
    }
    return node;
  }

  for (const segment of SEGMENTS) {
    const page = document.createElement('div');
    page.className = 'claude-page';
    let cursor = 16;
    const events = window.CLAUDE_EVENTS[segment.mode].map(raw => {
      const event = { ...raw, y: cursor, height: HEIGHTS[raw.kind], node: createEvent(raw) };
      event.node.style.top = `${cursor}px`;
      event.node.style.display = 'none';
      page.append(event.node);
      cursor += event.height + 4;
      return event;
    });
    const height = cursor + 20;
    page.style.height = `${height}px`;
    screens[segment.mode] = { page, events, height };
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    toggle.textContent = `Claude UI：${enabled ? '开' : '关'}`;
    toggle.setAttribute('aria-pressed', String(enabled));
    if (!enabled) {
      layer.hidden = true;
      active = null;
    }
  }

  function resize() {
    design.style.transform = `scale(${stage.getBoundingClientRect().width / 1280})`;
  }

  function update(time) {
    if (!enabled) return;
    const segment = SEGMENTS.find(item => time >= item.start && time < item.start + item.duration);
    if (!segment) {
      layer.hidden = true;
      active = null;
      return;
    }
    layer.hidden = false;
    if (active !== segment.mode) {
      active = segment.mode;
      viewport.replaceChildren(screens[active].page);
    }
    const screen = screens[active];
    const elapsed = time - segment.start;
    let scroll = 0;
    let previous = 0;
    for (const event of screen.events) {
      const passed = elapsed - event.at;
      const bottom = event.y + event.height;
      const target = Math.max(0, bottom - 500);
      scroll += Math.max(0, target - previous) * smooth(passed / 0.48);
      previous = target;
      if (passed < 0) {
        event.node.style.display = 'none';
      } else {
        const opacity = smooth(passed / 0.30);
        event.node.style.display = 'block';
        event.node.style.opacity = opacity;
        event.node.style.transform = `translateY(${Math.round((1 - opacity) * 10)}px)`;
      }
    }
    screen.page.style.transform = `translateY(${-Math.round(scroll)}px)`;
    const thumbHeight = Math.max(69, Math.round(512 * 512 / screen.height));
    thumb.style.height = `${thumbHeight}px`;
    thumb.style.top = `${Math.round((512 - thumbHeight) * clamp(scroll / Math.max(1, screen.height - 512)))}px`;
    const opacity = Math.min(smooth(elapsed / 0.78), smooth((segment.duration - elapsed) / 0.83));
    panel.style.opacity = opacity;
    panel.style.transform = `translateY(${Math.round((1 - smooth(elapsed / 0.75)) * 26)}px)`;
  }

  toggle.addEventListener('click', () => {
    setEnabled(!enabled);
    update(typeof window.wallpaperCurrentTime === 'function' ? window.wallpaperCurrentTime() : 0);
  });
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  resize();
  setEnabled(enabled);
  window.updateClaudeUI = update;
  window.setClaudeUIEnabled = setEnabled;
  window.CLAUDE_UI_SEGMENTS = SEGMENTS;
})();
