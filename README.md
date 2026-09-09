# UniCore

Monólito modular com frontend Angular standalone, backend NestJS, Prisma e PostgreSQL no mesmo repositório.

## Requisitos

- Node.js 22+
- npm 10+
- PostgreSQL 14+
- Banco PostgreSQL `unicore`
- Usuário PostgreSQL com acesso ao banco

## Configuração do banco

O backend usa Prisma como único cliente de banco. A imagem indica o banco `unicore`, com proprietário `postgres`, disponível localmente na porta `5433`.

Copie o arquivo de exemplo e informe os segredos localmente:

```bash
cp .env.example .env
```

Configure a URL do Prisma:

```dotenv
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5433/unicore
```

Crie/aplique migrations e gere o client:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

O seed inicial cria, de forma idempotente, os usuários `master`, `admin`, `tesouraria` e `vestibular`. A senha usada pelo seed vem de `SEED_DEFAULT_PASSWORD` e nunca é armazenada em texto puro; o banco recebe somente o hash Argon2id.

## Google Workspace e Classroom

A tela administrativa `/administracao/classroom` permite criar salas, incluir o professor e sincronizar alunos por e-mail institucional. Ela registra localmente a combinação de período, curso, disciplina e turma, juntamente com o ID e o link retornados pelo Google Classroom, impedindo duplicidade.

Use uma conta de serviço exclusiva, com a **Google Classroom API** habilitada. Armazene o JSON da chave fora do repositório e configure somente seu caminho:

```dotenv
GOOGLE_SERVICE_ACCOUNT_FILE=/caminho/privado/google-service-account.json
GOOGLE_ADMIN_SUBJECT=administrador@exemplo.edu.br
```

Para operar em nome da conta administrativa do Workspace, habilite a Domain-Wide Delegation para o Client ID da conta de serviço e autorize apenas os escopos `classroom.courses` e `classroom.rosters`. Nunca exponha a chave, tokens ou credenciais ao frontend.

## Integração Unimestre

A tela administrativa `/administracao/unimestre` consulta exclusivamente em modo leitura as bases MySQL Unimestre e FAIP. Ela exibe conexões, cursos ativos, turmas, disciplinas, docentes, número de alunos e os vínculos institucionais da tabela `faip_contas_google`. Não são executados comandos de escrita em nenhum banco externo.

Configure conexões com usuários de banco que tenham permissão `SELECT` somente. Em instalações com firewall, libere o IP do servidor que executa o backend para os hosts MySQL configurados.

O endpoint `GET /api/health` executa `SELECT 1` via Prisma. Ele retorna `200` com `database: "up"` quando a conexão está funcionando e `503` com `database: "down"` quando o banco não está disponível.

## Autenticação

O login está disponível em `POST /api/auth/login` e aceita `identifier` como nome de usuário ou e-mail:

```json
{
  "identifier": "tesouraria",
  "password": "sua-senha"
}
```

A resposta contém um JWT com validade de 9 horas e os dados públicos do usuário. O Angular mantém o token somente em memória e o interceptor envia `Authorization: Bearer ...` nas requisições da API. A rota `GET /api/auth/me` exige um token válido.

Os perfis disponíveis são `vestibular`, `admin`, `master`, `tesouraria`, `secretaria`, `coordenacao` e `registro_academico`. A autorização também deve ser aplicada nos endpoints do backend com `JwtAuthGuard` e `@Roles`; os guards do Angular servem apenas para navegação e experiência do usuário.

## Desenvolvimento

Instale as dependências uma única vez:

```bash
npm install
```

Execute Angular e NestJS juntos:

```bash
npm run dev
```

O frontend fica em `http://localhost:4200` e encaminha `/api/*` para o backend em `http://localhost:3000`.

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

O arquivo `.env` nunca deve ser versionado. `JWT_SECRET`, `SEED_DEFAULT_PASSWORD` e credenciais do PostgreSQL permanecem somente no backend. Não coloque senhas, URLs com credenciais ou tokens em código-fonte, no frontend ou em commits.

## Organização

- `apps/frontend`: aplicação Angular e proxy de desenvolvimento.
- `apps/backend`: aplicação NestJS modular e API.
- `apps/backend/src/modules/auth`: login, JWT, guard de autenticação e guard de perfis.
- `apps/backend/src/modules/database`: Prisma client e ciclo de vida da conexão PostgreSQL.
- `prisma`: schema, migrations e seed.
- `libs/shared`: contratos TypeScript sem dependências de Angular ou NestJS.
