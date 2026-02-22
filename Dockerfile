FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    chromium \
    imagemagick \
    graphicsmagick \
    webp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Start the bot
CMD ["node", "index.js"]
