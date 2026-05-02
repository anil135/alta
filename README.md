# S3 Retrieval Portal (Vercel Demo Ready)

Ready-to-use project for CCTV footage retrieval from AWS S3 with account login and JWT auth.

## Important demo note (no database)

This version uses an **in-memory user store** (no DB required).  
That means registered users reset when the serverless instance restarts/redeploys, which is acceptable for demo use.

## What this project includes

- Login and account creation (JWT auth)
- S3 browsing by `Location -> Camera -> Day`
- Time range filter with hour values (`0-23`)
- Secure download links using S3 pre-signed URLs
- Vercel deployment config (`vercel.json`)

## Expected S3 structure

`location/camera/day/video-file`

Example:

`Mumbai/Camera-01/2026-04-30/13-00-00.mp4`

The app extracts hour (`13`) from filename for range filtering.

## Generate JWT secret (required)

Use one of these commands:

```powershell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

or

```powershell
openssl rand -base64 64
```

Copy output and set it as `JWT_SECRET`.

## Deploy to Vercel from GitHub

### 1) Push this folder to GitHub

- Create a new GitHub repo
- Upload all files from `S3-Retrieval-Portal`

### 2) Import repo in Vercel

- Vercel Dashboard -> New Project -> Import GitHub repository
- Framework: `Other`
- Root directory: project root (where `vercel.json` exists)

### 3) Add Environment Variables in Vercel

Set these:

- `JWT_SECRET` = generated secure random string
- `ACCESS_TOKEN_EXPIRE_MINUTES` = `120`
- `AWS_REGION` = e.g. `ap-south-1`
- `AWS_ACCESS_KEY_ID` = your key
- `AWS_SECRET_ACCESS_KEY` = your secret
- `S3_BUCKET_NAME` = your bucket
- `S3_KEY_PATTERN` = `(?P<hour>\d{2})[:\-_]?\d{2}`
- `S3_PRESIGNED_TTL_SECONDS` = `900`
- `FRONTEND_ORIGIN` = your Vercel app URL (e.g. `https://your-app.vercel.app`)

### 4) Deploy

Click **Deploy**.

The UI opens on `/` and API routes are available under:

- `/auth/*`
- `/s3/*`
- `/health`

## Local run (optional)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000`.

## Package downloadable zip

```powershell
cd scripts
.\package.ps1
```

Zip output:

- `S3-Retrieval-Portal.zip`
