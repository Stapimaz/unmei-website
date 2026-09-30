import pdfplumber
import pypdf
import os
import json
import io
from PIL import Image

def process_light_novel():
    pdf_dir = r"D:\UNMEİ MANGA\index ln"
    assets_dir = r"c:\Users\stapi\OneDrive\Belgeler\unmei_website\assets\light-novel\index-nt"
    os.makedirs(assets_dir, exist_ok=True)
    
    files = [
        {
            "file": "Index NT Prologue.pdf",
            "num": 1,
            "short_title": "Prolog",
            "title": "Prolog: Yanlışlıkla Ana Karakter Olan Adam -- Savaş?",
            "type": "prologue"
        },
        {
            "file": "Index NT Volume 1 Chapter 1.pdf",
            "num": 2,
            "short_title": "Bölüm 1",
            "title": "Bölüm 1: ''O''nsuz Huzurlu Bir Akademi Şehri -- Şehir.",
            "type": "chapter"
        },
        {
            "file": "Index NT Volume 1 Chapter 2.pdf",
            "num": 3,
            "short_title": "Bölüm 2",
            "title": "Bölüm 2: İleride Ne Var, Ne Seçilmeli -- Rüya.",
            "type": "chapter"
        },
        {
            "file": "Index NT Volume 1 Chapter 3.pdf",
            "num": 4,
            "short_title": "Bölüm 3",
            "title": "Bölüm 3: Ufak Bir Pay ve Geleceğe Bağlanan Bir Alamet -- Kız.",
            "type": "chapter"
        }
    ]
    
    chapters_data = []
    
    for f_info in files:
        fpath = os.path.join(pdf_dir, f_info["file"])
        print(f"Processing {f_info['file']} ({f_info['title']})...")
        
        # 1. Extract Images
        pypdf_reader = pypdf.PdfReader(fpath)
        page_images = {}
        for p_idx, page in enumerate(pypdf_reader.pages):
            p_num = p_idx + 1
            if len(page.images) > 0:
                page_images[p_num] = []
                for img_idx, img in enumerate(page.images):
                    img_filename = f"ch_{f_info['num']}_p{p_num}_{img_idx}.jpg"
                    img_disk_path = os.path.join(assets_dir, img_filename)
                    # Convert to RGB JPEG
                    pil_img = Image.open(io.BytesIO(img.data)).convert("RGB")
                    pil_img.save(img_disk_path, "JPEG", quality=90)
                    web_path = f"assets/light-novel/index-nt/{img_filename}"
                    page_images[p_num].append({
                        "path": web_path,
                        "width": pil_img.width,
                        "height": pil_img.height,
                        "aspect": round(pil_img.width / pil_img.height, 2)
                    })
                    print(f"  Extracted image for page {p_num}: {img_filename} ({pil_img.size})")

        # 2. Extract Text Page by Page
        content_items = []
        with pdfplumber.open(fpath) as pdf:
            for p_idx, page in enumerate(pdf.pages):
                p_num = p_idx + 1
                text = page.extract_text() or ""
                
                # Check for images on this page
                if p_num in page_images:
                    for img in page_images[p_num]:
                        content_items.append({
                            "type": "image",
                            "src": img["path"],
                            "width": img["width"],
                            "height": img["height"],
                            "aspect": img["aspect"]
                        })
                
                # Clean up lines and form paragraphs
                raw_lines = [l.strip() for l in text.split("\n") if l.strip()]
                
                curr_para = []
                for line in raw_lines:
                    # Check if line is a section header (e.g., Part 1, PART 1)
                    if line.lower().startswith("part ") and len(line) < 15:
                        if curr_para:
                            content_items.append({"type": "paragraph", "text": " ".join(curr_para)})
                            curr_para = []
                        content_items.append({"type": "heading", "text": line})
                    else:
                        # Check dialogue quote or new thought
                        if line.startswith("“") or line.startswith('"') or line.startswith("—") or line.startswith("‘") or line.startswith("''"):
                            if curr_para:
                                content_items.append({"type": "paragraph", "text": " ".join(curr_para)})
                                curr_para = []
                            curr_para.append(line)
                        else:
                            curr_para.append(line)
                
                if curr_para:
                    content_items.append({"type": "paragraph", "text": " ".join(curr_para)})
                    curr_para = []
                    
        chapters_data.append({
            "chapter_num": f_info["num"],
            "short_title": f_info["short_title"],
            "title": f_info["title"],
            "content": content_items
        })
        
    novel_data = [
        {
            "id": "index-new-testament",
            "slug": "index-new-testament",
            "title": "Toaru Majutsu no Index: New Testament",
            "romaji_title": "Shinyaku Toaru Majutsu no Index",
            "japanese_title": "新約 とある魔術の禁書目録",
            "author": "Kamachi Kazuma",
            "artist": "Haimura Kiyotaka",
            "type": "light-novel",
            "cover_image": "assets/light-novel/index-nt/cover.jpg",
            "status": "Yarım Kaldı",
            "total_chapters": 4,
            "demo_chapters": len(chapters_data),
            "year": 2011,
            "genres": ["Aksiyon", "Bilim Kurgu", "Doğaüstü", "Büyü"],
            "synopsis": "Üçüncü Dünya Savaşı'nın sona ermesiyle Akademi Şehri'nde yeni bir dönem başlamıştır. Kamijou Touma'nın ortadan kayboluşunun ardından Accelerator ve Hamazura Shiage kendi yollarında ilerlerken, Şehir yeni tehditlerle karşı karşıya kalır.",
            "chapters": chapters_data
        }
    ]
    
    out_json = r"c:\Users\stapi\OneDrive\Belgeler\unmei_website\data\light-novel.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(novel_data, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully generated {out_json} with {len(chapters_data)} chapters!")

if __name__ == "__main__":
    process_light_novel()
