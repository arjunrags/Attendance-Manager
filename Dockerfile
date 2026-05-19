# Use Node.js LTS version
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY server/package*.json ./
RUN npm install --omit=dev

# Copy server source
COPY server/src ./src

# Copy built client to be served as static files
COPY client_built ./client_built

# Expose port and start
EXPOSE 5000
CMD [ "node", "src/index.js" ]
