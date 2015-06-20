FROM node:0.12.4

ENV NODE_ENV production

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/

RUN npm install -g node-gyp json babel
RUN npm install

COPY . /usr/src/app

RUN npm run babel

COPY bin/* /usr/local/bin/

EXPOSE 3000

CMD [ "demo-start" ]
