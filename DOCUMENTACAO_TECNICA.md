# 🏭 Documentação Técnica — AXION

## 📋 1. Visão Geral e Escopo Principal
O **AXION — Industrial Operations Platform** é um ecossistema de software de missão crítica projetado para o monitoramento, gerenciamento e orquestração de ocorrências industriais em tempo real. Alinhado com a filosofia **Lean Enterprise**, o AXION atende a plantas industriais e montadoras de médio porte (~150 a 200 operadores cadastrados) de maneira eficiente, com alta resiliência, baixa latência e custo zero de hospedagem de servidores.

### Escopo Operacional Principal
- **Orquestração de Frotas de AGVs** (*Automated Guided Vehicles*): Rastreamento de chamados de falhas ou bloqueios em veículos guiados de forma autônoma.
- **Gerenciamento de Downtime (Paradas de Linha)**: Registro e acompanhamento de falhas físicas nas linhas de montagem, com classificação automática de severidade baseada em impacto local.
- **Observabilidade da Infraestrutura (APM)**: Telemetria de integridade de software e hardware em tempo real para prevenção de falhas do servidor.
- **Despacho de Alertas Multicanal**: Roteamento rápido de ocorrências urgentes via WhatsApp (Infobip), E-mail (SMTP) e Discord Webhooks.

---

## 🎯 2. Objetivos Estratégicos e Proposta de Valor
O AXION foi projetado sob requisitos específicos de eficiência de chão de fábrica e excelência em processos de manufatura enxuta:

### I. Minimização do Tempo Médio de Reparo (MTTR - Mean Time To Repair)
A velocidade na resposta a incidentes é o principal fator de estabilidade operacional em manufaturas modernas. O AXION reduz o MTTR ao:
- Encaminhar instantaneamente os chamados abertos aos técnicos responsáveis com base na área física e tipo do chamado.
- Automatizar o "Andon Eletrônico": substituindo os tradicionais cabos e sinalizadores de lâmpada de linha por alertas instantâneos digitais direcionados ao celular ou tablet do gestor/técnico.
- Rastrear e calcular o tempo de duração da tratativa (do início ao encerramento) para posterior auditoria de processos.

### II. Maximização da Eficiência Global dos Equipamentos (OEE - Overall Equipment Effectiveness)
O acompanhamento do ciclo de vida operacional de AGVs e equipamentos da fábrica permite prever falhas sistemáticas. O sistema viabiliza:
- Cálculo do Tempo Médio Entre Falhas (MTBF - Mean Time Between Failures) por veículo/equipamento.
- Mapeamento das taxas de disponibilidade real dos AGVs sob monitoramento.
- Identificação dos ativos críticos com maior recorrência de paradas (*Bad Actors*) para planejamento de manutenção preditiva.

### III. Redução do Custo Total de Propriedade (TCO - Total Cost of Ownership)
Enquanto soluções de mercado exigem custosas assinaturas em nuvem (SaaS) ou servidores de grande porte (overengineering):
- O AXION baseia-se em infraestrutura **Self-Hosted** (hospedagem no próprio computador/servidor local da fábrica).
- Utiliza o **Cloudflare Tunnel** para dispensar custos de IPs fixos e liberação de portas de firewall físico, blindando o tráfego da rede doméstica/empresarial sem custos de infraestrutura de rede externa.
- Toda a stack é open-source e integrada a contêineres Docker, permitindo escalabilidade modular sem taxas adicionais de licenciamento de runtime ou banco de dados.

### IV. Conformidade de Acordo de Nível de Serviço (SLA)
- Monitora se as ocorrências críticas e colisões são atendidas dentro da meta de **30 minutos**.
- Gera relatórios gerenciais e estatísticas semanais de cumprimento de metas por técnico, permitindo identificar gargalos no dimensionamento das equipes de manutenção.

### V. Governança, Rastreabilidade e Auditoria Contínua
- Cada alteração (abertura, atribuição, resolução, edição ou remoção de chamados) gera um log criptografado indelével (`AuditLog`) para fins de conformidade interna e auditorias de qualidade (ex: ISO 9001).
- Os logs administrativos expiram automaticamente após 5 anos de retenção por meio de políticas de TTL index no MongoDB, preservando recursos do disco local.

---

## 🏗️ 3. Arquitetura do Sistema e Stack Tecnológica
A arquitetura do AXION é modular e baseada em contêineres Docker, orquestrados via Docker Compose. O sistema consagra a robustez local combinada à exposição segura para a internet através do túnel do Cloudflare.

```
                  ┌─────────────────────────────────────┐
                  │          Usuário / Cliente          │
                  └──────────────────┬──────────────────┘
                                     │ HTTPS / WSS (TLS 1.3)
                  ┌──────────────────▼──────────────────┐
                  │       Cloudflare SSL / WAF          │
                  └──────────────────┬──────────────────┘
                                     │ Tunnel Seguro (cloudflared)
                  ┌──────────────────▼──────────────────┐
                  │    Nginx Reverse Proxy (Port 80/443)│
                  └──────────────────┬──────────────────┘
                                     │ Proxy local
                  ┌──────────────────▼──────────────────┐
                  │    Servidor Node.js (Express + Vite)│
                  └──────────┬───────────────┬──────────┘
                             │               │
                    ┌────────▼───────┐     ┌─▼──────────────┐
                    │MongoDB Database│     │Redis Cache/Rate│
                    └────────────────┘     └────────────────┘
```

### 💻 Frontend (Interface do Usuário)
- **Vite + React 19 + TypeScript**: Compilação veloz e renderização ágil.
- **CSS Moderno / Tailwind CSS**: Design responsivo voltado para tablets e telas operacionais em chão de fábrica.
- **Socket.io-client**: Conexão com o namespace `/tenant-axion` para sincronização em tempo real das tabelas de chamados sem recarregamento de página.

### ⚙️ Backend (Servidor de Aplicação)
- **Node.js + Express**: Plataforma e roteador de APIs.
- **Cluster Mode**: Execução distribuída que paraleliza a aplicação entre todos os núcleos de CPU disponíveis no computador físico, com reinicialização automática (auto-healing) de instâncias que eventualmente venham a falhar.
- **Socket.io**: Servidor de WebSockets integrado ao servidor HTTP principal para eventos de atualização imediata da central operacional.
- **Zod**: Validação estrita de entrada de dados de todas as requisições críticas do sistema.
- **Crypto (Node.js)**: Encriptação e desencriptação simétrica de dados sensíveis na camada do banco de dados (ex: E-mails, números de WhatsApp e chaves MFA).

### 🗄️ Camada de Persistência e Cache
- **MongoDB**: Banco NoSQL principal com esquemas otimizados no Mongoose e indexes de alto desempenho para busca de relatórios, chamados, histórico de login e APM.
- **Redis**: Armazenamento em memória usado para:
  - Cache de chamados frequentes.
  - Controle de limites de requisições de IPs (Rate Limiting).
  - Controle de estado de manutenção global do sistema.

---

## 🗃️ 4. Modelos de Dados (Mongoose Schemas)
O AXION utiliza 7 esquemas de dados estruturados no MongoDB:

1. **User (Usuários)**:
   - `username`, `matricula` (única, 7 dígitos), `password` (encriptada), `role` (Usuário, Técnico, Moderador, Administrador, SuperAdmin).
   - MFA: `mfaSecret` (encriptado) e `mfaEnabled`.
   - Comunicação: `email` (encriptado), `whatsapp` (encriptado), `notificationPreference` (enum: whatsapp, email, both, none) e `allowedTicketTypes` (restringe quais tipos de incidentes um Moderador pode ver/receber).
   - Segurança: `failedLoginAttempts`, `lockoutUntil` e `tokenVersion` (usado para revogar tokens de acesso remotamente).

2. **Ticket (Chamados/Ocorrências)**:
   - Identificadores: `id` (ex: TK-1234), `type` (tipo da falha), `location` (setor).
   - Equipamento: `agv_number`, `part_name`, `sap_number`, `side` e `observation`.
   - Imagens: `image_path` (foto inicial) e `resolution_image_path` (foto de encerramento).
   - Fluxo: `status` (Aberto, Em Atendimento, Finalizado), `operator_name`, `operator_matricula`, `priority`, `operational_impact` (total/parcial) e `downtime`.
   - Atendimento: `assigned_to` (técnico), `started_at`, `finished_at` e `resolution_report`.

3. **AuditLog (Log de Auditoria)**:
   - `action` (tipo de ação), `username`, `details` (dados adicionais).
   - TTL (Time-To-Live): Expiração automática das informações após 5 anos para governança.

4. **LoginHistory (Histórico de Logins)**:
   - `username`, `ip_address`, `device` (User-Agent) e `timestamp`.

5. **OperatorFeedback (Feedbacks do Chão de Fábrica)**:
   - `matricula`, `name`, `feedback` e `created_at`.

6. **ApmMetric (Telemetria do Servidor)**:
   - Snapshots contendo: uso de CPU, RAM consumida, carga do sistema (`load_avg`), requisições por minuto (RPS), latência média de requisições API, clientes WebSocket conectados, tempo de resposta ping do MongoDB e métricas de disco.

7. **ApmReport (Relatórios Gerados pela IA)**:
   - `title`, período analisado, nível de risco do sistema (`Low`, `Medium`, `High`, `Critical`), pontuação geral de saúde (`health_score`),findings da análise, recomendações técnicas e snapshot das últimas métricas.

---

## 🛡️ 5. Pipeline de Segurança e Governança
O AXION implementa um funil defensivo de segurança contra as principais ameaças cibernéticas (OWASP Top 10):

1. **Helmet & HSTS**: Força cabeçalhos de segurança, desativa Fareling do navegador, evita MIME Sniffing e assegura conexão apenas via HTTPS TLS 1.3 por pelo menos 1 ano.
2. **Permissions-Policy**: Desativa periféricos do cliente (câmera, microfone, pagamentos) por padrão.
3. **API Rate Limiting**: Limite gerenciado pelo Redis (200 requisições/min por IP) para impedir ataques de força bruta.
4. **Input Sanitization**: Varredura anti-XSS recursiva em todos os payloads de requisição.
5. **NoSQL Injection Prevention**: Sanitização explícita de caracteres como `${}` em inputs de parâmetros de rotas (ex: deleção ou consulta de chamados por ID).
6. **Controle de Uploads de Imagens**:
   - Limite físico de tamanho de arquivo de 5MB.
   - Validação dupla: Verifica a extensão do arquivo (`.jpg`, `.jpeg`, `.png`, `.webp`) e confirma os "Magic Bytes" de cabeçalho (`fileTypeFromFile`) para garantir que o arquivo enviado é realmente uma imagem e não um script executável malicioso disfarçado.
7. **Prevenção de Path Traversal**: A função de exclusão de arquivos de imagem (`safeDeleteUploadFile`) limpa o caminho usando `path.basename()`, executa verificação de formato via Regex estrito de UUID e compara com o listing físico real do diretório (`fs.readdirSync`) antes de autorizar o unlink.

---

## 🔑 6. Autenticação e Controle de Sessão (RBAC)
- **Validação de Credenciais**: Processada com Zod, exigindo matrícula numérica de 7 dígitos.
- **Proteção contra Força Bruta de Senha**:
   - Bloqueio progressivo: 5 erros bloqueiam a conta por 5 minutos; 15 erros bloqueiam por 1 hora; 50 erros aplicam lockout permanente (100 anos), exigindo intervenção administrativa.
- **Migração Dinâmica de Algoritmos**: O sistema suporta senhas legadas em Bcrypt e, no login bem-sucedido, migra-as silenciosamente para o moderno **Argon2id**.
- **Tokens de Acesso JWT**:
   - `access_token` (1 hora) e `refresh_token` (7 dias) armazenados como **HttpOnly Cookies** com diretivas `Secure` e `sameSite: strict`.
   - **Revogação Remota (Token Versioning)**: Modificando a propriedade `tokenVersion` no banco de dados, o administrador pode invalidar instantaneamente todos os tokens ativos daquele usuário sem precisar alterar sua senha.

---

## 🎫 7. Fluxo de Chamados e Regras de Negócio
O ciclo de vida dos chamados operacionais segue um fluxo restrito e automatizado:

```
           [ Operador ]                  [ Técnico ]                 [ Técnico / Admin ]
  ┌─────────────────────────┐     ┌──────────────────────┐     ┌───────────────────────────┐
  │  Registro da Ocorrência │────>│ Início do Atendimento│────>│  Fechamento do Chamado    │
  │    (Status: Aberto)     │     │(Status: Em Atendimento)│   │    (Status: Finalizado)   │
  └─────────────────────────┘     └──────────────────────┘     └───────────────────────────┘
               │                                                            │
               ▼                                                            ▼
    Disparo de Alertas Críticos                                  Relatório de Resolução
    (WhatsApp, Email, Discord)                                   e Cálculo do MTTR
```

- **Matriz de Prioridade Automática**:
  - `Colisão` -> Prioridade **Crítica** imediata.
  - Impacto `total` (Parada de Linha) -> Prioridade **Crítica** imediata.
  - Impacto `parcial` em locais de gargalo (`ASSEMBLY-01`, `BODY-SHOP`, `QC-LINE`) ou falhas no AGV -> Prioridade **Alta**.
  - Outros cenários categorizam-se em prioridades Médias e Baixas.
- **Auditoria de Transições**: Cada mudança de estado do chamado dispara um registro no `AuditLog` mapeando o responsável pela ação.
- **Otimização com Cache Redis**: Para evitar sobrecarga no MongoDB, as listagens de chamados operam com cache dinâmico via Redis. O cache possui proteção contra falhas em cascata utilizando um **Circuit Breaker** (limite de 3 falhas de comunicação, com cooldown de 10 segundos para failover seguro para consultas diretas no banco de dados).

---

## 📊 8. Módulo APM, Inteligência e Relatórios PDF
O AXION possui inteligência integrada para autopreservação e geração de métricas gerenciais:
- **Telemetria de Saúde**: Roda a cada 5 minutos, medindo latência real de leitura do MongoDB por meio de ping interno e estatísticas do hardware do servidor.
- **Filtro de Processo Principal**: Para não poluir o banco ou duplicar a persistência quando a aplicação roda em modo Cluster, apenas o Worker com ID = 1 realiza a escrita das métricas no banco de dados.
- **Diagnóstico Heurístico (Axion Intelligence)**: O motor de inteligência analisa as métricas médias do servidor e pontua o sistema (0 a 100). Em caso de degradação:
  - CPU > 85%: Deduz 30 pontos e sugere escalonamento vertical.
  - RAM > 90%: Deduz 25 pontos e avisa sobre memory leak ou saturação física.
  - Latência de API > 1s: Deduz 20 pontos e sugere paginação e cache.
  - Latência do DB > 100ms: Deduz 15 pontos e sugere indexes ou redimensionamento de conexões.
  - Taxa de erros HTTP > 10%: Deduz 25 pontos e sugere revisão do log de auditoria.
- **Geração de PDF Profissional**: Habilita a exportação de dois relatórios sofisticados em PDF gerados por meio de impressão nativa do navegador (usando HTML, CSS Paged Media `@media print` e a classe corporativa ABNT `.relatorio-padrao`):
  - **Relatório Operacional**: Consolida volumes, eficiência de encerramento, índice de conformidade de SLA, cálculo médio de MTTR (Mean Time to Repair) e FRT (First Response Time), distribuição de incidentes por turnos, análise de OEE (Disponibilidade, Performance e Qualidade) dos 10 AGVs mais problemáticos e ranking de velocidade de atendimento dos técnicos.
  - **Relatório de APM / Infraestrutura**: Traz o histórico de saúde física da máquina, diagnóstico de vulnerabilidades e lista de recomendações emitidas pela inteligência interna.

---

## 🧹 9. Ação Crítica: Database Wipe (Reset Completo)
Para cenários de encerramento de provações de conceito, auditoria ou migração de planta, o AXION fornece um endpoint de auto-limpeza controlado e altamente auditado:
- **Autenticação Dupla**: Requer perfil `SuperAdmin` logado e validação explícita da senha atual do administrador no corpo da requisição via Argon2id.
- **Mecanismo de Auditoria Dupla (Double Audit Flow)**: Um log de auditoria `DATABASE_WIPE_INITIATED` é persistido no banco e em arquivos de log do disco antes de qualquer exclusão começar. Após o sucesso da deleção física de todos os dados do banco e uploads de arquivos de imagem, um novo log `DATABASE_WIPE_COMPLETED` é gerado.
- **Seeding de Segurança**: Logo após a limpeza total, a rotina recria a estrutura básica de segurança e gera novamente o usuário administrador padrão (`SuperAdmin`) para evitar perda total de acesso à plataforma.
- **Alertas Emergenciais de Segurança**: Um alerta instantâneo de segurança via WhatsApp (Infobip API) e e-mail SMTP é enviado ao administrador, reportando a ação com a data e o endereço IP responsável pela requisição.
