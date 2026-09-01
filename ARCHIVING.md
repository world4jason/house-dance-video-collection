# Video archiving design

The searchable catalog and the media archive should be kept separate.

## Goals

- The catalog remains usable even when an official YouTube/SDF URL disappears.
- Official sources are always preferred while they are available.
- A private fallback copy can be attached when you are permitted to keep/use that copy.
- Video files never live in Git or Git LFS.
- Storage credentials never live in this public repository.

## Recommended layout

```text
GitHub
└── house-dance-video-collection
    ├── data/battles-2025.json
    ├── data/battles-2024.json
    └── ...

Private object storage / NAS
└── sdf/
    ├── 2025/house/top24/...
    ├── 2025/house/top12/...
    ├── 2024/house/...
    └── ...
```

A future battle entry can use an archive object instead of exposing a permanent public URL:

```json
{
  "youtubeId": "m00HBGEO4FY",
  "officialUrl": "https://www.summerdanceforever.com/...",
  "archive": {
    "provider": "r2",
    "key": "sdf/2025/house/top12/frankwa-vs-rachad.mp4",
    "sha256": "...",
    "bytes": 0,
    "archivedAt": "2026-09-01",
    "rightsNote": "permission/license/source note"
  }
}
```

The web app should request a short-lived signed playback URL from a small backend/Worker. Do not make the bucket public just to simplify playback.

## Storage choices

### Cloudflare R2 — preferred playback archive

Good fit when the website may play archive copies because R2 is S3-compatible and does not charge internet egress. Standard storage is currently $0.015/GB-month with a 10 GB-month monthly free tier.

Official pricing: https://developers.cloudflare.com/r2/pricing/

### Backblaze B2 — preferred inexpensive second copy

Good fit for a second off-site archive/backup. B2 currently starts at $6.95/TB/month, with the first 10 GB free and free egress up to 3× average monthly storage.

Official pricing: https://www.backblaze.com/cloud-storage/pricing

### Local NAS / external disks

Useful as the first or second copy, especially when the archive becomes large. Do not make one NAS or one disk the only copy.

## Suggested retention strategy

For anything that matters, use a simple 3-2-1-style approach:

1. Working/archive copy: private R2 bucket or NAS
2. Second copy: B2 or another physical disk/location
3. GitHub retains only the metadata, source URLs, checksums, and archive object keys

Store a SHA-256 checksum for each archived file so corruption or accidental replacement can be detected later.

## Playback fallback

The intended behavior is:

```text
battle result
  ↓
official YouTube/SDF playable?
  ├─ yes → play official source
  └─ no
      ↓
authorized archive object available?
      ├─ yes → request short-lived signed URL → play archive
      └─ no  → keep battle metadata visible and mark video unavailable
```

## Copyright / platform note

The fact that a video is publicly viewable on YouTube does not itself grant a separate redistribution/download license. YouTube permits normal playback and embeds, while its Terms restrict reproducing/downloading/redistributing content unless the Service expressly authorizes it or the required permission/legal entitlement exists.

So this project does **not** include a mass-download/re-upload pipeline for third-party copyrighted videos. The archive layer is designed for copies you are permitted to retain/use, such as your own material, material supplied or licensed by the rights holder, or other uses for which you are legally entitled.

Do not publicly expose an archive bucket unless you have redistribution rights.

## Secrets

Never commit any of these to this repository:

- R2 access key / secret
- B2 application key
- Cloudflare API token
- signed-URL secret

Keep them in the hosting platform's environment/secret storage. The browser should never receive a long-lived storage credential.
