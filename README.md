# Noxis - Jogo MMO 2D

Noxis e um jogo MMO 2D em Node.js + TypeScript, com WebSocket em tempo real e PostgreSQL (Prisma) para persistencia.

## Stack
- Node.js 20
- TypeScript
- Express + WS
- Prisma 7
- PostgreSQL 16
- Docker Compose

## Estrutura
```
server/
  config/
  controllers/
  models/
  services/
  utils/
prisma/
  schema.prisma
public/
docker/
```

## Fluxo unico com Docker (padrao)
Este projeto usa apenas `docker-compose.yml`.

### Subir app + banco
```bash
docker compose up --build -d
```

### Ver logs
```bash
docker compose logs -f app db
```

### Parar containers (mantem dados)
```bash
docker compose down
```

### Reset total do banco (apaga dados)
```bash
docker compose down -v --remove-orphans
docker compose up --build -d
```

## O que acontece ao subir
No container `app`, o entrypoint executa:
1. `prisma db push` (se `PRISMA_DB_PUSH=1`)
2. `prisma generate` apenas se o client nao existir
3. `node dist/server/index.js`

Ou seja: schema sincronizado automaticamente e servidor iniciado em `http://localhost:3000`.

## Scripts uteis
```bash
npm run docker:up
npm run docker:logs
npm run docker:down
npm run docker:reset
npm run docker:poc:up
npm run bench:engine:poc
npm run docker:poc:down
```

## POC Go Engine (opcional)

Ha um POC de engine em Go para calculos CPU-heavy (combate/pathfinding):

- codigo: `engine-go/`
- benchmark: `scripts/bench_engine_poc.js`
- guia: `docs/poc-go-engine.md`

## Rodar sem Docker (opcional)
1. `npm install`
2. Configurar `.env` com `DATABASE_URL`
3. `npm run db:push`
4. `npm run db:generate`
5. `npm run build`
6. `npm start`

## WebSocket (resumo)
- `auth_register`
- `auth_login`
- `auth_character_select`
- `character_create`
- `character_enter`
- `move`
- `target_mob`
- `pickup_item`
- `equip_item`
- `inventory_move`
- `inventory_sort`
- `inventory_delete`
- `switch_instance`
- `admin_command`


## Docker local config
Para evitar problemas com `C:\Users\Sena\.docker\config.json`, o projeto inclui uma config local em `.docker-local\config.json` e scripts prontos:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker-up.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\docker-ps.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\docker-logs.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\docker-down.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\docker-restart.ps1
```
