# PM Store — Koyeb / generic Node container
# Build:       docker build -t pm-store .
# Run:         docker run -p 8000:8000 -e NODE_ENV=production pm-store
FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the rest of the app
COPY . .

EXPOSE 8000

CMD ["node", "server.js"]
