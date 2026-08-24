FROM node:24-alpine AS dependencies

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

FROM node:24-alpine

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app

RUN addgroup -S appgroup \
    && adduser -S appuser -G appgroup

COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY public ./public

USER appuser

EXPOSE 8080

CMD ["node", "src/server.js"]
