# ---- Build Stage ----
FROM node:20 AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


# ---- Production Stage ----
FROM node:20
WORKDIR /app

# Install a fast static server
RUN npm install -g serve

# Copy built files
COPY --from=build /app/dist ./dist

# Expose port 4000 (Your requirement)
EXPOSE 4000

# Serve static build on port 4000
CMD ["serve", "-s", "dist", "-l", "4000"]
