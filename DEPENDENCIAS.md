# 📦 Dependências do Sistema — AXION Industrial Operations Platform

Este documento detalha todos os requisitos e dependências necessários para instalar, configurar e rodar o sistema **AXION** em ambientes de Desenvolvimento ou Produção.

---

## 1. 🛠️ Requisitos de Software (Sistema Operacional)

Antes de iniciar, certifique-se de ter as seguintes ferramentas instaladas em sua máquina ou servidor:

| Ferramenta | Versão Recomendada | Link para Instalação |
| :--- | :--- | :--- |
| **Node.js** | `v20.x` (LTS) ou superior | [nodejs.org](https://nodejs.org/) |
| **npm** | `v10.x` ou superior (incluído no Node) | - |
| **Docker** | Versão estável mais recente | [docker.com](https://www.docker.com/) |
| **Docker Compose** | `v2.x` ou superior | - |

> [!NOTE]
> Se você estiver utilizando **Docker**, as dependências de MongoDB e Redis já estão configuradas dentro dos contêineres e não precisam ser instaladas localmente.

---

## 2. 🗄️ Serviços e Infraestrutura

O sistema depende dos seguintes serviços externos para persistência e cache:

1.  **MongoDB (v8.0):** Banco de dados NoSQL principal.
2.  **Redis (v7):** Utilizado para cache de sessões, rate-limiting e barramento de eventos do Socket.io.
3.  **Servidor SMTP:** Para envio de notificações por e-mail (ex: Gmail, SendGrid).
4.  **API WhatsApp (Infobip):** Para envio de alertas críticos via WhatsApp.

---

## 3. 🔑 Configuração de Ambiente (`.env`)

Você deve criar um arquivo `.env` na raiz do projeto com as seguintes variáveis. Utilize o arquivo `.env.example` como base:

```env
# Caminho administrativo customizado
VITE_ADMIN_PATH=admin

# Segurança
JWT_SECRET=sua-chave-secreta-aqui
ENCRYPTION_KEY=chave-de-criptografia-para-dados-sensiveis

# Banco de Dados
MONGODB_URI=mongodb://localhost:27017/Axion

# Cache e Mensageria
REDIS_URL=redis://localhost:6379

# Notificações - E-mail (SMTP)
SMTP_HOST=smtp.exemplo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario@exemplo.com
SMTP_PASS=sua-senha-app

# Notificações - WhatsApp (Infobip)
WHATSAPP_API_URL=seu-subdominio.api.infobip.com/whatsapp/1/message/text
WHATSAPP_API_KEY=sua-api-key
WHATSAPP_SENDER_NUMBER=numero-remetente-configurado
```

---

## 4. 🚀 Comandos de Instalação

### Passo 1: Dependências do Node.js
Instale todos os pacotes necessários listados no `package.json`:
```bash
npm install
```

### Passo 2: Inicializar Infraestrutura (via Docker)
Se desejar subir o banco de dados e o redis rapidamente:
```bash
docker compose up -d mongo redis
```

### Passo 3: Rodar em Desenvolvimento
```bash
npm run dev
```

---

## 5. 📚 Principais Bibliotecas Utilizadas (Stack Tecnológica)

O projeto utiliza as seguintes tecnologias principais:

-   **Frontend:** React 19, Vite, Tailwind CSS 4, Radix UI, Lucide Icons.
-   **Backend:** Node.js, Express, TypeScript (tsx).
-   **ORM/Database:** Mongoose (MongoDB).
-   **Comunicação:** Socket.io (Tempo real).
-   **Relatórios:** Impressão Nativa do Navegador (CSS Paged Media @media print).
-   **Segurança:** Argon2 (Hash), JSON Web Token (JWT), Helmet, Express Rate Limit.

---

## 6. 🧪 Ferramentas de Teste e Qualidade

O projeto inclui suítes de teste para garantir a confiabilidade industrial:

-   **Testes Unitários:** Vitest (`npm run test`)
-   **Testes E2E (End-to-End):** Playwright (`npm run test:e2e`)
-   **Testes de Carga:** Artillery (`npm run test:load`)
-   **Linting:** TypeScript Compiler (`npm run lint`)
