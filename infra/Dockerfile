FROM node:24.21.0-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build
ENV NEXT_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 TURBO_TELEMETRY_DISABLED=1 APP_ENV=ci
ENV NODE_OPTIONS=--max-old-space-size=1536
WORKDIR /source
RUN corepack enable && corepack prepare pnpm@10.34.6 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/dashboard-web/package.json apps/dashboard-web/package.json
COPY apps/public-renderer/package.json apps/public-renderer/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/schemas/package.json packages/schemas/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/queues/package.json packages/queues/package.json
COPY packages/observability/package.json packages/observability/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
ARG APP
RUN case "$APP" in api|worker|dashboard-web|public-renderer) ;; *) exit 1;; esac
RUN pnpm exec turbo run build --concurrency=1 --filter=@website-builder/${APP}
RUN if [ "$APP" = dashboard-web ] || [ "$APP" = public-renderer ]; then \
      mkdir -p /out/apps/${APP}/.next /out/apps/${APP}/node_modules/@website-builder /out/apps/${APP}/node_modules/@next && \
      cp apps/${APP}/package.json /out/apps/${APP}/package.json && \
      cp -R apps/${APP}/.next/standalone /out/apps/${APP}/.next/standalone && \
      cp scripts/next.ts /out/apps/${APP}/launcher.ts && \
      cp -LR node_modules/@next/env /out/apps/${APP}/node_modules/@next/env && \
      cp -LR packages/schemas/node_modules/zod /out/apps/${APP}/node_modules/zod && \
      for package in config schemas observability; do \
        mkdir -p /out/apps/${APP}/node_modules/@website-builder/${package} && \
        cp -R packages/${package}/dist packages/${package}/package.json /out/apps/${APP}/node_modules/@website-builder/${package}/; \
      done && \
      cp -R apps/${APP}/.next/static /out/apps/${APP}/.next/standalone/apps/${APP}/.next/static; \
    else \
      pnpm --filter @website-builder/${APP} deploy --prod /out/apps/${APP}; \
    fi

FROM node:24.21.0-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1
ARG APP
WORKDIR /app/apps/${APP}
COPY --from=build --chown=node:node /out /app
USER node
STOPSIGNAL SIGTERM
CMD ["node", "dist/main.js"]

FROM runtime AS web
CMD ["node", "launcher.ts", "standalone"]
