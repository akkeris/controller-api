FROM node:12-alpine
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY index.js /usr/src/app/index.js
COPY start.sh /usr/src/app/start.sh
COPY package.json /usr/src/app/package.json
RUN npm install
EXPOSE 9000
CMD [ "./start.sh" ]
