# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
# Vite bakes these in at build time
ARG VITE_API_URL=http://localhost:8000/api
ARG VITE_NOTIFY_URL=http://localhost:5000/api
ARG VITE_SHOW_DEMO=true
ENV VITE_API_URL=$VITE_API_URL VITE_NOTIFY_URL=$VITE_NOTIFY_URL VITE_SHOW_DEMO=$VITE_SHOW_DEMO
RUN npm run build

# ---- serve stage ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
