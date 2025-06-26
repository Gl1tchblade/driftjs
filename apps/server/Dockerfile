FROM oven/bun:latest as base

# Set working directory to the monorepo root inside the container
WORKDIR /app

# Copy root-level dependencies (package.json, bun.lock, turbo.json)
COPY package.json bun.lock turbo.json ./

# Copy the server application directory
COPY apps/server apps/server

# Install dependencies for the whole monorepo
RUN bun install

# Build the server application
RUN bun run build --filter=server

# Production image
FROM oven/bun:latest

# ------------------------------
# 1) Ensure Bun runtime has access to all installed packages by copying the monorepo-level "bun" cache from the builder stage.
# 2) Switch WORKDIR directly to the **server** package so that we can rely on the scripts defined **inside** that package (no more tricky --filter flag).
# 3) Only copy the artefacts actually needed at runtime: the compiled dist, the package.json (to satisfy Bun's module resolution), the package-local node_modules and the bun cache.
# 4) Entrypoint simply runs the "start" script defined in apps/server/package.json.
# ------------------------------
WORKDIR /app/apps/server

# Copy monorepo root dependencies (used by all packages)
COPY --from=base /app/node_modules /app/node_modules

# Runtime artefacts for the server package
COPY --from=base /app/apps/server/dist ./dist

# Copy package.json
COPY --from=base /app/apps/server/package.json ./package.json

# Expose the port the Elysia server listens on
EXPOSE 3000

# Start the server (uses the "start" script from package.json)
CMD ["bun", "run", "start"] 