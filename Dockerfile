FROM 730335485377.dkr.ecr.us-east-1.amazonaws.com/api:latest

RUN mkdir -p /usr/app/

WORKDIR /usr/app

ADD ./src /usr/app/src

ADD ./package.json .

ADD ./tsconfig.json .

ADD ./tsup.config.ts .

ADD ./yarn.lock .

ADD .env .

RUN apk add --no-cache make gcc g++ python && \
    yarn install && \
    yarn rebuild bcrypt --build-from-source && \
    apk del make gcc g++ python

RUN yarn build

CMD yarn start
