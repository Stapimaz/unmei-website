/**
 * UNMEI FANSUB - PUBLIC LEADERBOARD SYSTEM (LIVE D1 SQLITE BACKEND)
 * 1. Sol panelde her zaman açık, canlı Top 10 sıralaması (Cloudflare D1 SQLite).
 * 2. Oyun bitince takma ad girip skoru anında veritabanına kaydetme.
 * 3. Çift katmanlı mimari: Canlı API + Kesintisiz Yerel Önbellek (Offline/Fallback).
 */

(function () {
  'use strict';

  const API_BASE = 'https://unmei-rating-api.stapimazgraphics.workers.dev';
  const STORAGE_KEY = 'unmei_public_leaderboard';
  const NICK_KEY = 'unmei_player_nickname';

  // Clear legacy mock placeholder seeds from client localStorage if present
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && (raw.includes('KaraokeMaster') || raw.includes('UnmeiAdmin') || raw.includes('FansubLord'))) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {}

  // DOM Elements
  const listEl = document.getElementById('leaderboard-list');
  const refreshBtn = document.getElementById('lb-refresh-btn');
  const submitPanel = document.getElementById('score-submit-panel');
  const submitScoreVal = document.getElementById('submit-score-val');
  const submitForm = document.getElementById('score-submit-form');
  const nickInput = document.getElementById('player-nickname');
  const submitBtn = document.getElementById('submit-score-btn');

  let currentPendingScore = 0;
  let isFetching = false;

  function getCachedScores() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Leaderboard parse error:', e);
    }
    return [];
  }

  function saveCachedScores(scores) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    } catch (e) {}
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderLeaderboard(highlightName = null) {
    if (!listEl) return;

    const scores = getCachedScores();
    scores.sort((a, b) => b.score - a.score);

    // Limit to Top 10
    const top10 = scores.slice(0, 10);

    if (top10.length === 0) {
      listEl.innerHTML = `
        <li class="lb-empty-state">
          <span>Henüz kayıtlı skor yok.</span>
          <span class="lb-empty-sub">İlk rekoru sen kır!</span>
        </li>
      `;
      return;
    }

    listEl.innerHTML = top10
      .map((item, index) => {
        const rank = index + 1;
        let rankClass = 'rank-other';
        if (rank === 1) {
          rankClass = 'rank-1';
        } else if (rank === 2) {
          rankClass = 'rank-2';
        } else if (rank === 3) {
          rankClass = 'rank-3';
        }

        const isHighlighted = highlightName && item.name &&
          item.name.toLowerCase() === highlightName.toLowerCase();
        const highlightClass = isHighlighted ? 'row-highlight' : '';

        return `
        <li class="lb-row ${rankClass} ${highlightClass}">
          <span class="lb-rank">${rank}</span>
          <span class="lb-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
          <span class="lb-score">${item.score}</span>
        </li>
      `;
      })
      .join('');
  }

  // Live API Fetch from Cloudflare D1
  async function fetchLeaderboard(highlightName = null) {
    if (isFetching) return;
    isFetching = true;
    try {
      const res = await fetch(`${API_BASE}/leaderboard`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.leaderboard) && data.leaderboard.length > 0) {
          saveCachedScores(data.leaderboard);
          renderLeaderboard(highlightName);
          return;
        }
      }
    } catch (e) {
      console.warn('Leaderboard API fetch error, fallback to cache:', e);
    } finally {
      isFetching = false;
    }
    // Render from cache if network fails
    renderLeaderboard(highlightName);
  }

  // Refresh Button Click
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.classList.add('spin-anim');
      await fetchLeaderboard();
      setTimeout(() => {
        refreshBtn.classList.remove('spin-anim');
      }, 400);
    });
  }

  // Load saved nickname if available
  const savedNick = localStorage.getItem(NICK_KEY);
  if (savedNick && nickInput) {
    nickInput.value = savedNick;
  }

  // Show score submission panel
  function showSubmitPanel(score) {
    currentPendingScore = score;
    if (!submitPanel) return;

    if (score > 0) {
      if (submitScoreVal) submitScoreVal.textContent = score;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Skoru Kaydet';
        submitBtn.classList.remove('btn-success');
      }
      submitPanel.style.display = 'flex';
      setTimeout(() => {
        if (nickInput) nickInput.focus();
      }, 100);
    } else {
      submitPanel.style.display = 'none';
    }
  }

  function hideSubmitPanel() {
    if (submitPanel) submitPanel.style.display = 'none';
  }

  // Handle Score Submission
  if (submitForm) {
    submitForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nickname = (nickInput ? nickInput.value : '').trim();
      if (!nickname || currentPendingScore <= 0) return;

      // Save nickname preference
      localStorage.setItem(NICK_KEY, nickname);

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Kaydediliyor...';
        submitBtn.classList.remove('btn-success');
      }

      let isSavedOnline = false;

      // 1. Send to Live Cloudflare D1 Backend
      try {
        const res = await fetch(`${API_BASE}/leaderboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nickname: nickname,
            score: currentPendingScore
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.leaderboard)) {
            saveCachedScores(data.leaderboard);
            isSavedOnline = true;
            renderLeaderboard(nickname);

            if (submitBtn) {
              const rankMsg = data.rank && data.rank <= 10 
                ? `#${data.rank} Sıraya Girdin!` 
                : 'Kaydedildi!';
              submitBtn.textContent = rankMsg;
              submitBtn.classList.add('btn-success');
            }
          }
        }
      } catch (err) {
        console.warn('Leaderboard online submission error, using local fallback:', err);
      }

      // 2. Offline / Fallback handling if network request failed
      if (!isSavedOnline) {
        const scores = getCachedScores();
        const existingIdx = scores.findIndex(
          (s) => s.name && s.name.toLowerCase() === nickname.toLowerCase()
        );
        if (existingIdx !== -1) {
          scores[existingIdx].score = Math.max(scores[existingIdx].score, currentPendingScore);
        } else {
          scores.push({
            name: nickname,
            score: currentPendingScore,
            date: new Date().toISOString().split('T')[0]
          });
        }
        scores.sort((a, b) => b.score - a.score);
        saveCachedScores(scores.slice(0, 15));
        renderLeaderboard(nickname);

        if (submitBtn) {
          submitBtn.textContent = 'Kaydedildi (Yerel)';
          submitBtn.classList.add('btn-success');
        }
      }

      // Auto-hide submit panel after 2.5s
      setTimeout(() => {
        hideSubmitPanel();
      }, 2500);
    });
  }

  // Initial Render & Live Fetch on script load
  renderLeaderboard();
  fetchLeaderboard();

  // Global interface for Flappy Uç game
  window.UnmeiLeaderboard = {
    showSubmitPanel,
    hideSubmitPanel,
    render: () => {
      renderLeaderboard();
      fetchLeaderboard();
    },
    fetch: fetchLeaderboard
  };
})();

