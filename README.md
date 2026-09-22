# Unmei Fansub (2017 - 2022) Tribute & Çeviri Arşiv Sitesi

Türkanime.tv ve eski anime platformlarının kapanması üzerine, Unmei Fansub ekibinin 5 yıllık Türkçe anime çeviri emeğini yaşatmak ve kaybolmasını önlemek için oluşturulmuş modern, Letterboxd esintili arşiv vitrini.

---

## 🌟 Özellikler

1. **Modern Tribute Vitrini (Letterboxd Tarzı):**
   - 161 anime serisi, 2,100+ bölüm ve terabaytlarca fansub arşivi.
   - AniList GraphQL API üzerinden çekilen yüksek çözünürlüklü sinematik yatay bannerlar (`bannerImage`) ve dikey afişler.
   - Animeye özel dinamik neon tema ışımaları (`theme_color`).
   - Tamamen koyu tema (Dark UI), cam efekti (glassmorphism) ve akıcı geçişler.

2. **Gelişmiş Arama ve Filtreleme:**
   - **Canlı Arama:** Türkçe başlık, Romaji, İngilizce, Japonca orijinal isim, stüdyo ve tür bazlı anlık arama (klavye kısayolu: `/`).
   - **Durum Filtresi:** Tümü / Tamamlanan Çeviriler / Yarım Kalan Çeviriler.
   - **Format Filtresi:** TV Dizileri, Filmler, OVA, Özel / ONA.
   - **Kalite Filtresi:** 1080p Master / 720p.
   - **Sıralama:** İsim (A-Z / Z-A), Bölüm Sayısı, Türkanime Puanı, AniList Puanı, Yayın Yılı.

3. **Anime Detay Sayfası & Bölüm Arşivi:**
   - Türkanime yerel veritabanından alınan **Türkçe Özetler (`Özet`)**.
   - Unmei Çeviri Durum Rozetleri: Tamamlanan projeler için başarı rozeti, yarım kalanlar için bilgilendirme.
   - Her bölümün dosya adı, kalitesi (`1080p` / `720p`), boyutu (MB) ve ses bütünlüğü durumu.

4. **Çift Oylama Sistemi (Dual Rating):**
   - **Genel Anime Puanı (1-5 Yıldız):** Ziyaretçilerin animeyi oylaması.
   - **Unmei Çeviri Kalitesi Puanı (1-5 Yıldız):** Ziyaretçilerin Unmei'nin çeviri ve altyazı kalitesini oylaması.
   - Ziyaretçiler oy verdikçe anında ağırlıklı ortalama ve toplam oy sayısı güncellenir.
   - Varsayılan olarak tarayıcı hafızasında (LocalStorage) çalışır. İstenirse Cloudflare Worker ile **1 IP = 1 Oy** kuralına bağlanabilir.

5. **Disqus Yorumları:**
   - Her animeye özel thread kimliği ile Disqus entegrasyonu.

---

## 🚀 GitHub Pages Üzerinde Yayınlama

Bu site **%100 statik** olarak çalışacak şekilde tasarlanmıştır.

1. Bu klasörü (`unmei_website`) yeni bir GitHub deposuna (örneğin `unmei-archive`) push edin:
   ```bash
   git init
   git add .
   git commit -m "feat: unmei fansub tribute archive site"
   git remote add origin https://github.com/KULLANICI_ADINIZ/unmei-archive.git
   git branch -M main
   git push -u origin main
   ```
2. GitHub deponuzun **Settings -> Pages** sekmesine gidin.
3. **Build and deployment -> Source** kısmından **GitHub Actions**'ı seçin.
4. `.github/workflows/deploy.yml` dosyamız otomatik olarak siteyi saniyeler içinde yayına alacaktır!

---

## ⚙️ Yapılandırma ve Kişiselleştirme

### 1. Disqus Yorumlarını Açmak:
`js/disqus.js` dosyasını açın:
```javascript
const DISQUS_SHORTNAME = "unmei-fansub"; // Buraya kendi Disqus shortname'inizi yazın
```

### 2. IP Başına 1 Oy (Cloudflare Worker):
Varsayılan olarak oylama sistemi LocalStorage ile tarayıcı bazlı çalışır. Eğer kesin IP kontrolü yapmak isterseniz:
1. `scripts/cf_worker_rating.js` dosyasını ücretsiz bir Cloudflare Worker içerisine yapıştırın.
2. Cloudflare Dashboard'dan bir KV Namespace (`UNMEI_VOTES`) oluşturup Worker'a bağlayın.
3. `js/rating.js` dosyasındaki `API_ENDPOINT` değişkenine Worker URL'inizi ekleyin:
   ```javascript
   const API_ENDPOINT = "https://unmei-rating.kullanici.workers.dev/vote";
   ```

### 3. Kataloğu Yeniden Derlemek:
Yerel arşivinize yeni anime eklediğinizde veya manifestleri güncellediğinizde:
```bash
python scripts/build_catalog.py
```
komutu ile `data/catalog.json` dosyasını anında güncelleyebilirsiniz.
