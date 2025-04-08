# Gateway de Pagamentos Full Cycle

Um gateway de pagamentos desenvolvido em Go como parte da Imersão Full Cycle.

## Requisitos

- Go 1.22+
- PostgreSQL

## Variáveis de Ambiente

```
DB_USER=<user>
DB_PASSWORD=<password>
DB_HOST=localhost
DB_PORT=5432
DB_NAME=<db_name>
PORT=8080
```

## Configuração do banco de dados

1. Configure o banco de dados PostgreSQL:
```bash
docker-compose up
```

# Aplicar migrações
```bash
migrate -source file://migrations -database postgres://<user>:<password>@localhost:5432/gateway?sslmode=disable up
```
# Reverter migrações
```bash
migrate -source file://migrations -database postgres://<user>:<password>@localhost:5432/gateway?sslmode=disable down
```
# Verificar versão atual
```bash
migrate -source file://migrations -database postgres://<user>:<password>@localhost:5432/gateway?sslmode=disable version 
```
2. Execute a aplicação:
```bash
go run cmd/main.go
```

## API Endpoints

### Criar Conta
```
POST /accounts
Content-Type: application/json

{
  "name": "Nome da Conta",
  "email": "email@exemplo.com"
}
```

### Consultar Conta
```
GET /accounts
X-API-KEY: chave_api_da_conta
```

## Desenvolvimento

Para adicionar novas funcionalidades:

1. Adicione novos models/entidades em `internal/domain`
2. Implemente repositórios em `internal/repository`
3. Crie serviços em `internal/service`
4. Adicione handlers em `internal/web/handlers`
5. Configure rotas no servidor em `internal/web/server`