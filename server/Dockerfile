FROM node:8.7.0-alpine

RUN mkdir -p /server/src
WORKDIR /server/src

COPY package.json /server/src
COPY yarn.lock /server/src

RUN npm install

COPY ./src /server/src

CMD ["npm", "run", "dev"]
