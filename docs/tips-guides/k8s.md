# Better Chatbot Kubernetes Deployment

This guide covers deploying better-chatbot on Kubernetes with the included Helm chart.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+
- PV provisioner support in the underlying infrastructure (if using PostgreSQL persistence)

## ⚠️ IMPORTANT: Build Docker Image First

**Before using the Helm chart, you MUST build the Docker image locally:**

```bash
# Build the Docker image (this is required!)
docker build -t better-chatbot:latest -f docker/Dockerfile .
```

The Helm chart uses `imagePullPolicy: IfNotPresent` which means it will use your local image if available, or try to pull from a registry (which will fail since the image isn't published). **Always build the image first!**

## Quick Setup from .env

If you already have a `.env` file configured, you can automatically generate Helm values:

```bash
# 1. Build the Docker image
docker build -t better-chatbot:latest -f docker/Dockerfile .

# 2. Generate Helm values from your .env file
pnpm k8s:values

# 3. Deploy with the generated values
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm install dev-chatbot ./helm/better-chatbot -f helm/better-chatbot/values-local.yaml
```

This will create `helm/better-chatbot/values-local.yaml` with your environment variables properly configured for Kubernetes.

## Manual Installation

### Quick Start (with included PostgreSQL)

```bash
# 1. Build the Docker image first!
docker build -t better-chatbot:latest -f docker/Dockerfile .

# 2. Add the required Bitnami repository for PostgreSQL
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# 3. Install with default values (includes PostgreSQL)
helm install my-chatbot ./helm/better-chatbot \
  --set secrets.OPENAI_API_KEY="your-openai-key" \
  --set secrets.ANTHROPIC_API_KEY="your-anthropic-key" \
  --set secrets.BETTER_AUTH_SECRET="your-secret-key" \
  --set secrets.BETTER_AUTH_URL="http://better-chatbot.local"
```

### Production Setup (with external database)

```bash
# 1. Build the Docker image first!
docker build -t better-chatbot:latest -f docker/Dockerfile .

# 2. Create a values-prod.yaml file
cat > values-prod.yaml << EOF
postgresql:
  enabled: false

secrets:
  DATABASE_URL: "postgres://user:pass@your-db-host:5432/dbname"
  OPENAI_API_KEY: "your-openai-key"
  ANTHROPIC_API_KEY: "your-anthropic-key"
  BETTER_AUTH_SECRET: "your-secret-key"
  BETTER_AUTH_URL: "https://your-domain.com"

ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: your-domain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: your-tls-secret
      hosts:
        - your-domain.com
EOF

helm install my-chatbot ./helm/better-chatbot -f values-prod.yaml
```

## Configuration

### Required Secrets

You must provide these secrets for the application to work:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `secrets.BETTER_AUTH_SECRET` | Secret key for authentication | Random 32+ character string |
| `secrets.BETTER_AUTH_URL` | Base URL of your application | `https://your-domain.com` |
| `secrets.OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `secrets.ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-...` |

### Optional Secrets

| Parameter | Description |
|-----------|-------------|
| `secrets.GOOGLE_GENERATIVE_AI_API_KEY` | Google AI API key |
| `secrets.XAI_API_KEY` | xAI API key |
| `secrets.EXA_API_KEY` | Exa search API key |
| `secrets.GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `secrets.GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `secrets.GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| `secrets.GITHUB_CLIENT_SECRET` | GitHub OAuth client secret |

### Database Configuration

#### Option 1: Included PostgreSQL (Development)
```yaml
postgresql:
  enabled: true
  auth:
    database: "better_chatbot"
    username: "better_chatbot"
    password: "your-password"
```

#### Option 2: External Database (Production)
```yaml
postgresql:
  enabled: false

secrets:
  DATABASE_URL: "postgres://user:pass@host:5432/dbname"
```

### Resource Configuration

```yaml
resources:
  limits:
    cpu: 1000m
    memory: 1024Mi
  requests:
    cpu: 500m
    memory: 512Mi
```

### Ingress Configuration

```yaml
ingress:
  enabled: true
  className: "nginx"
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
  hosts:
    - host: your-domain.com
      paths:
        - path: /
          pathType: Prefix
```

## Upgrading

```bash
helm upgrade my-chatbot ./helm/better-chatbot -f values-prod.yaml
```

## Uninstalling

```bash
helm uninstall my-chatbot
```

## Examples

### Development Setup with Port-Forward

```bash
# 1. Build the Docker image first!
docker build -t better-chatbot:latest -f docker/Dockerfile .

# 2. Install with defaults
helm install dev-chatbot ./helm/better-chatbot \
  --set secrets.OPENAI_API_KEY="sk-..." \
  --set secrets.BETTER_AUTH_SECRET="dev-secret-key" \
  --set secrets.BETTER_AUTH_URL="http://localhost:3000"

# 3. Port-forward to access locally
kubectl port-forward service/dev-chatbot-better-chatbot 3000:3000
```

### Production with Load Balancer

```yaml
service:
  type: LoadBalancer
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
```

## Troubleshooting

### Pod stuck in "ImagePullBackOff" or "ErrImagePull"
This usually means you forgot to build the Docker image locally:

```bash
# Build the image
docker build -t better-chatbot:latest -f docker/Dockerfile .

# Restart the deployment
kubectl rollout restart deployment/my-chatbot-better-chatbot
```

### Check pod logs
```bash
kubectl logs -l app.kubernetes.io/name=better-chatbot
```

### Check database connection
```bash
kubectl exec -it deployment/my-chatbot-better-chatbot -- env | grep DATABASE_URL
```

### Access PostgreSQL (if enabled)
```bash
kubectl exec -it my-chatbot-postgresql-0 -- psql -U better_chatbot -d better_chatbot
```

## Security Considerations

- Always use external secrets management in production (e.g., Azure Key Vault, AWS Secrets Manager)
- Enable network policies to restrict pod-to-pod communication
- Use TLS for all external traffic
- Regularly rotate API keys and database passwords