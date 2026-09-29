/**
 * UNMEI FANSUB - DISQUS INTEGRATION MANAGER
 */

const DisqusManager = (() => {
  const DISQUS_SHORTNAME = "unmeiceviri"; 
  let isDisqusLoaded = false;

  function loadComments(slug, title) {
    const threadContainer = document.getElementById("disqus_thread");
    if (!threadContainer) return;

    // Canonical URL for unmei.net
    const pageUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? `https://unmei.net/#/anime/${slug}`
      : `${window.location.origin}${window.location.pathname}#/anime/${slug}`;
    const pageIdentifier = `unmei_anime_${slug}`;

    if (!DISQUS_SHORTNAME) {
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
