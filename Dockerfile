FROM node:0.12.4

ENV TRAVEL_AUTO true

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/

RUN npm install -g node-gyp
RUN npm install

COPY . /usr/src/app

RUN npm run babel

EXPOSE 3000

CMD [ "demo-start" ]
