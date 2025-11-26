FROM node:18 AS build
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

FROM node:18
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["serve", "-s", "dist", "-l", "4000"]
