# ----------------------
# 1. Builder stage
# ----------------------
   FROM node:20-alpine AS builder

   WORKDIR /app

   COPY package*.json ./

   RUN npm ci

   COPY . .

   RUN npm run build


# ----------------------
# 2. Production deps only
# ----------------------
   FROM node:20-alpine AS deps

   WORKDIR /app

   COPY package*.json ./

   RUN npm ci --omit=dev

# ----------------------
# 3. Final runtime image
# ----------------------
   FROM node:20-alpine AS runner

   WORKDIR /app

   COPY --from=builder /app/dist ./dist

   COPY --from=deps /app/node_modules ./node_modules

   COPY --from=builder /app/.env ./.env

   RUN addgroup -S app && adduser -S app -G app

   USER app

   EXPOSE 5000

   CMD ["node", "dist/main"]
