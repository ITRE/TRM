FROM node:8.7.0-alpine

RUN mkdir -p /client/trm
WORKDIR /client/trm

COPY trm/package.json /client/trm
COPY trm/yarn.lock /client/trm

RUN npm install

COPY ./trm/src /client/trm/src
COPY ./trm/public /client/trm/public

CMD ["npm", "start"]
