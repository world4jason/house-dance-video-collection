# House Dance Video Collection

A searchable library for **Summer Dance Forever / House Dance** videos, with an optional private Google Drive archive.

## What it does

- Search by dancer name (`SHUHO`, `Hiro`, `Kazane`)
- Filter by year and round (`2023 + Top 12`)
- Switch person role: danced / judged / all appearances
- Play indexed official YouTube videos in-place
- Track watched videos in browser `localStorage`
- Connect **your own Google Drive** and privately back up a battle
- Keep the private battle → Drive file mapping in `.house-dance-index.json` inside your Drive
- Upload large video files with Google Drive resumable upload
- Share a filtered catalog view through URL query parameters

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

For this repository the expected Pages URL is:

```text
https://world4jason.github.io/house-dance-video-collection/
```

## Google Drive: one-time setup

The current implementation is deliberately **backend-free**. It uses Google Identity Services in the browser and requests only:

```text
https://www.googleapis.com/auth/drive.file
```

This lets the app manage files it creates/uses without requesting full access to the user's Drive.

### 1. Create a Google Cloud project

Open Google Cloud Console, create/select a project, and enable **Google Drive API**.

### 2. Configure OAuth consent

For personal testing, configure the OAuth consent screen and add your Google account as a test user when required.

### 3. Create a Web OAuth Client ID

Create an OAuth client with application type **Web application**.

Add these Authorized JavaScript origins as needed:

```text
https://world4jason.github.io
http://localhost:8000
```

JavaScript origins contain only scheme + host + optional port, not the repository path.

### 4. Paste the Client ID into the site

Open the site → **Drive setup** → paste the Web OAuth Client ID, for example:

```text
1234567890-abc123.apps.googleusercontent.com
```

The client ID is stored only in browser `localStorage`. It is a public identifier, not a client secret.

Access tokens are **not persisted**. They stay in memory for the current browser session and expire; reconnect when Google requires a new token.

## What Connect Google Drive creates

On first connection the app creates/uses:

```text
My Drive/
└── House Dance Archive/
    ├── .house-dance-index.json
    └── Summer Dance Forever/
        └── 2025/
            └── House/
                ├── Top 24/
                ├── Top 12/
                └── ...
```

The private index maps the public battle ID to your private Drive file ID:

```json
{
  "version": 1,
  "archives": {
    "sdf-2025-house-top12-frankwa-vs-rachad": {
      "provider": "google-drive",
      "fileId": "1abc...",
      "name": "SDF 2025 House Top 12 - Frankwa vs Rachad.mp4",
      "size": 123456789,
      "webViewLink": "https://drive.google.com/...",
      "uploadedAt": "2026-09-01T00:00:00.000Z"
    }
  }
}
```

This private index is not committed to GitHub. Reconnecting from another browser can reload the mapping from Drive.

## Public battle data model

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
  "officialUrl": "https://www.summerdanceforever.com/..."
}
```

For long livestreams, the schema also supports `start` and `end` seconds so one source video can behave like separate battle entries without cutting/re-uploading the file.

## Archiving policy

The repository stores the **public catalog and source links**, not copied video files or user Drive credentials.

The Google Drive feature is intended for copies you are permitted to retain/use. It does not implement mass downloading of third-party copyrighted YouTube videos.

See [ARCHIVING.md](./ARCHIVING.md) for architecture details.

## Sources

Primary catalog sources are the Summer Dance Forever official website and official YouTube channel. Some older bracket metadata is cross-checked against DanceDeets while direct official links are being backfilled.
