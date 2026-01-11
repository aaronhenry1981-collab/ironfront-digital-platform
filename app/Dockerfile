FROM node:20.11.1-alpine3.19

RUN apk add --no-cache dumb-init curl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV APP_VERSION=unknown

COPY package.json ./package.json
COPY server.js ./server.js

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=2s --retries=6 CMD curl -fsS http://127.0.0.1:3000/health >/dev/null || exit 1

ENTRYPOINT ["dumb-init","--"]
CMD ["node","server.js"]
