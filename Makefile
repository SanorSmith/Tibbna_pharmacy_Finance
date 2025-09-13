dev:
	npm run dev

ai:
	gemini -m "gemini-2.5-pro"

db-migrate:
	npm run migrate

db-migrate-dry:
	npm run migrate-dry

db-migrate-push:
	npm run migrate-push

db-connect:
	psql $(shell grep "DATABASE_URL=" .env | cut -d'=' -f2)

