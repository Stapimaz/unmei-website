/**
 * UNMEI FANSUB - DISQUS INTEGRATION MANAGER
 */

const DisqusManager = (() => {
  const DISQUS_SHORTNAME = "unmeiceviri"; 
  let isDisqusLoaded = false;
  let currentSlug = null;

  function loadComments(slug, title) {
    const threadContainer = document.getElementById("disqus_thread");
    if (!threadContainer || !DISQUS_SHORTNAME) return;

    if (currentSlug === slug && isDisqusLoaded) return;
    currentSlug = slug;

    // Disqus URL'deki '#' işaretinden sonrasını varsayılan olarak kırpar ve tüm sayfaları kök URL'ye bağlar.
    // Bu yüzden her anime için mutlaka diyezsiz, temiz ve benzersiz kalıcı URL ile identifier kullanılmalıdır:
    const cleanUrl = `https://unmei.net/anime/${slug}/`;
    const cleanIdentifier = `anime_${slug}`;
    const cleanTitle = (title || "").replace(/\s*\((?:TV|Film)\)/gi, '').trim();

    if (!isDisqusLoaded) {
      window.disqus_config = function () {
        this.page.url = cleanUrl;
        this.page.identifier = cleanIdentifier;
        this.page.title = cleanTitle;
      };

      const d = document, s = d.createElement('script');
      s.id = 'dsq-embed-scr';
      s.src = `https://${DISQUS_SHORTNAME}.disqus.com/embed.js`;
      s.setAttribute('data-timestamp', +new Date());
      (d.head || d.body).appendChild(s);
      isDisqusLoaded = true;
    } else {
      const resetDisqus = () => {
        if (typeof DISQUS !== 'undefined') {
          DISQUS.reset({
            reload: true,
            config: function () {
              this.page.url = cleanUrl;
              this.page.identifier = cleanIdentifier;
              this.page.title = cleanTitle;
            }
          });
        } else {
          setTimeout(resetDisqus, 100);
        }
      };
      resetDisqus();
    }
  }

  return {
    loadComments
  };
})();
