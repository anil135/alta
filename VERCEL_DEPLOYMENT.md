# Vercel Demo Deployment

## 1) Push to GitHub

- Create GitHub repository
- Upload full `S3-Retrieval-Portal` project

## 2) Import in Vercel

- New Project -> Import GitHub repo
- Keep root folder as project root
- `vercel.json` is already included

## 3) Add Vercel environment variables

- `JWT_SECRET` (required)
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`
- `S3_KEY_PATTERN`
- `S3_PRESIGNED_TTL_SECONDS`
- `FRONTEND_ORIGIN` = your Vercel URL

## 4) Generate JWT secret

PowerShell:

```powershell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

## 5) Deploy

After deployment:

- UI: `/`
- Health: `/health`
- Auth: `/auth/register`, `/auth/login`
- Data: `/s3/locations`, `/s3/cameras`, `/s3/days`, `/s3/search`

## Demo limitation (no DB)

User accounts are stored in memory only and reset after function restart/redeploy.
