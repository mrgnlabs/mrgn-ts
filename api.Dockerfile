FROM node:lts-bullseye

# WORKDIR /workspace 
# Create and change to the app directory.
WORKDIR /app

COPY . .

RUN yarn install
RUN yarn build

WORKDIR /app/apps/marginfi-api

CMD "./scripts/start.sh"