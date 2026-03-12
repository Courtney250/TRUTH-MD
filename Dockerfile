FROM node:20

  RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg imagemagick webp git && apt-get clean && rm -rf /var/lib/apt/lists/*

  WORKDIR /app

  COPY package*.json ./

  RUN npm install --legacy-peer-deps --ignore-scripts

  RUN cd /app/node_modules/better-sqlite3 && npx --yes prebuild-install -r napi || echo "prebuild download skipped"

  COPY . .

  EXPOSE 3000 5000

  ENV NODE_ENV=production

  CMD ["npm", "run", "start"]
  