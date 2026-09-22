import urllib.request
import re
import os

url = 'https://web.archive.org/web/20191118211348/https://unmeii.com/'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

try:
    with urllib.request.urlopen(req, timeout=20) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        
        # Look for icon links
        matches = re.findall(r'<link[^>]+>', html, re.I)
        icon_links = []
        for m in matches:
            if 'icon' in m.lower():
                href = re.search(r'href=["\']([^"\']+)["\']', m, re.I)
                if href:
                    icon_links.append(href.group(1))
        
        print("Found icon links:", icon_links)
        
        for link in icon_links:
            if not link.startswith('http'):
                if link.startswith('//'):
                    full_url = 'https:' + link
                elif link.startswith('/'):
                    full_url = 'https://web.archive.org' + link
                else:
                    full_url = 'https://web.archive.org/web/20191118211348/https://unmeii.com/' + link
            else:
                full_url = link
            
            print("Attempting to download:", full_url)
            try:
                icon_req = urllib.request.Request(full_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(icon_req, timeout=15) as icon_resp:
                    content = icon_resp.read()
                    print(f"Downloaded {len(content)} bytes from {full_url}")
                    ext = ".ico" if ".ico" in full_url.lower() else ".png"
                    out_path = os.path.join(r"c:\Users\stapi\OneDrive\Belgeler\unmei_website\assets", f"original_favicon{ext}")
                    with open(out_path, "wb") as f:
                        f.write(content)
                    print(f"Saved to {out_path}")
            except Exception as e:
                print(f"Failed {full_url}: {e}")

except Exception as e:
    print("Page fetch error:", e)
