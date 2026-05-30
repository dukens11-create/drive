.PHONY: install test build compose-up compose-down infra-validate db-backup db-restore

install:
npm ci

test:
npm test

build:
npm run build

compose-up:
docker compose up --build

compose-down:
docker compose down

infra-validate:
docker compose config >/dev/null
@echo "docker-compose.yml validated"

db-backup:
./scripts/database/backup.sh

db-restore:
./scripts/database/restore.sh $(FILE)
