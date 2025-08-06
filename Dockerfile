FROM node:18

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production --legacy-peer-deps

# Copy source code
COPY . .

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]