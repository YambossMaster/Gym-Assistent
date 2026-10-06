FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY scripts/install-hooks.mjs scripts/install-hooks.mjs
RUN npm ci
COPY apps/api apps/api
COPY apps/web apps/web
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPPORT_EMAIL
ARG VITE_INTERNAL_ALPHA
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPPORT_EMAIL=$VITE_SUPPORT_EMAIL
ENV VITE_INTERNAL_ALPHA=$VITE_INTERNAL_ALPHA
RUN node -e "for (const key of ['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY']) if (!process.env[key]) throw new Error('Missing '+key)" && npm run build

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY scripts/install-hooks.mjs scripts/install-hooks.mjs
RUN npm ci --omit=dev
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/web/dist apps/web/dist
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DEPLOYMENT_TARGET=production
EXPOSE 3000
CMD ["node", "apps/api/dist/start.js"]
