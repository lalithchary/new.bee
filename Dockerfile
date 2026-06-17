FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source
COPY server/ ./server/
COPY client/ ./client/

# Create data directories
RUN mkdir -p data/history data/uploads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Run as non-root user
RUN addgroup -S newbee && adduser -S newbee -G newbee
RUN chown -R newbee:newbee /app
USER newbee

CMD ["node", "server/index.mjs"]
