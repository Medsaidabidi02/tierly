# Use a stable Node.js version
FROM node:22-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port (Railway provides this)
EXPOSE 3001

# Start the server
CMD ["node", "index.js"]
