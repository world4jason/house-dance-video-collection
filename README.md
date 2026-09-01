# House Dance Video Collection

A small searchable library for **Summer Dance Forever / House Dance** videos.

## What it does

- Search by dancer name (`SHUHO`, `Hiro`, `Kazane`)
- Filter by year and round (`2023 + Top 12`)
- Switch person role: danced / judged / all appearances
- Play indexed official YouTube videos in-place
- Track watched videos in browser `localStorage`
- Keep an optional `archiveUrl` fallback for lawful backup copies
- Share a filtered view through URL query parameters

## Current catalog

- **2025:** complete main House battle catalog (Top 24 → Final)
- **2023:** main bracket metadata indexed; direct YouTube URLs are still being backfilled
- **2024:** official full-stream + Final seeded
- **2022:** Final seeded; catalog backfill pending

The data file is `data/battles.json`.

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

If you have a lawful backup copy, set `archiveUrl` to your private/self-hosted object URL. The UI will expose the backup as a secondary source.

Recommended storage design:

1. Keep this Git repository as the durable metadata/index.
2. Keep media in object storage or a NAS, not Git/Git LFS.
3. Use stable object keys, for example `sdf/2025/house/top12/frankwa-vs-rachad.mp4`.
4. Keep the bucket private unless you have redistribution rights.
5. Maintain at least two copies if the archive matters.

## Sources

Primary catalog sources are the Summer Dance Forever official website and official YouTube channel. Some older bracket metadata is cross-checked against DanceDeets while direct official links are being backfilled.
