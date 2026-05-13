FROM node:18-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application code
COPY tsconfig.json ./
COPY src/ ./src/
COPY .env ./

# Build the TypeScript code
RUN npm run build

# Start the Node.js application
# Render will provide the PORT env var; we don't hardcode EXPOSE if possible,
# but keeping it as a hint.
EXPOSE 4000
CMD ["node", "dist/server.js"]

