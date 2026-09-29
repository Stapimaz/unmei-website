import json
import os

WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG_PATH = os.path.join(WORKSPACE_DIR, "data", "catalog.json")

FIXES = {
    "gin-no-guardian-ii": {
        "cover_image": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx99148-TTSmGMrL9fUw.jpg",
        "banner_image": "https://s4.anilist.co/file/anilistcdn/media/manga/banner/98030-JZ0yidPYPRwF.jpg"
    },
    "human-lost-ningen-shikkaku": {
        "cover_image": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx108626-0TtoR6rqVMoI.jpg",
        "banner_image": "https://s4.anilist.co/file/anilistcdn/media/anime/banner/124430-dE3NKQCSJdJo.jpg"
    },
    "king-s-raid-ishi-wo-tsugumono-tachi": {
        "cover_image": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx118376-V0mSf2LG0OOs.jpg",
        "banner_image": "https://s4.anilist.co/file/anilistcdn/media/anime/banner/118376-7TjzzE1rUmFi.jpg"
    },
    "kyuukyoku-shinka-shita-full-dive-rpg-ga-genjitsu-yori-mo-kusoge-dattara": {
        "cover_image": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx126791-Rwhm1a5QFope.jpg",
        "banner_image": "https://image.tmdb.org/t/p/original/2jfFwh2Kjl40dAEHYLwuGHwn8pr.jpg"
    },
    "re-zero-kara-hajimeru-isekai-seikatsu-shin-henshuu-ban": {
        "cover_image": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21355-wRVUrGxpvIQQ.jpg",
        "banner_image": "https://s4.anilist.co/file/anilistcdn/media/anime/banner/21355-f9SjOfEJMk5P.jpg"
    },
    "sk-crazy-rock-jam": {
        "cover_image": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx124153-uEBI764OSavB.png",
        "banner_image": "https://s4.anilist.co/file/anilistcdn/media/anime/banner/124153-tEEm1Zaoqa58.jpg"
    },
    "yahari-ore-no-seishun-love-comedy-wa-machigatteiru-kan": {
        "cover_image": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx108489-yGmYCE6dhFta.png",
        "banner_image": "https://s4.anilist.co/file/anilistcdn/media/anime/banner/108489-z4DheppQdxo4.jpg"
    },
    "yeon-ae-halujeon": {
        "cover_image": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx102425-GNArxcTC0XVu.png",
        "banner_image": "https://s4.anilist.co/file/anilistcdn/media/anime/banner/102425-Y0FAb3MB2D4V.png"
    }
}

with open(CATALOG_PATH, "r", encoding="utf-8") as f:
    cat = json.load(f)

updated_count = 0
for it in cat.get("items", []):
    slug = it.get("slug")
    if slug in FIXES:
        fix = FIXES[slug]
        it["cover_image"] = fix["cover_image"]
        it["banner_image"] = fix["banner_image"]
        updated_count += 1
        print(f"[UPDATED] {slug}")
        print(f"  New Cover: {fix['cover_image']}")
        print(f"  New Banner: {fix['banner_image']}")

with open(CATALOG_PATH, "w", encoding="utf-8") as f:
    json.dump(cat, f, ensure_ascii=False, indent=2)

print(f"\n[DONE] Successfully updated {updated_count} series in data/catalog.json")
