# Estágio 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências
COPY package.json package-lock.json* ./
RUN npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retries 5 \
    && npm config set maxsockets 5 \
    && npm install --no-audit --no-fund

# Copiar código-fonte
COPY . .

# Argumentos de Build para Vite
ARG VITE_ADMIN_PATH
ENV VITE_ADMIN_PATH=$VITE_ADMIN_PATH

# Build do frontend (Vite) e backend (TypeScript)
RUN npm run build

# Estágio 2: Runtime (Produção)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copiar package.json e instalar dependências de produção
COPY package.json package-lock.json* ./
RUN npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retries 5 \
    && npm config set maxsockets 5 \
    && npm install --omit=dev --no-audit --no-fund

# Instalar utilitários do sistema e LaTeX em etapas separadas com retentativas (resiliência contra flutuações de rede)
RUN apk add --no-cache curl
RUN for i in 1 2 3 4 5; do apk add --no-cache texlive && break || (echo "Retry texlive..." && sleep 10); done
RUN for i in 1 2 3 4 5; do apk add --no-cache texlive-xetex && break || (echo "Retry texlive-xetex..." && sleep 10); done
RUN for i in 1 2 3 4 5; do apk add --no-cache texmf-dist-latexextra && break || (echo "Retry texmf-dist-latexextra..." && sleep 10); done

# Criar diretório de uploads e ajustar permissões
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Copiar os arquivos transpilados do backend e o dist do frontend
COPY --from=builder /app/src ./src
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tsconfig.json ./

# Trocar para usuário não-root (Segurança)
USER node

EXPOSE 3000

# Executar o servidor
ENV NODE_OPTIONS="--max-old-space-size=2048"
CMD ["npx", "tsx", "src/server.ts"]
