# S3 Storage Setup

This app supports S3 for file uploads (dev/prod). Dev uses presigned PUT from the browser; prod should keep the bucket private and serve via CDN (CloudFront + OAC) or signed GETs.

## Buckets
- us-east-2 (example/ours):
  - Dev/Test: `cnai-dts` (public GET on `uploads/` only)
  - Prod: `cnai-prod` (private)
- Enable: default encryption (SSE-S3) and versioning.

## CORS
- Dev (`cnai-dts`): allow PUT/GET/HEAD from
  - `http://localhost:3000`, `http://127.0.0.1:3000`
  - `https://cnai-dev.dts.cluster`, `http://cnai-dev.dts.cluster`
  - `https://cnai-dev.comparenetworks.cloud`, `http://cnai-dev.comparenetworks.cloud`
- Prod (`cnai-prod`): GET/HEAD only from `https://cnai.comparenetworks.cloud` (no browser PUT).

## Dev public-read policy (prefix-only)
Grant public GET for `uploads/` prefix on `cnai-dts` only:
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPublicReadForUploadsPrefix",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::cnai-dts/uploads/*"
    }
  ]
}
```

## IAM (app runtime)
Least privilege for app role/user:
- Actions: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:HeadObject`
- Resources: `arn:aws:s3:::<bucket>/uploads/*`

## Env configuration
- Dev/local:
  - `FILE_STORAGE_TYPE=s3`
  - `FILE_STORAGE_PREFIX=uploads`
  - `FILE_STORAGE_S3_BUCKET=cnai-dts`
  - `FILE_STORAGE_S3_REGION=us-east-2` (or `AWS_REGION`)
  - Use AWS SSO/profile or `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`.
- Prod:
  - `FILE_STORAGE_S3_BUCKET=cnai-prod`
  - Prefer CloudFront; set `FILE_STORAGE_S3_PUBLIC_BASE_URL=https://<cdn-domain>`.

## Verify locally
- Ensure `aws sso login --profile AWSPowerUserAccess`.
- Test presign script:
```
AWS_PROFILE=AWSPowerUserAccess \
FILE_STORAGE_TYPE=s3 \
FILE_STORAGE_S3_BUCKET=cnai-dts \
FILE_STORAGE_S3_REGION=us-east-2 \
pnpm tsx scripts/verify-s3-upload-url.ts
```
- You should get `{ directUploadSupported: true, url, key, method: PUT }`.
- Upload with curl (optional): `curl -X PUT -H "Content-Type: image/png" --data-binary @file.png "<url>"`.
