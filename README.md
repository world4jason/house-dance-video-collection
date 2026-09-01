# House Dance Video Collection

A searchable library for **Summer Dance Forever / House Dance** videos.

## What it does

- Search by dancer name (`SHUHO`, `Hiro`, `Kazane`)
- Filter by year and round (`2023 + Top 12`)
- Switch person role: danced / judged / all appearances
- Play indexed official YouTube videos in-place
- Track watched videos in browser `localStorage`
- Keep an optional archive fallback for lawful backup copies
- Share a filtered view through URL query parameters

## Current catalog

There are currently **72 indexed entries** across 2022–2025.

- **2025:** complete 27-video main House battle catalog, Top 24 → Final
- **2024:** 15 entries indexed, including the official full stream plus Judge Battles → Final and selected Top 24/Top 12/Top 6 videos. The official House Dance Forever 2024 playlist contains 27 main-battle videos; remaining early-round entries are being backfilled.
- **2023:** Top 24 / Top 12 / Top 6 bracket metadata indexed, with a growing set of direct official YouTube links; later-round backfill is still in progress.
- **2022:** 7 official videos indexed, including one Top 24, all three currently located Judge Battles, both Semis, and the Final; early rounds are being backfilled.

Catalog files are split by year under `data/battles-YYYY.json`.

## Run locally

Because the page loads JSON with `fetch()`, serve the folder instead of opening `index.html` directly:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

The project is plain static HTML/CSS/JS. Enable GitHub Pages with the `main` branch / repository root as the source.

## Data model

```json
{
  "id": "sdf-2025-house-top12-frankwa-vs-rachad",
  "year": 2025,
  "round": "top12",
  "roundLabel": "Top 12",
  "teams": [["Frankwa"], ["Rachad"]],
  "dancers": ["Frankwa", "Rachad"],
  "winner": ["Frankwa"],
  "judges": ["Hiro", "Shan S", "Yugson"],
  "youtubeId": "m00HBGEO4FY",
  "officialUrl": "https://www.summerdanceforever.com/...",
  "archiveUrl": null
}
```

For long livestreams, the schema also supports `start` and `end` seconds so one source video can behave like separate battle entries without cutting/re-uploading the file.

## Archiving

This repository intentionally stores **metadata and links, not copied copyrighted video files**.

If you have a copy you are permitted to retain/use, keep the media outside GitHub in private object storage or on a NAS and attach it to the battle record as a fallback source. See [ARCHIVING.md](./ARCHIVING.md) for the recommended setup.

The intended playback order is:

1. Official Summer Dance Forever / YouTube source
2. Authorized private archive fallback, when available
3. Metadata remains searchable even if every video source disappears

## Sources

Primary catalog sources are the Summer Dance Forever official website and official YouTube channel. Some older bracket metadata is cross-checked against DanceDeets while direct official links are being backfilled.
