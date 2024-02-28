FROM node:slim

ENV NODE_ENV production
USER node

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# TODO: add yarn.lock file?
COPY package.json  ./

RUN yarn install --production --frozen-lockfile

EXPOSE 8080
CMD [ "node", "dist/index.js" ]
