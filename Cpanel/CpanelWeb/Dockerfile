# ---- Build Stage ----
FROM node:22 AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

# 👇 Build-time envs
ARG VITE_CPANEL_API_BASE_URL
ARG VITE_MAIN_PORTAL_URL

ENV VITE_CPANEL_API_BASE_URL=$VITE_CPANEL_API_BASE_URL
ENV VITE_MAIN_PORTAL_URL=$VITE_MAIN_PORTAL_URL

COPY . .
RUN npm run build


# ---- Production Stage ----
FROM node:22
WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/dist ./dist

EXPOSE 4000
CMD ["serve", "-s", "dist", "-l", "4000"]
