# Use a stable Node.js version
FROM node:22-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the server's package files
COPY server/package*.json ./

# Install dependencies for the server
RUN npm install

# Copy the rest of the server code
COPY server/ .

# Expose the standard port
EXPOSE 3001

# Start the server
CMD ["node", "index.js"]
