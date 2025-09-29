include .env

build:
	npm run build

dev:
	npm run dev

start:
	npm run start

up:
	docker run -d \
		--name $(POSTGRES_CONTAINER) \
		-e POSTGRES_USER=$(POSTGRES_USER) \
		-e POSTGRES_PASSWORD=$(POSTGRES_PASSWORD) \
		-e POSTGRES_DB=$(POSTGRES_DB) \
		-p $(POSTGRES_PORT):5432 \
		postgres

down:
	docker stop $(POSTGRES_CONTAINER) || true
	docker rm $(POSTGRES_CONTAINER) || true

logs:
	docker logs -f $(POSTGRES_CONTAINER)

psql:
	docker exec -it $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)

reset: down
	$(MAKE) up
	$(MAKE) migrate

migrate:
	docker exec -i $(POSTGRES_CONTAINER) psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) < ./schema.sql
