FROM node:lts-bullseye

# WORKDIR /workspace 
# Create and change to the app directory.
WORKDIR /app

RUN npm install -g pm2
RUN pm2 install pm2-logrotate
RUN apt-get update
RUN apt-get install -y g++ make python3-pip redis

COPY . .

RUN yarn install
RUN yarn build
ENV NODE_ENV=production
ENV PORT=8080

# https://redis.io/docs/manual/eviction/
# volatile-lru: Removes least recently used keys with the expire field set to true.
CMD redis-server --maxmemory 2048mb --maxmemory-policy volatile-lru --daemonize yes && yarn serve
