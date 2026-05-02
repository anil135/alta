# Deployment Guide (Real-Time Ready)

This guide gives two practical options:

- Option A: EC2 + Docker Compose (fastest)
- Option B: ECS Fargate (managed)

---

## Prerequisites

- AWS account
- S3 bucket containing keys in `Location/Camera/Day/file` format
- IAM credentials with `s3:ListBucket` and `s3:GetObject` permissions for that bucket
- Domain + SSL certificate (recommended for production)

---

## Option A - EC2 + Docker Compose

### 1. Launch EC2

- Ubuntu 22.04
- Security Group inbound:
  - `22` (SSH, restricted IP)
  - `80` (HTTP)
  - `443` (HTTPS)

### 2. Install Docker

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker ubuntu
newgrp docker
```

### 3. Copy project to server

Use SCP, Git, or upload zip and extract.

### 4. Configure environment

Edit `backend/.env` with production values.

### 5. Start service

```bash
docker compose up --build -d
```

### 6. Optional reverse proxy (Nginx + SSL)

Point Nginx to `http://127.0.0.1:8000`, then use Certbot for HTTPS.

---

## Option B - ECS Fargate

### 1. Build and push image to ECR

```bash
aws ecr create-repository --repository-name s3-retrieval-portal
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker build -f backend/Dockerfile -t s3-retrieval-portal .
docker tag s3-retrieval-portal:latest <account>.dkr.ecr.<region>.amazonaws.com/s3-retrieval-portal:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/s3-retrieval-portal:latest
```

### 2. Create ECS resources

- ECS cluster
- Task definition (container port 8000)
- Service with Application Load Balancer
- Security group allowing ALB to task on 8000

### 3. Add environment variables

Set all env variables from `backend/.env` in task definition or Secrets Manager.

### 4. Route HTTPS traffic

- Attach ACM certificate to ALB listener 443
- Forward to target group of ECS service

---

## IAM policy (example)

Attach to app runtime role/user:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

---

## Operational checklist

- Use PostgreSQL in production (`DATABASE_URL`)
- Change `JWT_SECRET` to strong secret
- Enable HTTPS only
- Restrict CORS to production UI domain
- Monitor logs (CloudWatch or equivalent)
- Enable backups for database
