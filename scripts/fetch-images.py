#!/usr/bin/env python3
"""Unduh poster film tiap Godzilla dari Wikipedia ke public/images/."""
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

PAGES = [
    ("showa-1954", "Godzilla (1954 film)"),
    ("showa-hero", "Destroy All Monsters"),
    ("heisei", "Godzilla vs. King Ghidorah"),
    ("burning", "Godzilla vs. Destoroyah"),
    ("millennium", "Godzilla 2000"),
    ("gmk", "Godzilla, Mothra and King Ghidorah: Giant Monsters All-Out Attack"),
    ("shin", "Shin Godzilla"),
    ("ultima", "Godzilla Singular Point"),
    ("minus-one", "Godzilla Minus One"),
    ("earth", "Godzilla: Planet of the Monsters"),
    ("legendary", "Godzilla: King of the Monsters (2019 film)"),
    ("evolved", "Godzilla x Kong: The New Empire"),
]

UA = {"User-Agent": "GodzillaTypes/1.0 (personal fan project)"}
OUT = Path(__file__).resolve().parent.parent / "public" / "images"
OUT.mkdir(parents=True, exist_ok=True)

failed = []
for gid, title in PAGES:
    if list(OUT.glob(f"{gid}.*")):
        print(f"SKIP {gid:12s} sudah ada")
        continue
    time.sleep(4)
    try:
        api = "https://en.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(title)
        req = urllib.request.Request(api, headers=UA)
        data = json.load(urllib.request.urlopen(req, timeout=20))
        img = (data.get("originalimage") or data.get("thumbnail") or {}).get("source")
        if not img:
            raise ValueError("tidak ada gambar di halaman")
        ext = ".png" if img.lower().endswith(".png") else ".jpg"
        dest = OUT / f"{gid}{ext}"
        req2 = urllib.request.Request(img, headers=UA)
        dest.write_bytes(urllib.request.urlopen(req2, timeout=30).read())
        print(f"OK   {gid:12s} {dest.name:20s} {dest.stat().st_size // 1024} KB  <- {title}")
    except Exception as e:
        failed.append(gid)
        print(f"FAIL {gid:12s} {e}")

sys.exit(1 if failed else 0)
