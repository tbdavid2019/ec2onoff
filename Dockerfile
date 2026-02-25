FROM node:22-alpine

# Use a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Set proper permissions for the database directory and files
RUN chown -R appuser:appgroup /app

USER appuser

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
