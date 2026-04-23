# Step 1: Build the React application
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Serve the app with Node.js
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# Install only production dependencies
RUN npm install --omit=dev
# Copy the built React app from the previous stage
COPY --from=build /app/dist ./dist
# Copy the server file
COPY server.js ./
# Expose port 8080 (Cloud Run default)
EXPOSE 8080
# Start the Express server
CMD ["node", "server.js"]
