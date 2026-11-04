FROM node:24-alpine AS base

RUN apk add --no-cache \
    clamav \
    clamav-daemon \
    yara \
    file \
    libmagic \
    unzip \
    p7zip \
    && rm -rf /var/cache/apk/*

RUN addgroup --system --gid 1001 scanner && \
    adduser --system --uid 1001 scanner

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

RUN mkdir -p /tmp/centinela/scratch && \
    chown -R scanner:scanner /tmp/centinela && \
    chown -R scanner:scanner /var/lib/clamav && \
    chown -R scanner:scanner /app

USER scanner

CMD ["node", "src/worker.js"]
