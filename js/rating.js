/**
 * UNMEI FANSUB - DUAL RATING SYSTEM (SADE VE EMOJİSİZ)
 * 1. Anime Puanı (Overall Anime Rating)
 * 2. Çeviri Kalitesi (Fansub Translation Quality)
 * Backend: Cloudflare Workers + KV Storage (1 IP = 1 Oy Korumalı)
 */

const RatingManager = (() => {
  const API_BASE = "https://unmei-rating-api.stapimazgraphics.workers.dev";
  const API_ENDPOINT = `${API_BASE}/vote`;
  const STORAGE_KEY_PREFIX = "unmei_rating_";

  function getBaselineScores(anime) {
    let animeBase = 4.5;
    if (anime.anilist_score) {
      animeBase = Math.min(5.0, Math.max(3.0, anime.anilist_score / 20.0));
    } else if (anime.turkanime_score) {
      animeBase = Math.min(5.0, Math.max(3.0, anime.turkanime_score / 2.0));
    }

    const isCompleted = anime.status === 'TAMAMLANDI';
    let transBase = isCompleted ? 4.8 : 4.3;

    const baseVotesAnime = 20 + ((anime.id * 17) % 55);
    const baseVotesTrans = 15 + ((anime.id * 13) % 40);

    return {
      anime: {
        avg: parseFloat(animeBase.toFixed(1)),
        votes: baseVotesAnime
      },
      translation: {
        avg: parseFloat(transBase.toFixed(1)),
        votes: baseVotesTrans
      }
    };
  }

  function getStorageKey(slug, type) {
    return `${STORAGE_KEY_PREFIX}${slug}_${type}`;
  }

  function getRatingData(anime, type) {
    const slug = anime.slug;
    const baseline = getBaselineScores(anime)[type];
    const saved = localStorage.getItem(getStorageKey(slug, type));

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          avg: parsed.avg,
          votes: parsed.votes,
          userRating: parsed.userRating || null,
          hasVoted: !!parsed.userRating
        };
      } catch (e) {}
    }

    return {
      avg: baseline.avg,
      votes: baseline.votes,
      userRating: null,
      hasVoted: false
    };
  }

  function submitRating(anime, type, score) {
    const slug = anime.slug;
    const current = getRatingData(anime, type);

    let newAvg = current.avg;
    let newVotes = current.votes;

    if (current.hasVoted) {
      const oldRating = current.userRating;
      newAvg = ((current.avg * current.votes) - oldRating + score) / current.votes;
    } else {
      newAvg = ((current.avg * current.votes) + score) / (current.votes + 1);
      newVotes = current.votes + 1;
    }

    newAvg = parseFloat(newAvg.toFixed(1));

    const updatedData = {
      avg: newAvg,
      votes: newVotes,
      userRating: score,
      hasVoted: true,
      timestamp: Date.now()
    };

    localStorage.setItem(getStorageKey(slug, type), JSON.stringify(updatedData));

    if (API_ENDPOINT) {
      fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, type, score })
      })
      .then(res => res.ok ? res.json() : null)
      .then(serverData => {
        if (serverData && serverData.success) {
          const baseline = getBaselineScores(anime)[type];
          const totalVotes = baseline.votes + serverData.count;
          const scoreEl = document.getElementById(`${type}-score-display`);
          const countEl = document.getElementById(`${type}-votes-display`);
          if (scoreEl && countEl) {
            const combinedAvg = parseFloat((((baseline.avg * baseline.votes) + (serverData.avg * serverData.count)) / totalVotes).toFixed(1));
            scoreEl.textContent = combinedAvg.toFixed(1);
            countEl.textContent = `${totalVotes} değerlendirme`;
          }
        }
      })
      .catch(err => console.warn("Vote sync error:", err));
    }

    return updatedData;
  }

  function renderRatingWidget(containerId, anime, type, titleLabel) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const data = getRatingData(anime, type);
    const typeLabel = type === 'anime' ? 'Anime Puanı' : 'Çeviri Kalitesi';

    container.innerHTML = `
      <div class="rating-block" data-type="${type}">
        <div class="rating-title-row">
          <span class="rating-label">${titleLabel || typeLabel}</span>
          <span class="rating-user-status" id="${type}-feedback">
            ${data.hasVoted ? `Oyunuz: ${data.userRating} / 5` : ''}
          </span>
        </div>

        <div class="rating-main-row">
          <div class="rating-score-val">
            <span class="score-big" id="${type}-score-display">${data.avg.toFixed(1)}</span>
            <span class="score-denom">/ 5.0</span>
          </div>

          <div class="stars-interactive" id="${type}-stars-bar">
            ${[1, 2, 3, 4, 5].map(star => {
              const isFilled = (data.userRating || Math.round(data.avg)) >= star;
              return `
                <button type="button" class="star-btn ${isFilled ? 'filled' : ''}" data-val="${star}" title="${star} Puan" aria-label="${star} Puan">
                  ★
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="rating-count-label" id="${type}-votes-display">
          ${data.votes} değerlendirme
        </div>
      </div>
    `;

    const starsBar = container.querySelector(`#${type}-stars-bar`);
    const starBtns = starsBar.querySelectorAll('.star-btn');
    const feedback = container.querySelector(`#${type}-feedback`);
    const scoreDisplay = container.querySelector(`#${type}-score-display`);
    const votesDisplay = container.querySelector(`#${type}-votes-display`);

    // Fetch live ratings from Cloudflare Worker KV in background
    if (API_BASE) {
      fetch(`${API_BASE}/stats?slug=${encodeURIComponent(anime.slug)}&type=${type}`)
        .then(res => res.ok ? res.json() : null)
        .then(stats => {
          if (stats && stats.count > 0) {
            const baseline = getBaselineScores(anime)[type];
            const totalVotes = baseline.votes + stats.count;
            const totalAvg = parseFloat((((baseline.avg * baseline.votes) + stats.sum) / totalVotes).toFixed(1));
            
            scoreDisplay.textContent = totalAvg.toFixed(1);
            votesDisplay.textContent = `${totalVotes} değerlendirme`;

            const currentData = getRatingData(anime, type);
            if (!currentData.hasVoted) {
              starBtns.forEach((s, sIdx) => {
                s.classList.toggle('filled', sIdx < Math.round(totalAvg));
              });
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
        const result = submitRating(anime, type, starVal);

        starBtns.forEach((s, sIdx) => {
          s.classList.toggle('filled', sIdx < starVal);
        });

        scoreDisplay.textContent = result.avg.toFixed(1);
        votesDisplay.textContent = `${result.votes} değerlendirme`;
        feedback.textContent = `Oyunuz: ${starVal} / 5`;
      });
    });
  }

  return {
    getRatingData,
    submitRating,
    renderRatingWidget
  };
})();
