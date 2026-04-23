# Step 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all other project files
COPY . .

# Build the app for production
RUN npm run build

# Step 2: Serve the app with Nginx
FROM nginx:alpine

# Copy the custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React app from the previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Start Nginx and inject runtime environment variables into env.js
CMD sed -i "s|\\${GEMINI_API_KEY}|$GEMINI_API_KEY|g" /usr/share/nginx/html/env.js && nginx -g "daemon off;"
