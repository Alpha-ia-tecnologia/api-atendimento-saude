# Modular Monolith API

API backend escrita em **NestJS + TypeScript** com **PostgreSQL** e **Prisma ORM**, seguindo o modelo de **monolito modular** e princípios de Clean Architecture / DDD.

## Tecnologias

- NestJS 10
- TypeScript 5
- PostgreSQL 16
- Prisma ORM 5
- JWT (access + refresh)
- bcrypt
- class-validator + class-transformer
- Swagger / OpenAPI
- Helmet
- @nestjs/throttler
- Docker + Docker Compose

## Arquitetura

Cada módulo é uma vertical slice independente em quatro camadas:

```
modules/<modulo>/
  presentation/     → Controllers (HTTP)
  application/      → Use Cases, DTOs, Services
  domain/           → Entidades + interfaces de Repository
  infrastructure/   → Implementações Prisma + Mappers
```

O fluxo de dependências é sempre para dentro:

```
Controller → UseCase → Repository (interface) ⇠ PrismaRepository → PrismaService
                ↓
              Entity (domain)
```

`PrismaService` **nunca** é injetado em controllers ou use cases. Toda I/O passa por repositórios.

## Monolito modular

- Cada módulo encapsula sua lógica, schema de DTOs e repositórios.
- Módulos se comunicam por **interfaces** (no `domain/repositories`) e tokens de injeção (`shared/constants/injection-tokens.ts`).
- Isso permite, no futuro, extrair um módulo para microsserviço apenas substituindo a implementação do repositório.

## Como rodar localmente

```bash
# 1. instalar dependências
npm install

# 2. copiar variáveis
cp .env.example .env

# 3. subir Postgres
docker compose up -d postgres

# 4. gerar client e rodar migrations
npm run prisma:generate
npm run prisma:migrate

# 5. rodar seed (cria org, permissões, role ADMIN e usuário admin)
npm run seed

# 6. iniciar em dev
npm run start:dev
```

## Como rodar com Docker

```bash
cp .env.example .env
docker compose up --build
```

O container `api` aplica migrations automaticamente (`prisma migrate deploy`) antes de iniciar.
Para popular dados de seed dentro do container:

```bash
docker compose exec api npx tsx prisma/seed.ts
```

## Variáveis de ambiente

Veja `.env.example`. Principais:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | URL do PostgreSQL |
| `JWT_SECRET` | Segredo JWT único usado para assinar/verificar access e refresh tokens (obrigatório). Gere com `openssl rand -hex 64`. |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Durações (ex. `15m`, `7d`) |
| `AUTH_SINGLE_SESSION` | `true` revoga sessões anteriores no login |
| `BCRYPT_SALT_ROUNDS` | Cost factor do bcrypt |
| `CORS_ORIGIN` | Lista de origens separadas por vírgula |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credenciais do admin no seed |

## Prisma

```bash
npm run prisma:generate    # gera o client
npm run prisma:migrate     # cria migration e aplica em dev
npm run prisma:deploy      # aplica migrations em prod
npm run prisma:studio      # Prisma Studio
```

### Rodando migrations

Em dev: `npx prisma migrate dev`. Em prod (dentro do container): `npx prisma migrate deploy` (já é executado no `CMD` do Dockerfile).

### Rodando seed

```bash
npm run seed
```

Cria: organização padrão, permissões base (`USER_*`, `ORGANIZATION_*`, `ROLE_*`, `PERMISSION_*`, `AUDIT_VIEW`), role `ADMIN` com todas as permissões e usuário admin (credenciais via env).

## Swagger

Disponível em `http://localhost:3000/docs` com **Bearer Auth** persistido. Cada módulo aparece como uma tag.

## Autenticação

- `POST /auth/login` — credenciais → access + refresh tokens.
- `POST /auth/refresh` — renova tokens.
- `POST /auth/logout` — revoga a sessão atual.
- `GET /auth/me` — usuário autenticado.

### Payload do access token

```json
{
  "sub": "uuid",
  "email": "admin@example.com",
  "sessionId": "uuid",
  "roles": ["ADMIN"],
  "permissions": ["USER_VIEW", "USER_CREATE"],
  "type": "access"
}
```

## Refresh token

- Assinado com `JWT_SECRET` (mesmo secret do access token); a distinção entre os dois tipos é feita pelo claim `type: 'refresh'` validado na verificação.
- Apenas o **hash bcrypt** é persistido em `refresh_tokens`.
- Na rotação, o token antigo é revogado (`revokedAt`) e um novo emitido.
- Mismatch entre token recebido e hash → revoga toda a sessão.

## Sessão única

Quando `AUTH_SINGLE_SESSION=true`:

- No login, todos os refresh tokens ativos do usuário são revogados.
- O `JwtAuthGuard` consulta `refresh_tokens` pelo `sessionId` do JWT — se a sessão estiver revogada, retorna `401`.

## Controle de permissões

```ts
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('USER_CREATE')
@Post()
createUser() {}
```

`JwtAuthGuard` valida o JWT e checa se a sessão está ativa. `PermissionsGuard` lê as permissões do JWT (preenchidas no login) e exige **todas** as listadas no decorator.

Permissão segue o padrão `MODULE_ACTION` em maiúsculas.

## Estrutura de pastas

```
prisma/
  schema.prisma
  seed.ts
src/
  main.ts
  app.module.ts
  shared/
    config/  database/prisma/  decorators/  guards/
    filters/  interceptors/  pipes/  exceptions/
    utils/  constants/  types/  dtos/
  modules/
    auth/  users/  organizations/  roles/  permissions/  audit/
```

## Scripts disponíveis

| Script | O que faz |
|---|---|
| `start:dev` | Roda em watch mode |
| `build` | Compila para `dist/` |
| `start` / `start:prod` | Inicia o servidor |
| `lint` / `format` | ESLint + Prettier |
| `test` | Jest |
| `prisma:generate` | Gera Prisma Client |
| `prisma:migrate` | `migrate dev` |
| `prisma:deploy` | `migrate deploy` |
| `prisma:studio` | Abre o Prisma Studio |
| `seed` | Popula dados iniciais |

## Decisões arquiteturais

- **Repository pattern com tokens de injeção** (`Symbol`) — desacopla camadas e evita "Prisma vazando" no domínio.
- **Soft delete** (`deletedAt`) em entidades de longo ciclo (User, Org, Role) — preserva histórico para auditoria.
- **Auditoria explícita por use case** — cada ação sensível chama `auditLogRepository.create` com `userId`, IP, UA e metadata. Mais flexível que um interceptor genérico.
- **Refresh tokens armazenados em hash** com `sessionId` distinto — permite revogação granular e rotação.
- **`SharedModule` global** — centraliza `PrismaService`, `JwtModule`, guards reutilizáveis.
- **ValidationPipe global com `whitelist + forbidNonWhitelisted`** — rejeita payloads desconhecidos por padrão.
- **Filtros separados para Prisma e HTTP** — mapeia `P2002` (conflict), `P2025` (not found), `P2003` (FK) para HTTP status corretos.
- **Resposta padronizada** via `ResponseInterceptor` (`success/message/data`) e `HttpExceptionFilter` (`success/message/errors[]/timestamp/path`).
- **Throttler no `/auth/login`** — mitiga brute force.
- **Single session opcional** — adequado para cenários SaaS B2B onde múltiplas sessões simultâneas são indesejadas.

## Próximos passos

- Testes e2e cobrindo o fluxo de auth completo (login → refresh → logout).
- Outbox pattern para emitir eventos de domínio (preparando extração para microsserviços).
- Health check com `@nestjs/terminus` (DB ping, memory).
- Tracing distribuído (OpenTelemetry).
- Pipeline CI/CD com GitHub Actions executando `lint`, `build`, `test`, `prisma migrate diff`.
- Rotação automática de refresh tokens com janela de graça.
- Política de senha forte (complexidade) e fluxo de "esqueci minha senha".
