# Ein Container für alles (spec.md > Stack): Build in Node, Lauf aus Node —
# SQLite-Datei und Angebots-/Rezept-Kataloge liegen im data/-Bind-Mount.
FROM node:22-alpine

RUN corepack enable
WORKDIR /app

# Manifeste zuerst — Layer-Cache für die Abhängigkeiten
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# Quellen + Build (shared → api → web)
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web
RUN pnpm build

# Gebaute SPA statisch durch den API-Server ausliefern
ENV FEP_WEB_DIST=/app/apps/web/dist
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "--env-file-if-exists=.env", "apps/api/dist/server.js"]
