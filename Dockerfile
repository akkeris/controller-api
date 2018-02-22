FROM node:8
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . /usr/src/app
RUN NODE_ENV=production npm install
EXPOSE 5000
CMD [ "npm", "start" ]
