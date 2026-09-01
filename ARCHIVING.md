# Video archiving design

The public searchable catalog and each user's private media archive are deliberately separate.

## Current architecture: BYOS Google Drive

```text
GitHub Pages
└── public battle catalog
    ├── dancer / year / round metadata
    └── official SDF / YouTube links

Browser
└── Google Identity Services
    └── scope: drive.file
        ↓
User's own Google Drive
└── House Dance Archive/
    ├── .house-dance-index.json
    └── Summer Dance Forever/
        └── YYYY/House/Round/video files
```

The browser uploads directly to Google Drive. The video does not pass through a project backend and is never stored in Git/Git LFS.

## Why `drive.file`

The app requests only:

```text
https://www.googleapis.com/auth/drive.file
```

The goal is least-privilege access: the app manages files it creates/uses rather than requesting broad access to the user's entire Drive.

The OAuth access token is kept only in browser memory. It is not committed to GitHub and is not stored in `localStorage`.

The Web OAuth **client ID** may be stored in browser `localStorage`; a client ID is a public application identifier, not a client secret.

## Private index

The public catalog ID is the durable join key. Example:

```text
sdf-2025-house-top12-frankwa-vs-rachad
```

The user's Drive contains a separate private mapping:

```json
{
  "version": 1,
  "updatedAt": "2026-09-01T00:00:00.000Z",
  "archives": {
    "sdf-2025-house-top12-frankwa-vs-rachad": {
      "provider": "google-drive",
      "fileId": "1abc...",
      "name": "SDF 2025 House Top 12 - Frankwa vs Rachad.mp4",
      "mimeType": "video/mp4",
      "size": 123456789,
      "md5Checksum": "...",
      "webViewLink": "https://drive.google.com/...",
      "uploadedAt": "2026-09-01T00:00:00.000Z"
    }
  }
}
```

This means clearing browser storage or moving to another device does not destroy the archive mapping. Reconnect the same Google Drive and reload the private index.

## Upload design

Large videos use Google Drive resumable uploads:

1. Browser obtains a short-lived OAuth access token after an explicit user action.
2. Browser creates a resumable Drive upload session.
3. File bytes go directly from the user's device to Google's upload endpoint in chunks.
4. On success, the Drive file ID and metadata are written to `.house-dance-index.json`.
5. The catalog card shows `Drive backup`.

The uploaded Drive files also receive `appProperties` containing the battle ID/year/round so a later recovery tool can rebuild mappings if the private JSON index is ever damaged.

## Playback / access behavior

Current V1 behavior:

```text
battle
├── Watch → official YouTube/SDF source
└── Backup → private Google Drive webViewLink
```

The app does not make private Drive files public. A Drive backup opens under the user's existing Google authorization.

A future version can add authenticated in-app streaming, but opening the private Drive file is intentionally simpler for the first static implementation.

## Future provider abstraction

The battle catalog should never depend on Google Drive-specific fields. Private archive entries already carry a provider name so additional BYOS providers can be added later:

```json
{
  "provider": "google-drive",
  "fileId": "..."
}
```

Possible future providers:

- OneDrive App Folder / Files API
- Dropbox app folder
- S3-compatible storage
- WebDAV
- self-hosted storage

If a central archive is ever needed for public/authorized playback, Cloudflare R2 or Backblaze B2 can be added as a separate server-managed provider. That is not required for the current self-use/static phase.

## Recovery

Two mechanisms reduce the chance of losing the catalog-to-file mapping:

1. `.house-dance-index.json` in the archive root
2. Drive `appProperties.hdvcBattleId` attached to each uploaded video

A future `Rebuild index` action can search app-created Drive files by these properties and reconstruct the JSON index.

## Copyright / platform note

The fact that a video is publicly viewable on YouTube does not itself grant a separate redistribution/download license. The project therefore does **not** include a mass-download/re-upload pipeline for third-party copyrighted videos.

The private archive layer is for copies the user is permitted to retain/use. Do not publicly expose private archive files unless redistribution rights permit it.

## Secrets

This static implementation intentionally has no client secret and no refresh-token backend.

Never add long-lived provider credentials, refresh tokens, service-account keys, or storage secrets to this public repository.
