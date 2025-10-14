FROM node:23-alpine AS base
# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS builder
ARG CONFIG_ENV
ARG APP_VERSION
ARG GIT_HASH
ARG DOCKER_BUILD="1"

RUN apk add --no-cache libc6-compat python3 make g++ openssl
WORKDIR /app

# Copy all files needed for install
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy environment-specific .env file if it exists, otherwise use default
RUN if [ -f ".env.${CONFIG_ENV}" ]; then \
      cp ".env.${CONFIG_ENV}" .env.local; \
    elif [ -f ".env" ]; then \
      cp .env .env.local; \
    fi

# Add build-time metadata
RUN if [ -n "${APP_VERSION}" ]; then \
      echo "NEXT_PUBLIC_APP_VERSION=${APP_VERSION}" >> .env.local; \
    fi && \
    if [ -n "${CONFIG_ENV}" ]; then \
      echo "NEXT_PUBLIC_CONFIG_ENV=${CONFIG_ENV}" >> .env.local; \
    fi && \
    if [ -n "${GIT_HASH}" ]; then \
      echo "NEXT_PUBLIC_GIT_HASH=${GIT_HASH}" >> .env.local; \
    fi

# Makes the next output standalone
ENV NEXT_STANDALONE_OUTPUT="true"

RUN pnpm build

# Prune dev dependencies to reduce size (ignore scripts since tsx will be removed)
RUN pnpm prune --prod --ignore-scripts

FROM node:23-alpine AS runner
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

USER nextjs

# Copy only necessary files from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/db/migrations ./src/lib/db/migrations

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# server.js is created by next build from the standalone output
CMD ["node", "server.js"]