import os
import re
import shutil
import json

def process_akutsu():
    src_base = r"D:\UNMEİ MANGA\Please Go Home, Akutsu-san!"
    dst_base = r"c:\Users\stapi\OneDrive\Belgeler\unmei_website\assets\manga\akutsu-san"
    os.makedirs(dst_base, exist_ok=True)

    def get_chapter_num(dirname):
        m = re.search(r'b[öo]l[üu]m\s*(\d+(?:\.\d+)?)', dirname, re.IGNORECASE)
        if m:
            return float(m.group(1))
        return 9999.0

    def get_page_sort_key(filename):
        nums = re.findall(r'\d+', filename)
        return [int(n) for n in nums] if nums else [filename]

    dirs = [d for d in os.listdir(src_base) if os.path.isdir(os.path.join(src_base, d))]
    dirs.sort(key=get_chapter_num)

    print(f"Found {len(dirs)} chapter directories in source.")

    chapters_list = []

    for d in dirs:
        c_num = get_chapter_num(d)
        c_num_str = f"{c_num:g}"
        ch_folder_name = f"chapter-{c_num_str}"
        ch_dst_dir = os.path.join(dst_base, ch_folder_name)
        os.makedirs(ch_dst_dir, exist_ok=True)

        src_dir = os.path.join(src_base, d)
        raw_files = [
            f for f in os.listdir(src_dir)
            if f.lower().endswith(('.jpg', '.jpeg', '.png'))
            and not f.lower().startswith('untitled')
        ]
        raw_files.sort(key=get_page_sort_key)

        copied_relative_paths = []
        for idx, f in enumerate(raw_files):
            ext = os.path.splitext(f)[1].lower()
            new_filename = f"{idx:02d}{ext}"
            src_fpath = os.path.join(src_dir, f)
            dst_fpath = os.path.join(ch_dst_dir, new_filename)
            
            # Copy if not exists or different size
            if not os.path.exists(dst_fpath) or os.path.getsize(dst_fpath) != os.path.getsize(src_fpath):
                shutil.copy2(src_fpath, dst_fpath)

            web_path = f"assets/manga/akutsu-san/{ch_folder_name}/{new_filename}"
            copied_relative_paths.append(web_path)

        chapters_list.append({
            "chapter_num": c_num if c_num % 1 != 0 else int(c_num),
            "title": f"Bölüm {c_num_str}",
            "pages_count": len(copied_relative_paths),
            "pages": copied_relative_paths
        })
        print(f"  Processed Chapter {c_num_str}: {len(copied_relative_paths)} pages.")

    manga_data = [
        {
            "id": "please-go-home-akutsu-san",
            "slug": "please-go-home-akutsu-san",
            "title": "Please Go Home, Akutsu-san!",
            "romaji_title": "Kaette Kudasai! Akutsu-san",
            "japanese_title": "帰ってください！ 阿久津さん",
            "author": "Nagaoka Taichi",
            "artist": "Nagaoka Taichi",
            "cover_image": "assets/manga/akutsu-san/cover.jpg",
            "status": "Yarım Kaldı",
            "total_chapters": len(chapters_list),
            "demo_chapters": len(chapters_list),
            "year": 2019,
            "genres": ["Romantik", "Komedi", "Okul Hayatı", "Ecchi"],
            "synopsis": "Ooyama kendi halinde, sessiz sakin yaşayan bir lise öğrencisidir. Fakat sınıfın havalı ve serseri kızı Akutsu Riko, onun tek göz odalı dairesini resmen kendi evi gibi kullanmaya başlamıştır! Ooyama ders çalışmak ve yalnız kalmak için sürekli Akutsu'nun gitmesini ister, fakat Akutsu türlü bahanelerle bir türlü evine dönmez...",
            "chapters": chapters_list
        }
    ]

    out_json = r"c:\Users\stapi\OneDrive\Belgeler\unmei_website\data\manga.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(manga_data, f, ensure_ascii=False, indent=2)

    print(f"Successfully updated {out_json} with {len(chapters_list)} chapters!")

if __name__ == "__main__":
    process_akutsu()
