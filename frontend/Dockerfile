FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Set production environment variable for build
ARG NEXT_PUBLIC_API_BASE=https://leads-scraper-portal-production.up.railway.app/api
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE

RUN npm run build

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
