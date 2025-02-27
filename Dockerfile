# Use official Node.js image
FROM node:22-slim

# Set working directory inside the container
WORKDIR /DEV-TINDER

RUN rm -rf node_modules package-lock.json

# Copy package.json and package-lock.json first to leverage Docker caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the backend code
COPY . .

# Expose the backend port
EXPOSE 4000

# Start the backend
CMD ["npm", "run", "dev"]