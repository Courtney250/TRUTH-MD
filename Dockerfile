FROM node:20

  RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg imagemagick webp git python3 make g++ && apt-get clean && rm -rf /var/lib/apt/lists/*

  WORKDIR /app

  COPY package*.json ./

  # Step 1: Install all deps with ignore-scripts
  RUN npm install --legacy-peer-deps --ignore-scripts

  # Step 2: Manually install better-sqlite3 with build (has build tools available)
  RUN cd /app/node_modules/better-sqlite3 && npm run build-release || echo "build-release not available, trying rebuild" && cd /app && npm rebuild better-sqlite3 || echo "rebuild failed, trying prebuild" && cd /app/node_modules/better-sqlite3 && npx --yes prebuild-install -r napi || echo "all better-sqlite3 install methods tried"

  COPY . .

  EXPOSE 3000 5000

  ENV NODE_ENV=production

  CMD ["npm", "run", "start"]
  