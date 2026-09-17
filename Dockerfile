# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# IMPORTANT: Vite inlines import.meta.env.VITE_API_URL into the static
# JS bundle at build time — it is NOT read at container runtime the way
# a backend env var would be. Passing this as a normal `environment:`
# entry on the running container (e.g. in docker-compose) does nothing;
# it has to be a build ARG, supplied at image-build time:
#   docker build --build-arg VITE_API_URL=https://api.example.com .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Same build-time-only rule as VITE_API_URL above — the global music
# player's search silently returns nothing without this, it doesn't
# crash, but it also won't start working just by setting a runtime env
# var on an already-built container.
ARG VITE_JAMENDO_CLIENT_ID
ENV VITE_JAMENDO_CLIENT_ID=$VITE_JAMENDO_CLIENT_ID

RUN npm run build

# --- Production stage: serve the static build with nginx ---
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
