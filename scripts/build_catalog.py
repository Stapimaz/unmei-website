import os
import json
import time
import urllib.request
import urllib.error
import re
import sys

ARSIV_DIR = r"D:\Unmei\Arsiv"
MIRROR_DIR = r"C:\Users\stapi\OneDrive\Belgeler\unmeirespawn\turkanime_arsiv\mirror\animeler"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
CACHE_FILE = os.path.join(DATA_DIR, "anilist_cache.json")
OUTPUT_CATALOG = os.path.join(DATA_DIR, "catalog.json")

ANILIST_QUERY = """
query ($search: String) {
  Media (search: $search, type: ANIME) {
    id
    title {
      romaji
      english
      native
    }
    bannerImage
    coverImage {
      extraLarge
      large
      color
    }
    format
    episodes
    status
    seasonYear
    genres
    averageScore
    description
  }
}
"""

def clean_title_for_search(title, slug):
    """Clean title to maximize AniList search match"""
    t = title
    t = re.sub(r'\(.*?\)', '', t)
    t = t.replace(':', ' ').replace('-', ' ')
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def fetch_anilist_info(title, slug, cache):
    if slug in cache and cache[slug] is not None:
        return cache[slug]

    search_terms = [
        title,
        clean_title_for_search(title, slug),
        slug.replace('-', ' ')
    ]

    for term in search_terms:
        payload = json.dumps({'query': ANILIST_QUERY, 'variables': {'search': term}}).encode('utf-8')
        req = urllib.request.Request(
            'https://graphql.anilist.co',
            data=payload,
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'UnmeiArchiveBot/1.0',
                'Accept': 'application/json'
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=6) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                media = res_data.get('data', {}).get('Media')
                if media:
                    result = {
                        'anilist_id': media.get('id'),
                        'romaji_title': media.get('title', {}).get('romaji'),
                        'english_title': media.get('title', {}).get('english'),
                        'native_title': media.get('title', {}).get('native'),
                        'banner_image': media.get('bannerImage'),
                        'cover_image': media.get('coverImage', {}).get('extraLarge') or media.get('coverImage', {}).get('large'),
                        'theme_color': media.get('coverImage', {}).get('color') or '#00d2ff',
                        'year': media.get('seasonYear'),
                        'anilist_score': media.get('averageScore'),
                        'anilist_genres': media.get('genres', [])
                    }
                    cache[slug] = result
                    return result
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f"AniList 429 Rate limited on '{slug}'. Waiting 30s...", flush=True)
                time.sleep(30)
            elif e.code == 404:
                continue
            else:
                print(f"HTTP Error {e.code} for '{term}'", flush=True)
        except Exception as e:
            print(f"Fetch error for '{term}': {e}", flush=True)
            time.sleep(0.5)

        time.sleep(0.3)

    # Fallback if not found on AniList
    fallback = {
        'anilist_id': None,
        'romaji_title': title,
        'english_title': title,
        'native_title': None,
        'banner_image': None,
        'cover_image': None,
        'theme_color': '#00d2ff',
        'year': None,
        'anilist_score': None,
        'anilist_genres': []
    }
    cache[slug] = fallback
    return fallback

def build_catalog():
    os.makedirs(DATA_DIR, exist_ok=True)
    
    cache = {}
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                cache = json.load(f)
            print(f"Loaded {len(cache)} cached AniList entries.", flush=True)
        except Exception as e:
            print("Could not load cache:", e, flush=True)

    slug_dirs = sorted([d for d in os.listdir(ARSIV_DIR) if os.path.isdir(os.path.join(ARSIV_DIR, d))])
    print(f"Found {len(slug_dirs)} anime directories in {ARSIV_DIR}", flush=True)

    catalog_items = []
    total_episodes_count = 0
    total_size_mb_all = 0
    completed_count = 0
    incomplete_count = 0
    master_1080p_count = 0

    for idx, slug in enumerate(slug_dirs, 1):
        manifest_path = os.path.join(ARSIV_DIR, slug, "manifest.json")
        mirror_info_path = os.path.join(MIRROR_DIR, slug, "info.json")

        if not os.path.exists(manifest_path):
            continue

        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)

        info = {}
        if os.path.exists(mirror_info_path):
            with open(mirror_info_path, 'r', encoding='utf-8') as f:
                info = json.load(f)

        title = manifest.get('title') or slug.replace('-', ' ').title()
        series_status = manifest.get('series_status', 'TAMAMLANDI')
        if series_status == 'TAMAMLANDI':
            completed_count += 1
        else:
            incomplete_count += 1

        episodes = manifest.get('episodes', [])
        total_episodes_count += len(episodes)
        
        series_size_mb = sum(ep.get('size_mb', 0) for ep in episodes)
        total_size_mb_all += series_size_mb
        
        has_1080p = any(ep.get('quality') == '1080p' for ep in episodes)
        all_1080p = len(episodes) > 0 and all(ep.get('quality') == '1080p' for ep in episodes)
        if has_1080p:
            master_1080p_count += 1
            max_quality = "1080p"
        else:
            max_quality = "720p"

        # Check / fetch AniList metadata
        is_new_fetch = slug not in cache
        ani_meta = fetch_anilist_info(title, slug, cache)
        if is_new_fetch:
            # Save cache immediately
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(cache, f, ensure_ascii=False, indent=2)

        turk_genres = info.get('Anime Türü', [])
        if isinstance(turk_genres, str):
            turk_genres = [turk_genres]
        
        raw_cat = info.get('Kategori', 'TV')
        if raw_cat in ['Movie', 'Film']:
            category = 'Film'
        elif raw_cat in ['OVA', 'OAV']:
            category = 'OVA'
        elif raw_cat in ['ONA', 'Special', 'Özel']:
            category = 'Özel / ONA'
        else:
            category = 'Dizi (TV)'

        # Direct Turkish synopsis from turkanime mirror database
        synopsis = info.get('Özet') or ""
        synopsis = synopsis.strip()

        # Sanitize episodes list: NO download links as requested, just file metadata & audio gatekeeper status
        sanitized_episodes = []
        for ep in episodes:
            sanitized_episodes.append({
                'ep_no': ep.get('ep_no'),
                'file_name': ep.get('file_name'),
                'quality': ep.get('quality'),
                'size_mb': ep.get('size_mb'),
                'source': ep.get('source', 'Unmei Archive')
            })

        item = {
            'id': idx,
            'slug': slug,
            'title': title,
            'romaji_title': ani_meta.get('romaji_title') or title,
            'english_title': ani_meta.get('english_title') or title,
            'japanese_title': info.get('Japonca') or ani_meta.get('native_title') or '',
            'leet_code': manifest.get('leet_code', ''),
            'status': series_status,
            'category': category,
            'translated_episodes': manifest.get('translated_episodes', len(episodes)),
            'total_episodes': manifest.get('total_episodes', len(episodes)),
            'final_episode': manifest.get('final_episode'),
            'studio': info.get('Stüdyo') or 'Bilinmiyor',
            'start_date': info.get('Başlama Tarihi') or '',
            'end_date': info.get('Bitiş Tarihi') or '',
            'year': ani_meta.get('year') or (info.get('Başlama Tarihi', '').split()[-1] if info.get('Başlama Tarihi') else None),
            'turkanime_score': info.get('Puanı'),
            'anilist_score': ani_meta.get('anilist_score'),
            'genres_tr': turk_genres,
            'genres_en': ani_meta.get('anilist_genres', []),
            'synopsis': synopsis,
            'banner_image': ani_meta.get('banner_image'),
            'cover_image': ani_meta.get('cover_image'),
            'theme_color': ani_meta.get('theme_color') or '#00d2ff',
            'max_quality': max_quality,
            'all_1080p': all_1080p,
            'size_gb': round(series_size_mb / 1024.0, 2),
            'episodes_count': len(episodes),
            'episodes': sanitized_episodes
        }

        catalog_items.append(item)

        if idx % 5 == 0 or idx == len(slug_dirs):
            print(f"[{idx}/{len(slug_dirs)}] Processed: {title} ({series_status}, {category}, {len(episodes)} eps)", flush=True)

    total_size_gb = round(total_size_mb_all / 1024.0, 1)

    catalog_data = {
        'stats': {
            'total_anime': len(catalog_items),
            'completed': completed_count,
            'incomplete': incomplete_count,
            'total_episodes': total_episodes_count,
            'total_size_gb': total_size_gb,
            'has_1080p_count': master_1080p_count,
            'archive_period': "2017 - 2022"
        },
        'items': catalog_items
    }

    with open(OUTPUT_CATALOG, 'w', encoding='utf-8') as f:
        json.dump(catalog_data, f, ensure_ascii=False, indent=2)

    print("\n=== CATALOG BUILD FINISHED ===", flush=True)
    print(f"Total Anime: {len(catalog_items)}", flush=True)
    print(f"Completed: {completed_count}, Incomplete: {incomplete_count}", flush=True)
    print(f"Total Episodes: {total_episodes_count}", flush=True)
    print(f"Total Archive Size: {total_size_gb} GB ({round(total_size_gb/1024.0, 2)} TB)", flush=True)
    print(f"Output saved to: {OUTPUT_CATALOG}", flush=True)

if __name__ == "__main__":
    build_catalog()
