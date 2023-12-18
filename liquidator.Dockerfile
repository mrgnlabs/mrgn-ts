FROM node:lts-bullseye

# WORKDIR /workspace 
# Create and change to the app directory.
WORKDIR /app

COPY . .

RUN yarn install
RUN yarn build
ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app/apps/alpha-liquidator

# https://redis.io/docs/manual/eviction/
# volatile-lru: Removes least recently used keys with the expire field set to true.
CMD "./scripts/start.sh"