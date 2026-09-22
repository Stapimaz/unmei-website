/**
 * UNMEI FANSUB - DISQUS INTEGRATION MANAGER
 */

const DisqusManager = (() => {
  const DISQUS_SHORTNAME = "unmei-fansub"; 
  let isDisqusLoaded = false;

  function loadComments(slug, title) {
    const threadContainer = document.getElementById("disqus_thread");
    if (!threadContainer) return;

    const pageUrl = `${window.location.origin}${window.location.pathname}#/anime/${slug}`;
    const pageIdentifier = `unmei_anime_${slug}`;

    if (!DISQUS_SHORTNAME || DISQUS_SHORTNAME === "unmei-fansub") {
      threadContainer.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <p style="font-size: 13px; max-width: 500px; margin: 0 auto; line-height: 1.5;">
            Bu animeye ait Disqus yorum alanı hazırdır. Sitenin Disqus hesabı tanımlandığında yorumlar burada listelenecektir.
          </p>
        </div>
      `;
      return;
    }

    if (!isDisqusLoaded) {
      window.disqus_config = function () {
        this.page.url = pageUrl;
        this.page.identifier = pageIdentifier;
        this.page.title = title;
      };

      const d = document, s = d.createElement('script');
      s.src = `https://${DISQUS_SHORTNAME}.disqus.com/embed.js`;
      s.setAttribute('data-timestamp', +new Date());
      (d.head || d.body).appendChild(s);
      isDisqusLoaded = true;
    } else if (typeof DISQUS !== 'undefined') {
      DISQUS.reset({
        reload: true,
        config: function () {
          this.page.url = pageUrl;
          this.page.identifier = pageIdentifier;
          this.page.title = title;
        }
      });
    }
  }

  return {
    loadComments
  };
})();
