#!/usr/bin/env python3
"""Download full Bible translations from bolls.life API using curl."""
import json, os, time, subprocess, sys

API = "https://bolls.life"

TRANSLATIONS = {
    "UBIO": "ubio",
    "CUV23": "cuv",
    "UKRK": "ukrk",
}

BOOK_CODES = [
    'gen', 'exo', 'lev', 'num', 'deu', 'jos', 'jdg', 'rut', '1sa', '2sa',
    '1ki', '2ki', '1ch', '2ch', 'ezr', 'neh', 'est', 'job', 'psa', 'pro',
    'ecc', 'sng', 'isa', 'jer', 'lam', 'ezk', 'dan', 'hos', 'jol', 'amo',
    'oba', 'jon', 'mic', 'nam', 'hab', 'zep', 'hag', 'zec', 'mal',
    'mat', 'mrk', 'luk', 'jhn', 'act', 'rom', '1co', '2co', 'gal', 'eph',
    'php', 'col', '1th', '2th', '1ti', '2ti', 'tit', 'phm', 'heb', 'jas',
    '1pe', '2pe', '1jn', '2jn', '3jn', 'jud', 'rev'
]

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'bible')


def curl_json(url):
    result = subprocess.run(
        ['curl', '-s', '--max-time', '30', url],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise Exception(f"curl failed: {result.stderr}")
    return json.loads(result.stdout)


def download_translation(slug, trans_key):
    print(f"\n{'='*60}")
    print(f"Downloading {slug} → {trans_key}")
    print(f"{'='*60}")

    books = curl_json(f"{API}/get-books/{slug}/")
    # Build bookid → info map
    book_map = {b['bookid']: b for b in books}
    print(f"Found {len(books)} books in API")

    out_path = os.path.join(OUT_DIR, trans_key)
    os.makedirs(out_path, exist_ok=True)

    total_books = 0
    total_verses = 0

    for idx, code in enumerate(BOOK_CODES):
        bookid = idx + 1  # bookid 1=gen, 2=exo, etc.
        book_info = book_map.get(bookid)
        if not book_info:
            print(f"  {code}: not available in {slug}, skipping")
            continue

        book_name = book_info['name']
        num_chapters = book_info['chapters']
        abbr = code.upper()

        print(f"  [{idx+1:2d}/66] {code} ({book_name}) {num_chapters}ch", end='', flush=True)

        chapters_data = []
        book_verses = 0

        for ch_num in range(1, num_chapters + 1):
            try:
                verses_raw = curl_json(f"{API}/get-text/{slug}/{bookid}/{ch_num}/")
                verses = []
                for v in verses_raw:
                    text = v.get('text', '').strip()
                    if text:
                        text = text.replace('<br/>', ' ').replace('<br>', ' ')
                        verses.append({"verse": v['verse'], "text": text})
                chapters_data.append({"chapter": ch_num, "verses": verses})
                book_verses += len(verses)
            except Exception as e:
                print(f" ERR@ch{ch_num}", end='')
                chapters_data.append({"chapter": ch_num, "verses": []})

            if ch_num % 20 == 0:
                print('.', end='', flush=True)

        book_json = {
            "metadata": {
                "id": abbr,
                "book": book_name,
                "abbreviation": abbr,
                "translation": trans_key,
                "language": "uk"
            },
            "chapters": chapters_data
        }

        filepath = os.path.join(out_path, f"{code}.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(book_json, f, ensure_ascii=False, separators=(',', ':'))

        size_kb = os.path.getsize(filepath) / 1024
        print(f" ✓ {book_verses}v {size_kb:.0f}KB")
        total_books += 1
        total_verses += book_verses

    print(f"\n{slug} done: {total_books} books, {total_verses} verses → {out_path}/")


def main():
    slugs = sys.argv[1:] if len(sys.argv) > 1 else list(TRANSLATIONS.keys())
    for slug in slugs:
        if slug not in TRANSLATIONS:
            print(f"Unknown: {slug}. Available: {list(TRANSLATIONS.keys())}")
            continue
        download_translation(slug, TRANSLATIONS[slug])
    print("\n✅ All done!")


if __name__ == '__main__':
    main()
