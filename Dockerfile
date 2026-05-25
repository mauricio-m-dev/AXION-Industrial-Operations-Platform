# Estágio 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências
COPY package.json package-lock.json* ./
RUN npm config set registry https://registry.npmjs.org/ \
    && npm config set fetch-retry-maxtimeout 600000 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retries 5 \
    && npm ci --no-audit --no-fund

COPY . .

# Argumentos de Build para Vite
ARG VITE_ADMIN_PATH
ENV VITE_ADMIN_PATH=$VITE_ADMIN_PATH

# Build do frontend (Vite)
RUN npm run build

# Build do backend (esbuild)
RUN npx esbuild src/server.ts --bundle --platform=node --format=esm --outdir=dist-server --packages=external

# Estágio 2: Runtime (Produção)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copiar package.json e instalar dependências de produção
COPY package.json package-lock.json* ./
RUN npm config set registry https://registry.npmjs.org/ \
    && npm config set fetch-retry-maxtimeout 600000 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retries 5 \
    && npm ci --omit=dev --no-audit --no-fund

# Criar diretório de uploads e ajustar permissões (invalidar cache de cópia)
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Copiar os arquivos transpilados do backend e o dist do frontend
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/dist ./dist

# Trocar para usuário não-root (Segurança)
USER node

EXPOSE 3000

# Executar o servidor
ENV NODE_OPTIONS="--max-old-space-size=2048"
CMD ["node", "dist-server/server.js"]
