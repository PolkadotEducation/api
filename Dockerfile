FROM 730335485377.dkr.ecr.us-east-1.amazonaws.com/api:latest

RUN mkdir -p /usr/app/

WORKDIR /usr/app

ADD ./src /usr/app/src

ADD ./package.json .

ADD ./tsconfig.json .

ADD ./tsup.config.ts .

ADD ./yarn.lock .

ADD .env .

RUN yarn install --frozen-lockfile

RUN yarn build

CMD yarn start
