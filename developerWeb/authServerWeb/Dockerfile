# ---- Build Stage ----
FROM node:20 AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

# 👇 Build-time envs
ARG VITE_API_BASE_URL
ARG VITE_API_URL
ARG VITE_SUPPORT_EMAIL

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPPORT_EMAIL=$VITE_SUPPORT_EMAIL

COPY . .
RUN npm run build


# ---- Production Stage ----
FROM node:20
WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/dist ./dist

EXPOSE 4000
CMD ["serve", "-s", "dist", "-l", "4000"]
