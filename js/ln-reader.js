/**
 * UNMEI FANSUB - MINIMAL LIGHT NOVEL READER
 * Features:
 * - Completely seamless vertical scroll reading
 * - Near-black dark background (#090a0f) with off-white reading text (#e2e8f0)
 * - Optimal typography: 17.5px base, 1.85 line-height, 760px column
 * - Text + Illustrations extracted directly from original volumes
 * - Font size toggle (A- / A+) with persistent preference
 * - Chapter selector dropdown and smooth "Sonraki Bölüm" transition
 * - Keyboard navigation (Esc to close)
 */

const LNReader = (function () {
  let novelsCatalog = null;
  let currentNovel = null;
  let currentChapterIndex = 0;
  let fontSizePx = parseInt(localStorage.getItem('unmei_ln_fontsize') || '18', 10);

  // DOM Elements
  let modal = null;
  let seriesTitleEl = null;
  let chapterSelect = null;
  let closeBtn = null;
  let bodyContainer = null;
  let nextChapterBtn = null;
  let fontSmallerBtn = null;
  let fontLargerBtn = null;

  async function init() {
    modal = document.getElementById('ln-reader-modal');
    if (!modal) return;

    seriesTitleEl = document.getElementById('ln-series-title');
    chapterSelect = document.getElementById('ln-chapter-select');
    closeBtn = document.getElementById('ln-close-btn');
    bodyContainer = document.getElementById('ln-body-container');
    nextChapterBtn = document.getElementById('ln-next-chapter-btn');
    fontSmallerBtn = document.getElementById('ln-font-smaller');
    fontLargerBtn = document.getElementById('ln-font-larger');

    if (closeBtn) closeBtn.addEventListener('click', close);
    if (chapterSelect) {
      chapterSelect.addEventListener('change', (e) => {
        const targetChapter = parseInt(e.target.value, 10);
        goToChapter(targetChapter);
      });
    }

    if (fontSmallerBtn) {
      fontSmallerBtn.addEventListener('click', () => adjustFontSize(-1));
    }
    if (fontLargerBtn) {
      fontLargerBtn.addEventListener('click', () => adjustFontSize(1));
    }

    if (nextChapterBtn) {
      nextChapterBtn.addEventListener('click', () => {
        if (!currentNovel) return;
        if (currentChapterIndex < currentNovel.chapters.length - 1) {
          goToChapter(currentChapterIndex + 2); // 1-indexed chapter_num
        }
      });
    }

    // Keyboard support
    document.addEventListener('keydown', handleKeyDown);

    // Apply saved font size
    applyFontSize();
  }

  function adjustFontSize(delta) {
    fontSizePx = Math.max(15, Math.min(24, fontSizePx + delta));
    localStorage.setItem('unmei_ln_fontsize', fontSizePx);
    applyFontSize();
  }

  function applyFontSize() {
    if (bodyContainer) {
      bodyContainer.style.setProperty('--ln-font-size', fontSizePx + 'px');
    }
  }

  function handleKeyDown(e) {
    if (!modal || modal.style.display === 'none') return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  async function fetchCatalog() {
    if (novelsCatalog) return novelsCatalog;
    try {
      const root = window.UNMEI_ROOT || '';
      const res = await fetch(`${root}data/light-novel.json?v=${Date.now()}`);
      if (!res.ok) throw new Error('Light novel data load failed');
      novelsCatalog = await res.json();
      return novelsCatalog;
    } catch (err) {
      console.error('LNReader load error:', err);
      return [];
    }
  }

  async function openNovel(novelSlug, chapterNum = 1) {
    await init();
    const catalog = await fetchCatalog();
    currentNovel = catalog.find((n) => n.slug === novelSlug || n.id === novelSlug);
    if (!currentNovel) {
      console.warn('Novel not found:', novelSlug);
      return;
    }

    if (seriesTitleEl) {
      seriesTitleEl.textContent = currentNovel.title;
    }

    // Populate chapters dropdown
    if (chapterSelect) {
      chapterSelect.innerHTML = '';
      currentNovel.chapters.forEach((ch) => {
        const opt = document.createElement('option');
        opt.value = ch.chapter_num;
        opt.textContent = ch.title;
        chapterSelect.appendChild(opt);
      });
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    goToChapter(chapterNum);
  }

  function close() {
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  function goToChapter(chapterNum) {
    if (!currentNovel) return;
    const targetIdx = currentNovel.chapters.findIndex((c) => c.chapter_num === chapterNum);
    currentChapterIndex = targetIdx !== -1 ? targetIdx : 0;
    const chapter = currentNovel.chapters[currentChapterIndex];

    if (chapterSelect) {
      chapterSelect.value = chapter.chapter_num;
    }

    renderChapter(chapter);

    // Update Next Chapter button state
    if (nextChapterBtn) {
      if (currentChapterIndex < currentNovel.chapters.length - 1) {
        const nextChapter = currentNovel.chapters[currentChapterIndex + 1];
        nextChapterBtn.textContent = `Sonraki Bölüm: ${nextChapter.title} →`;
        nextChapterBtn.style.display = 'inline-flex';
      } else {
        nextChapterBtn.style.display = 'none';
      }
    }

    // Scroll to top
    const viewport = document.getElementById('ln-reader-viewport');
    if (viewport) {
      viewport.scrollTop = 0;
    }
  }

  function renderChapter(chapter) {
    if (!bodyContainer) return;
    bodyContainer.innerHTML = '';

    const root = window.UNMEI_ROOT || '';

    // Chapter Header inside text flow
    const headerEl = document.createElement('div');
    headerEl.className = 'ln-chapter-header';
    headerEl.innerHTML = `
      <h1 class="ln-chapter-title">${escapeHtml(chapter.title)}</h1>
      <div class="ln-chapter-rule"></div>
    `;
    bodyContainer.appendChild(headerEl);

    // Content items: headings, paragraphs, images
    chapter.content.forEach((item) => {
      if (item.type === 'heading') {
        const h = document.createElement('div');
        h.className = 'ln-section-heading';
        h.innerHTML = `<span>${escapeHtml(item.text)}</span>`;
        bodyContainer.appendChild(h);
      } else if (item.type === 'image') {
        const wrap = document.createElement('div');
        wrap.className = 'ln-illustration-wrap';
        const img = document.createElement('img');
        img.className = 'ln-illustration-img';
        img.src = `${root}${item.src}`;
        img.alt = `${currentNovel.title} Görsel`;
        img.loading = 'lazy';
        wrap.appendChild(img);
        bodyContainer.appendChild(wrap);
      } else if (item.type === 'paragraph') {
        const p = document.createElement('p');
        p.className = 'ln-text-para';
        // Check if paragraph starts with quote
        if (item.text.startsWith('“') || item.text.startsWith('"') || item.text.startsWith('—')) {
          p.classList.add('is-dialogue');
        }
        p.textContent = item.text;
        bodyContainer.appendChild(p);
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    init,
    openNovel,
    close,
    goToChapter
  };
})();

// Auto-init on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => LNReader.init());
} else {
  LNReader.init();
}
