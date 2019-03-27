FROM node:8.7.0-alpine

RUN mkdir -p /server
WORKDIR /server

COPY package.json /server
COPY yarn.lock /server

RUN npm install

COPY ./src /server/src

CMD ["npm", "start"]
