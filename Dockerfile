FROM node:14

RUN mkdir /app

ADD . /app

WORKDIR /app

RUN npm install

ENV NODE_ENV=prod

CMD ["node", "index.js"]