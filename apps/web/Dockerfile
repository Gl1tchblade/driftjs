FROM oven/bun:latest as base

# Set working directory to the monorepo root inside the container
WORKDIR /app

# Copy root-level dependencies (package.json, bun.lock, turbo.json)
COPY package.json bun.lock turbo.json ./

# Copy the web application directory
COPY apps/web apps/web

# The API endpoint must be baked into the static build. Allow docker-compose to inject it via build-args.
ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=${VITE_SERVER_URL}

# Limit Bun's concurrent HTTP requests during `bun install` to avoid the 503 registry errors seen in CI.
ENV BUN_CONFIG_MAX_HTTP_REQUESTS=32

# Install dependencies for the whole monorepo
RUN bun install

# Build the web application
RUN bun run build --filter=web

# Production image
FROM oven/bun:latest

# ------------------------------
# Runtime stage – lean image that only contains the artefacts required to serve the static build.
# ------------------------------
WORKDIR /app/apps/web

# Bun package cache (shared, read-only)
# COPY --from=base /app/.bun /app/.bun

# Copy monorepo root dependencies so bunx serve is available
COPY --from=base /app/node_modules /app/node_modules

# Runtime artefacts
COPY --from=base /app/apps/web/dist ./dist

# Copy package.json (needed by bun)
COPY --from=base /app/apps/web/package.json ./package.json

EXPOSE 3001

CMD ["bun", "x", "serve", "-s", "dist", "-l", "3001"] 