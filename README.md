# UniCore

Monólito modular com frontend Angular standalone, backend NestJS e PostgreSQL no mesmo repositório.

## Requisitos

- Node.js 22+
- npm 10+
- PostgreSQL 14+
- Banco PostgreSQL `unicore`
- Usuário PostgreSQL com acesso ao banco

## Configuração do banco

O backend usa `pg` diretamente, sem ORM. A configuração da imagem indica o banco `unicore` com o proprietário `postgres`.

Copie o arquivo de exemplo e informe a senha local sem versionar o arquivo:

```bash
cp .env.example .env
```

Para a instância PostgreSQL apresentada, configure:

```dotenv
DB_HOST=localhost
DB_PORT=5433
DB_NAME=unicore
DB_USER=postgres
DB_PASSWORD=SUA_SENHA
```

Também é possível usar uma única variável `DATABASE_URL`, por exemplo `postgresql://postgres:SUA_SENHA@localhost:5433/unicore`. A senha real deve permanecer apenas no arquivo `.env` ou em um secret manager.

O endpoint `GET /api/health` executa `SELECT 1` no PostgreSQL. Ele retorna `200` com `database: "up"` quando a conexão está funcionando e `503` com `database: "down"` quando o banco não está disponível.

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

## Segurança

O arquivo `.env` nunca deve ser versionado. `JWT_SECRET` permanece somente no backend. Não coloque senhas, URLs com credenciais ou segredos em código-fonte, no frontend ou em commits.

## Organização

- `apps/frontend`: aplicação Angular e proxy de desenvolvimento.
- `apps/backend`: aplicação NestJS modular e API.
- `apps/backend/src/modules/database`: pool e ciclo de vida da conexão PostgreSQL.
- `libs/shared`: contratos TypeScript sem dependências de Angular ou NestJS.
