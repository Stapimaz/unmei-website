/**
 * UNMEI FANSUB - DUAL RATING SYSTEM (100% REAL & LIVE)
 * 1. Anime Puanı (Overall Anime Rating)
 * 2. Çeviri Kalitesi (Fansub Translation Quality)
 * Backend: Cloudflare Workers + KV Storage (1 IP = 1 Oy Korumalı)
 */

const RatingManager = (() => {
  const API_BASE = "https://unmei-rating-api.stapimazgraphics.workers.dev";
  const API_ENDPOINT = `${API_BASE}/vote`;
  const STORAGE_KEY_PREFIX = "unmei_vote_";

  function getStorageKey(slug, type) {
    return `${STORAGE_KEY_PREFIX}${slug}_${type}`;
  }

  function getStoredUserVote(slug, type) {
    const saved = localStorage.getItem(getStorageKey(slug, type));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.userRating || null;
      } catch (e) {}
    }
    return null;
  }

  function storeUserVote(slug, type, score) {
    localStorage.setItem(getStorageKey(slug, type), JSON.stringify({
      userRating: score,
      timestamp: Date.now()
    }));
  }

  function renderRatingWidget(containerId, anime, type, titleLabel) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const userRating = getStoredUserVote(anime.slug, type);
    const hasVoted = !!userRating;
    const typeLabel = type === 'anime' ? 'Anime Puanı' : 'Çeviri Kalitesi';

    container.innerHTML = `
      <div class="rating-block" data-type="${type}">
        <div class="rating-title-row">
          <span class="rating-label">${titleLabel || typeLabel}</span>
          <span class="rating-user-status" id="${type}-feedback">
            ${hasVoted ? `Oyunuz: ${userRating} / 5` : ''}
          </span>
        </div>

        <div class="rating-main-row">
          <div class="rating-score-val">
            <span class="score-big" id="${type}-score-display">${hasVoted ? userRating.toFixed(1) : '-'}</span>
            <span class="score-denom">/ 5.0</span>
          </div>

          <div class="stars-interactive" id="${type}-stars-bar">
            ${[1, 2, 3, 4, 5].map(star => {
              const isFilled = hasVoted && userRating >= star;
              return `
                <button type="button" class="star-btn ${isFilled ? 'filled' : ''}" data-val="${star}" title="${star} Puan" aria-label="${star} Puan">
                  ★
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="rating-count-label" id="${type}-votes-display">
          ${hasVoted ? '1 değerlendirme' : '0 değerlendirme'}
        </div>
      </div>
    `;

    const starsBar = container.querySelector(`#${type}-stars-bar`);
    const starBtns = starsBar.querySelectorAll('.star-btn');
    const feedback = container.querySelector(`#${type}-feedback`);
    const scoreDisplay = container.querySelector(`#${type}-score-display`);
    const votesDisplay = container.querySelector(`#${type}-votes-display`);

    // Cloudflare Worker KV'den gerçek oyları çek
    if (API_BASE) {
      fetch(`${API_BASE}/stats?slug=${encodeURIComponent(anime.slug)}&type=${type}`)
        .then(res => res.ok ? res.json() : null)
        .then(stats => {
          if (stats && typeof stats.count === 'number') {
            if (stats.count > 0) {
              scoreDisplay.textContent = stats.avg.toFixed(1);
              votesDisplay.textContent = `${stats.count} değerlendirme`;

              // Kullanıcı henüz oy vermediyse yıldızları genel ortalamaya göre doldur
              const currentVote = getStoredUserVote(anime.slug, type);
              if (!currentVote) {
                const roundedAvg = Math.round(stats.avg);
                starBtns.forEach((s, sIdx) => {
                  s.classList.toggle('filled', sIdx < roundedAvg);
                });
              }
            } else {
              // 0 oy varsa
              const currentVote = getStoredUserVote(anime.slug, type);
              if (!currentVote) {
                scoreDisplay.textContent = '-';
                votesDisplay.textContent = '0 değerlendirme';
                starBtns.forEach(s => s.classList.remove('filled'));
              }
            }
          }
        })
        .catch(() => {});
    }

    starBtns.forEach((btn, idx) => {
      const starVal = idx + 1;

      btn.addEventListener('mouseenter', () => {
        starBtns.forEach((s, sIdx) => {
          s.classList.toggle('hovered', sIdx < starVal);
        });
      });

      btn.addEventListener('mouseleave', () => {
        starBtns.forEach(s => s.classList.remove('hovered'));
      });

      btn.addEventListener('click', () => {
        storeUserVote(anime.slug, type, starVal);

        starBtns.forEach((s, sIdx) => {
          s.classList.toggle('filled', sIdx < starVal);
        });

        scoreDisplay.textContent = starVal.toFixed(1);
        feedback.textContent = `Oyunuz: ${starVal} / 5`;

        // Canlı API'ye gönder
        if (API_ENDPOINT) {
          fetch(API_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug: anime.slug, type, score: starVal })
          })
          .then(res => res.ok ? res.json() : null)
          .then(serverData => {
            if (serverData && serverData.success) {
              scoreDisplay.textContent = serverData.avg.toFixed(1);
              votesDisplay.textContent = `${serverData.count} değerlendirme`;
            }
          })
          .catch(err => console.warn("Vote sync error:", err));
        }
      });
    });
  }

  return {
    renderRatingWidget
  };
})();
