import os
import json
import time
import urllib.request
import urllib.error
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

RESPAWN_DIR = r"C:\Users\stapi\OneDrive\Belgeler\unmeirespawn"
GDRIVE_CATALOG = os.path.join(RESPAWN_DIR, "gdrive_catalog.json")
ANIMELER_DIR = os.path.join(RESPAWN_DIR, "turkanime_arsiv", "mirror", "animeler")

DISK_DIRS = [
    r"D:\Unmei\Arsiv",
    r"E:\Unmei\Arsiv",
    r"C:\Unmei\Arsiv"
]

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
                print(f"AniList 429 Rate limited on '{slug}'. Waiting 15s...", flush=True)
                time.sleep(15)
            elif e.code == 404:
                continue
            else:
                print(f"HTTP Error {e.code} for '{term}'", flush=True)
        except Exception as e:
            print(f"Fetch error for '{term}': {e}", flush=True)
            time.sleep(0.5)

        time.sleep(0.3)

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

def load_all_disk_manifests():
    """Scan all 3 drives (D:, E:, C:) and merge manifests by slug with physical disk file verification."""
    merged_manifests = {}
    for dpath in DISK_DIRS:
        if not os.path.exists(dpath):
            continue
        for sname in os.listdir(dpath):
            sp = os.path.join(dpath, sname)
            if not os.path.isdir(sp):
                continue
            mp = os.path.join(sp, "manifest.json")
            m = {}
            if os.path.exists(mp):
                try:
                    with open(mp, 'r', encoding='utf-8') as f:
                        m = json.load(f)
                except Exception as e:
                    print(f"Error loading {mp}: {e}")

            physical_files = [f for f in os.listdir(sp) if f.endswith('.mp4')]

            slug = sname.lower()
            if slug not in merged_manifests:
                merged_manifests[slug] = {
                    'title': m.get('title'),
                    'slug': slug,
                    'series_status': m.get('series_status', 'TAMAMLANDI'),
                    'leet_code': m.get('leet_code', ''),
                    'translated_episodes': m.get('translated_episodes', 0),
                    'total_episodes': m.get('total_episodes', 0),
                    'final_episode': m.get('final_episode'),
                    'episodes_map': {},
                    'physical_files': {}
                }
            
            for p_file in physical_files:
                p_size = os.path.getsize(os.path.join(sp, p_file)) / (1024.0 * 1024.0)
                merged_manifests[slug]['physical_files'][p_file] = p_size

            # Merge episodes from manifest
            for ep in m.get('episodes', []):
                ep_no = ep.get('ep_no')
                if ep_no is not None and ep_no not in merged_manifests[slug]['episodes_map']:
                    merged_manifests[slug]['episodes_map'][ep_no] = ep

    # If physical files exist but not in manifest (or renamed), reconcile them
    result = {}
    for slug, m in merged_manifests.items():
        episodes_map = m['episodes_map']
        physical_files = m['physical_files']

        # Reconcile filenames with physical disk
        for ep_no, ep_data in episodes_map.items():
            curr_fn = ep_data.get('file_name', '')
            if curr_fn not in physical_files:
                # Look for matching movie/special or renamed file
                for pfn, psz in physical_files.items():
                    if '_Movie_' in pfn and ('_Movie_' in curr_fn or '_final' in curr_fn or 'movie' in slug):
                        ep_data['file_name'] = pfn
                        ep_data['size_mb'] = round(psz, 1)
                        break
                    elif '_Special_' in pfn and ('_Special_' in curr_fn or '_final' in curr_fn or 'special' in slug):
                        ep_data['file_name'] = pfn
                        ep_data['size_mb'] = round(psz, 1)
                        break

        # If episodes_map was empty but physical files exist, construct episodes
        if not episodes_map and physical_files:
            sorted_p = sorted(physical_files.keys())
            for idx, pfn in enumerate(sorted_p, 1):
                q = '1080p' if '1080p' in pfn else ('720p' if '720p' in pfn else '480p')
                episodes_map[idx] = {
                    'ep_no': idx,
                    'file_name': pfn,
                    'quality': q,
                    'codec': 'H.264',
                    'size_mb': round(physical_files[pfn], 1),
                    'source': 'Unmei Archive'
                }

        sorted_eps = sorted(episodes_map.values(), key=lambda x: x.get('ep_no', 0))
        m['episodes'] = sorted_eps
        del m['episodes_map']
        result[slug] = m
    return result

def normalize_key(s):
    if not s:
        return ""
    return re.sub(r'[^a-zA-Z0-9]', '', s).lower()

def main():
    print("=== UNMEI ARCHIVE CATALOG SYNC (REVISED 4-GROUP + MOVIE/SPECIAL STANDARDS) ===", flush=True)

    with open(GDRIVE_CATALOG, 'r', encoding='utf-8') as f:
        gdrive_items = json.load(f)
    print(f"Loaded {len(gdrive_items)} items from gdrive_catalog.json", flush=True)

    cache = {}
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                cache = json.load(f)
            print(f"Loaded {len(cache)} cached AniList entries.", flush=True)
        except Exception as e:
            print("Could not load cache:", e)

    existing_catalog_by_id = {}
    existing_catalog_by_slug = {}
    if os.path.exists(OUTPUT_CATALOG):
        try:
            with open(OUTPUT_CATALOG, 'r', encoding='utf-8') as f:
                old_cat = json.load(f)
                for it in old_cat.get('items', []):
                    existing_catalog_by_id[it.get('id')] = it
                    existing_catalog_by_slug[it.get('slug')] = it
            print(f"Loaded {len(existing_catalog_by_slug)} existing catalog items.", flush=True)
        except Exception as e:
            print("Could not load old catalog:", e)

    disk_manifests = load_all_disk_manifests()
    print(f"Found {len(disk_manifests)} anime across local disk manifests (D:, E:, C:).", flush=True)

    all_mirror_folders = os.listdir(ANIMELER_DIR) if os.path.exists(ANIMELER_DIR) else []
    mirror_by_norm = {normalize_key(f): f for f in all_mirror_folders}

    catalog_items = []
    total_episodes_count = 0
    total_size_mb_all = 0
    completed_count = 0
    incomplete_count = 0
    master_1080p_count = 0

    special_slug_map = {
        'Unmei_R3K4H415_SHB': 're-zero-kara-hajimeru-isekai-seikatsu-shin-henshuu-ban',
        'Unmei_R3K4H415_S2': 're-zero-kara-hajimeru-isekai-seikatsu-2nd-season',
        'Unmei_5w4r0n4l_S1': 'sword-art-online-alicization-war-of-underworld',
        'Unmei_5w4r0n4l_S2': 'sword-art-online-alicization-war-of-underworld-2nd-season',
        'Unmei_5hN0Ky53': 'shingeki-no-kyojin-season-3-part-2',
        'Unmei_5hN0KyL0': 'shingeki-no-kyojin-lost-girls',
    }

    # Group counts
    group_stats = {'A': 0, 'B': 0, 'C': 0, 'D': 0}
    arsiv_stats = {'Eksiksiz': 0, 'Kismi': 0, 'LinkRot': 0}

    for idx, g in enumerate(gdrive_items, 1):
        g_title = g.get('title', '')
        lfn = g.get('leet_folder_name', '')
        raw_leet = lfn.replace('Unmei_', '') if lfn.startswith('Unmei_') else lfn
        
        # Canonical slug
        slug = g.get('slug') or special_slug_map.get(lfn)
        if not slug:
            norm_title = normalize_key(g_title)
            slug = mirror_by_norm.get(norm_title)
        if not slug:
            slug = re.sub(r'[^a-zA-Z0-9]+', '-', g_title.lower()).strip('-')

        # Existing record
        existing = existing_catalog_by_slug.get(slug)
        if not existing:
            for it in existing_catalog_by_slug.values():
                if it.get('leet_code') and it.get('leet_code').lower() == raw_leet.lower():
                    existing = it
                    slug = it['slug']
                    break

        # Mirror info
        mirror_info = {}
        mirror_info_path = os.path.join(ANIMELER_DIR, slug, "info.json")
        if not os.path.exists(mirror_info_path):
            alt_slug = mirror_by_norm.get(normalize_key(g_title))
            if alt_slug:
                mirror_info_path = os.path.join(ANIMELER_DIR, alt_slug, "info.json")
        if os.path.exists(mirror_info_path):
            try:
                with open(mirror_info_path, 'r', encoding='utf-8') as f:
                    mirror_info = json.load(f)
            except:
                pass

        # Category determination (Strictly 2 categories: Film or Dizi (TV))
        MOVIE_SLUGS = {
            'fate-kaleid-liner-prisma-illya-movie-sekka-no-chikai',
            'human-lost-ningen-shikkaku',
            'kimi-no-suizou-wo-tabetai',
            'majo-no-takkyuubin',
            'mimi-wo-sumaseba',
            'perfect-blue',
            'taifuu-no-noruda',
            'tenki-no-ko'
        }
        raw_cat = g.get('kategori') or mirror_info.get('Kategori') or (existing.get('category') if existing else 'TV')
        if raw_cat in ['Movie', 'Film'] or slug in MOVIE_SLUGS:
            category = 'Film'
        else:
            category = 'Dizi (TV)'

        # Episodes from disk manifest or existing
        manifest = disk_manifests.get(slug) or disk_manifests.get(slug.replace('-', '')) or {}
        episodes = manifest.get('episodes') or (existing.get('episodes') if existing else [])
        
        sanitized_episodes = []
        series_size_mb = 0
        has_1080p = False
        all_1080p = len(episodes) > 0

        for ep in episodes:
            size_mb = ep.get('size_mb') or 0
            series_size_mb += size_mb
            q = ep.get('quality') or '1080p'
            if q == '1080p':
                has_1080p = True
            else:
                all_1080p = False

            fn = ep.get('file_name', '')
            
            # Determine episode type & display label
            # If movie or special file, mark accordingly
            if '_Movie_' in fn or (category == 'Film' and len(episodes) == 1):
                ep_type = 'movie'
                label = 'Film'
            elif '_Special_' in fn:
                ep_type = 'special'
                label = 'Özel'
            else:
                ep_type = 'episode'
                label = str(ep.get('ep_no')).zfill(2)

            # Codec detection
            codec = ep.get('codec') or ep.get('video_codec') or 'H.264'
            if 'hevc' in codec.lower() or 'h265' in codec.lower():
                codec = 'HEVC'
            else:
                codec = 'H.264'

            sanitized_episodes.append({
                'ep_no': ep.get('ep_no'),
                'label': label,
                'ep_type': ep_type,
                'file_name': fn,
                'quality': q,
                'codec': codec,
                'size_mb': round(size_mb, 1),
                'source': ep.get('source', 'Unmei Archive')
            })

        # Size fallback from gdrive catalog string
        if not series_size_mb and g.get('size'):
            size_str = g.get('size', '')
            if 'GB' in size_str:
                try:
                    series_size_mb = float(size_str.replace('GB', '').strip()) * 1024
                except:
                    pass
            elif 'MB' in size_str:
                try:
                    series_size_mb = float(size_str.replace('MB', '').strip())
                except:
                    pass

        total_episodes_count += len(sanitized_episodes)
        total_size_mb_all += series_size_mb

        if has_1080p:
            master_1080p_count += 1
            max_quality = "1080p"
        else:
            max_quality = "720p"

        # Translation status (Fansub metric)
        ceviri_durumu = g.get('ceviri_durumu', '')
        is_completed = ceviri_durumu.startswith('Tamamlandi')
        series_status = 'TAMAMLANDI' if is_completed else 'DEVAM EDIYOR'
        if is_completed:
            completed_count += 1
        else:
            incomplete_count += 1

        # Groups: [A], [B], [C], [D]
        grp_code = g.get('group_code', 'A')
        grp_name = g.get('group_name', '')
        group_stats[grp_code] = group_stats.get(grp_code, 0) + 1

        # Archive completeness status
        raw_arsiv = g.get('arsiv_durumu', '')
        if raw_arsiv == 'Eksiksiz':
            arsiv_durumu = 'Eksiksiz'
            arsiv_stats['Eksiksiz'] += 1
        elif 'Link Rot (0 Bolum)' in raw_arsiv or int(g.get('local_count', 0)) == 0:
            arsiv_durumu = 'İndirilemedi (Link Rot)'
            arsiv_stats['LinkRot'] += 1
        else:
            arsiv_durumu = raw_arsiv
            arsiv_stats['Kismi'] += 1

        missing_eps = g.get('missing_episodes', '-')

        # Turkish Genres
        turk_genres = mirror_info.get('Anime Türü', [])
        if isinstance(turk_genres, str):
            turk_genres = [turk_genres]
        if not turk_genres and existing:
            turk_genres = existing.get('genres_tr', [])

        # AniList metadata
        if existing and existing.get('cover_image'):
            ani_meta = {
                'romaji_title': existing.get('romaji_title'),
                'english_title': existing.get('english_title'),
                'native_title': existing.get('japanese_title'),
                'banner_image': existing.get('banner_image'),
                'cover_image': existing.get('cover_image'),
                'theme_color': existing.get('theme_color'),
                'year': existing.get('year'),
                'anilist_score': existing.get('anilist_score'),
                'anilist_genres': existing.get('genres_en', [])
            }
        else:
            is_new = slug not in cache
            ani_meta = fetch_anilist_info(g_title, slug, cache)
            if is_new:
                with open(CACHE_FILE, 'w', encoding='utf-8') as cf:
                    json.dump(cache, cf, ensure_ascii=False, indent=2)

        title = (existing.get('title') if existing else None) or g_title
        synopsis = mirror_info.get('Özet') or (existing.get('synopsis') if existing else '') or ''
        synopsis = synopsis.replace('<br />', ' ').replace('<br/>', ' ').strip()
        synopsis = re.sub(r'\s+', ' ', synopsis)

        official_total = int(g.get('official_total') or g.get('original_total') or len(sanitized_episodes))
        unmei_count = int(g.get('unmei_count') or g.get('translated_count') or len(sanitized_episodes))
        local_count = int(g.get('local_count') or g.get('archived_count') or len(sanitized_episodes))

        item = {
            'id': idx,
            'slug': slug,
            'title': title,
            'romaji_title': ani_meta.get('romaji_title') or title,
            'english_title': ani_meta.get('english_title') or title,
            'japanese_title': mirror_info.get('Japonca') or ani_meta.get('native_title') or (existing.get('japanese_title') if existing else ''),
            'leet_code': raw_leet,
            'status': series_status,
            'category': category,
            'translated_episodes': unmei_count,
            'total_episodes': official_total,
            'final_episode': unmei_count,
            'studio': mirror_info.get('Stüdyo') or (existing.get('studio') if existing else 'Bilinmiyor'),
            'start_date': mirror_info.get('Başlama Tarihi') or (existing.get('start_date') if existing else ''),
            'end_date': mirror_info.get('Bitiş Tarihi') or (existing.get('end_date') if existing else ''),
            'year': ani_meta.get('year') or (existing.get('year') if existing else None),
            'turkanime_score': mirror_info.get('Puanı') or (existing.get('turkanime_score') if existing else None),
            'anilist_score': ani_meta.get('anilist_score') or (existing.get('anilist_score') if existing else None),
            'genres_tr': turk_genres,
            'genres_en': ani_meta.get('anilist_genres', []) or (existing.get('genres_en') if existing else []),
            'synopsis': synopsis,
            'banner_image': ani_meta.get('banner_image') or (existing.get('banner_image') if existing else None),
            'cover_image': ani_meta.get('cover_image') or mirror_info.get('Resim') or (existing.get('cover_image') if existing else None),
            'theme_color': ani_meta.get('theme_color') or '#1a6bd6',
            'max_quality': max_quality,
            'all_1080p': all_1080p,
            'size_gb': round(series_size_mb / 1024.0, 2),
            'episodes_count': len(sanitized_episodes),
            'episodes': sanitized_episodes,
            # Updated 4-Group Classification & Archive attributes:
            'group_code': grp_code,
            'group_name': grp_name,
            'ceviri_durumu': ceviri_durumu,
            'arsiv_durumu': arsiv_durumu,
            'archived_count': local_count,
            'missing_episodes': missing_eps,
            'drives': g.get('drives', ''),
            'gdrive_url': g.get('folder_url', '')
        }

        catalog_items.append(item)

    total_size_gb = round(total_size_mb_all / 1024.0, 1)

    catalog_data = {
        'stats': {
            'total_anime': len(catalog_items),
            'completed': completed_count,
            'incomplete': incomplete_count,
            'fully_archived': arsiv_stats['Eksiksiz'],
            'partially_archived': arsiv_stats['Kismi'],
            'link_rot': arsiv_stats['LinkRot'],
            'total_episodes': total_episodes_count,
            'total_translated_episodes': sum(it['translated_episodes'] for it in catalog_items),
            'total_official_episodes': sum(it['total_episodes'] for it in catalog_items),
            'total_size_gb': total_size_gb,
            'has_1080p_count': master_1080p_count,
            'groups': group_stats,
            'archive_period': "2017 - 2022"
        },
        'items': catalog_items
    }

    with open(OUTPUT_CATALOG, 'w', encoding='utf-8') as f:
        json.dump(catalog_data, f, ensure_ascii=False, indent=2)

    print(f"\nSuccessfully wrote {len(catalog_items)} anime to {OUTPUT_CATALOG}")
    print(f"Stats: {catalog_data['stats']}")
    print(f"Group breakdown: {group_stats}")

if __name__ == '__main__':
    main()
