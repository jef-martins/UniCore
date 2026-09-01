# UniCore

Monólito modular com frontend Angular standalone e backend NestJS no mesmo repositório.

## Requisitos

- Node.js 22+
- npm 10+

## Desenvolvimento

Instale as dependências uma única vez:

```bash
npm install
```

Execute Angular e NestJS juntos:

```bash
npm run dev
```

O frontend fica em `http://localhost:4200` e encaminha `/api/*` para o backend em `http://localhost:3000`. O health-check está disponível em `http://localhost:3000/api/health`.

Para executar cada parte separadamente:

```bash
npm run dev:frontend
npm run dev:backend
```

## Build e produção

```bash
npm run build
npm start
```

O build gera o Angular em `dist/apps/frontend/browser` e o NestJS em `dist/apps/backend`. Em produção, o NestJS serve os arquivos do Angular e faz fallback para `index.html` nas rotas da SPA; URLs iniciadas por `/api` continuam sendo tratadas exclusivamente pela API.

## Configuração

Copie `.env.example` para `.env` no backend/raiz e ajuste os valores do ambiente. O arquivo `.env` nunca deve ser versionado. `DATABASE_URL` e `JWT_SECRET` estão reservados para as próximas etapas e ainda não ativam banco ou autenticação real.

## Organização

- `apps/frontend`: aplicação Angular e proxy de desenvolvimento.
- `apps/backend`: aplicação NestJS modular e API.
- `libs/shared`: contratos TypeScript sem dependências de Angular ou NestJS.
