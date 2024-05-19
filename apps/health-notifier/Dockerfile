FROM node:20-alpine3.18

WORKDIR /workspace

RUN apk add --update curl
RUN npm i -g rimraf

COPY package.json yarn.lock turbo.json ./

COPY apps/health-notifier ./apps/health-notifier
COPY packages/marginfi-client-v2 ./packages/marginfi-client-v2
COPY packages/mrgn-common ./packages/mrgn-common

RUN yarn
RUN yarn build

WORKDIR /workspace/apps/health-notifier

EXPOSE 8080
CMD [ "yarn", "start" ]
