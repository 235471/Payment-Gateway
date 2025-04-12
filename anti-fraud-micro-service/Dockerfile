# Use a Node LTS version like 20 or 22 for better stability
FROM node:20-slim

# Install necessary packages
# procps is useful for debugging (ps, top)
RUN apt-get update && apt-get install -y --no-install-recommends openssl procps && \
    # Clean up apt cache
    rm -rf /var/lib/apt/lists/*

# Create app directory owned by node user
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

# Set the working directory
WORKDIR /home/node/app

# Switch to the non-root node user
USER node

# Copy package files first to leverage Docker cache
COPY --chown=node:node package*.json ./

# Install dependencies
# Use ci for reproducible installs if package-lock.json exists
# Removed --only=production to install devDependencies needed for start:dev
RUN npm ci || npm install
# If you need devDependencies for start:dev (like ts-node), remove --only=production
# RUN npm ci || npm install

# Copy the rest of the application code
COPY --chown=node:node . .

# Expose the application port defined in your NestJS app (default is 3000)
EXPOSE 3333

# Command to run the application (adjust if your start script is different)
# Use start:dev for development with hot-reloading (requires devDependencies)
# Use start:prod or node dist/main for production builds
CMD [ "sh", "-c", "npx prisma migrate deploy && npm run start:dev" ]
