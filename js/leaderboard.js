/**
 * UNMEI FANSUB - PUBLIC LEADERBOARD SYSTEM
 * 1. Sol panelde her zaman açık, canlı Top 10 sıralaması.
 * 2. Oyun bitince takma ad girip skoru anında kaydetme.
 * 3. Hibrit Depolama: LocalStorage ve opsiyonel Cloud API senkronizasyonu.
 */

(function () {
  'use strict';

  // Varsayılan nostaljik başlangıç skorları (liste asla boş görünmez)
  const DEFAULT_LEADERBOARD = [
    { id: 'seed-1', name: 'Stapimaz', score: 26, date: '2026-09-20' },
    { id: 'seed-2', name: 'UnmeiAdmin', score: 21, date: '2026-09-18' },
    { id: 'seed-3', name: 'Haruhi', score: 17, date: '2026-09-15' },
    { id: 'seed-4', name: 'Akudama', score: 14, date: '2026-09-12' },
    { id: 'seed-5', name: 'FansubLord', score: 11, date: '2026-09-10' },
    { id: 'seed-6', name: 'KaraokeMaster', score: 8, date: '2026-09-08' },
    { id: 'seed-7', name: 'EncodeKing', score: 6, date: '2026-09-05' },
    { id: 'seed-8', name: 'SubSync', score: 5, date: '2026-09-02' },
    { id: 'seed-9', name: 'OtakuTR', score: 3, date: '2026-09-01' },
    { id: 'seed-10', name: 'Arsivci', score: 2, date: '2026-08-28' }
  ];

  const STORAGE_KEY = 'unmei_public_leaderboard';
  const NICK_KEY = 'unmei_player_nickname';

  // DOM Elements
  const listEl = document.getElementById('leaderboard-list');
  const refreshBtn = document.getElementById('lb-refresh-btn');
  const submitPanel = document.getElementById('score-submit-panel');
  const submitScoreVal = document.getElementById('submit-score-val');
  const submitForm = document.getElementById('score-submit-form');
  const nickInput = document.getElementById('player-nickname');
  const submitBtn = document.getElementById('submit-score-btn');

  let currentPendingScore = 0;

  function getStoredScores() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Leaderboard parse error:', e);
    }
    // Seed default if empty
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_LEADERBOARD));
    return DEFAULT_LEADERBOARD;
  }

  function saveScores(scores) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    } catch (e) {}
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderLeaderboard(highlightId = null) {
    if (!listEl) return;

    const scores = getStoredScores();
    scores.sort((a, b) => b.score - a.score);

    // Limit to Top 10
    const top10 = scores.slice(0, 10);

    listEl.innerHTML = top10
      .map((item, index) => {
        const rank = index + 1;
        let rankClass = 'rank-other';
        let medal = '';

        if (rank === 1) {
          rankClass = 'rank-1';
          medal = '🥇';
        } else if (rank === 2) {
          rankClass = 'rank-2';
          medal = '🥈';
        } else if (rank === 3) {
          rankClass = 'rank-3';
          medal = '🥉';
        }

        const isHighlighted = highlightId && item.id === highlightId;
        const highlightClass = isHighlighted ? 'row-highlight' : '';

        return `
        <li class="lb-row ${rankClass} ${highlightClass}">
          <span class="lb-rank">${medal || rank}</span>
          <span class="lb-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
          <span class="lb-score">${item.score}</span>
        </li>
      `;
      })
      .join('');
  }

  // Refresh Button Click
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.classList.add('spin-anim');
      setTimeout(() => {
        renderLeaderboard();
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
    submitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nickname = (nickInput ? nickInput.value : '').trim();
      if (!nickname || currentPendingScore <= 0) return;

      // Save nickname preference
      localStorage.setItem(NICK_KEY, nickname);

      // Create entry
      const newEntry = {
        id: 'user-' + Date.now(),
        name: nickname,
        score: currentPendingScore,
        date: new Date().toISOString().split('T')[0]
      };

      // Add to local leaderboard
      const scores = getStoredScores();
      scores.push(newEntry);
      scores.sort((a, b) => b.score - a.score);
      const topScores = scores.slice(0, 15);
      saveScores(topScores);

      // Button success feedback
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '✓ Kaydedildi!';
        submitBtn.classList.add('btn-success');
      }

      // Re-render and highlight new rank
      renderLeaderboard(newEntry.id);

      // Auto-hide panel after 2.5s
      setTimeout(() => {
        hideSubmitPanel();
      }, 2500);
    });
  }

  // Initial Render on script load
  renderLeaderboard();

  // Global interface for Flappy Uç game
  window.UnmeiLeaderboard = {
    showSubmitPanel,
    hideSubmitPanel,
    render: renderLeaderboard
  };
})();
