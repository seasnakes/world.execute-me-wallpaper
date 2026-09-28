'use strict';

(() => {
  const track = document.getElementById('song');
  const soundPrompt = document.getElementById('soundPrompt');
  const songPicker = document.getElementById('songPicker');
  const frameCount = window.NFRAMES;
  const duration = Math.min(window.ANALYSIS.duration, frameCount / FPS);
  const params = new URLSearchParams(location.search);
  const startAt = Math.max(0, Math.min(duration - 0.1, Number(params.get('t')) || 0));
  const freeze = params.get('freeze') === '1';

  let baseTime = startAt;
  let baseNow = performance.now();
  let audioClock = false;
  let startingAudio = false;
  let enginePaused = false;
  let suspended = false;
  let maxFps = 0;
  let lastPaint = -Infinity;
  let missingAudio = false;
  let selectedAudioURL = null;

  const normalized = seconds => ((seconds % duration) + duration) % duration;
  function setFallbackTime(seconds) {
    baseTime = normalized(seconds);
    baseNow = performance.now();
  }
  function currentTime() {
    if (freeze) return startAt;
    if (audioClock && !track.paused && track.readyState >= 1) {
      return normalized(track.currentTime);
    }
    return normalized(baseTime + (performance.now() - baseNow) / 1000);
  }
  window.wallpaperCurrentTime = currentTime;

  function showSoundPrompt(message) {
    soundPrompt.textContent = message;
    soundPrompt.hidden = false;
  }

  function waitForMedia(eventName) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => finish(new Error(`Audio ${eventName} timed out`)), 10000);
      const onEvent = () => finish();
      const onError = () => finish(track.error || new Error('Audio loading failed'));
      function finish(error) {
        clearTimeout(timeout);
        track.removeEventListener(eventName, onEvent);
        track.removeEventListener('error', onError);
        if (error) reject(error);
        else resolve();
      }
      track.addEventListener(eventName, onEvent);
      track.addEventListener('error', onError);
    });
  }

  async function startAudio() {
    if (freeze || suspended || startingAudio || missingAudio || !track.getAttribute('src')) return;
    startingAudio = true;
    try {
      if (track.readyState < 1) await waitForMedia('loadedmetadata');
      const time = currentTime();
      if (Math.abs(track.currentTime - time) > 0.1) {
        const seeked = waitForMedia('seeked');
        track.currentTime = time;
        await seeked;
      }
      await track.play();
      audioClock = true;
      soundPrompt.hidden = true;
    } catch (error) {
      audioClock = false;
      showSoundPrompt(missingAudio ? '选择本地音乐' : '点击启用音乐');
      console.info('Audio awaits a local file or user interaction:', error);
    } finally {
      startingAudio = false;
    }
  }

  function syncSuspension() {
    const shouldPause = enginePaused;
    if (shouldPause === suspended) return;
    if (shouldPause) {
      setFallbackTime(currentTime());
      suspended = true;
      track.pause();
      audioClock = false;
    } else {
      suspended = false;
      setFallbackTime(baseTime);
      startAudio();
    }
  }

  window.wallpaperPropertyListener = {
    applyGeneralProperties(properties) {
      if (typeof properties.fps === 'number') maxFps = Math.max(0, properties.fps);
    },
    setPaused(isPaused) {
      enginePaused = Boolean(isPaused);
      syncSuspension();
    },
    applyUserProperties(properties) {
      if (properties.showlyrics && typeof properties.showlyrics.value === 'boolean') {
        window.setBilingualLyricsEnabled(properties.showlyrics.value);
      }
    },
  };

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !enginePaused && track.paused) startAudio();
  });
  track.addEventListener('canplay', () => {
    if (!suspended && track.paused) startAudio();
  }, { once: true });
  soundPrompt.addEventListener('click', () => {
    if (missingAudio) songPicker.click();
    else startAudio();
  });
  songPicker.addEventListener('change', () => {
    const file = songPicker.files && songPicker.files[0];
    if (!file) return;
    songPicker.value = '';
    const time = currentTime();
    track.pause();
    audioClock = false;
    setFallbackTime(time);
    if (selectedAudioURL) URL.revokeObjectURL(selectedAudioURL);
    selectedAudioURL = URL.createObjectURL(file);
    missingAudio = false;
    track.src = selectedAudioURL;
    track.load();
    showSoundPrompt('正在加载音乐…');
    startAudio();
  });
  document.addEventListener('pointerdown', () => {
    if (!soundPrompt.hidden && !missingAudio) startAudio();
  }, { passive: true });
  track.addEventListener('error', () => {
    if (track.getAttribute('src')) {
      missingAudio = true;
      showSoundPrompt('选择本地音乐');
    }
  });
  track.addEventListener('pause', () => {
    if (audioClock && !suspended) setFallbackTime(track.currentTime);
    audioClock = false;
  });

  function paint(time) {
    const frame = Math.min(frameCount - 1, normalized(time) * FPS);
    drawFrame(frame);
    window.updateBilingualLyrics(normalized(time));
  }
  function tick(now) {
    requestAnimationFrame(tick);
    if (suspended !== enginePaused) syncSuspension();
    if (suspended || (maxFps > 0 && now - lastPaint < 1000 / maxFps - 1)) return;
    lastPaint = now;
    paint(currentTime());
  }

  paint(startAt);
  requestAnimationFrame(tick);
  if (!suspended) startAudio();
})();

