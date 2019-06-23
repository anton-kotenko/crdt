FROM node:10-alpine
WORKDIR /home/app
# node-gyp requires python and all build toolchain
RUN apk update && apk add python make gcc g++

COPY package.json index.js /home/app/
RUN npm install

COPY config/index.js config/default.json /home/app/config/
COPY src /home/app/src/
CMD ["npm", "start"]
