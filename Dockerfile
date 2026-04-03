# Multi-stage build for RD signup service
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM deps AS build
COPY tsconfig.json ./
COPY wealthbridge-os ./wealthbridge-os
COPY deepflex ./deepflex
COPY tax ./tax
COPY scripts ./scripts
COPY capsules ./capsules
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/dist ./dist
COPY docs ./docs
COPY data ./data
EXPOSE 8088
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://localhost:8088/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/scripts/rd-signup-server.js"]
