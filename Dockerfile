FROM node:lts

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg imagemagick webp && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install --production --legacy-peer-deps && npm cache clean --force

COPY . .

EXPOSE 3000

ENV NODE_ENV production

CMD ["node", "--max-old-space-size=512", "--optimize-for-size", "index.js"]