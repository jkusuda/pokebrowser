.PHONY: run test test-db vet docker

run:
	set -a && . ./.env && set +a && go run ./cmd/api

test:
	go test -race ./...

test-db:
	TEST_DATABASE_URL=postgresql://pokebrowser_api:pokebrowser-api-local@127.0.0.1:54322/postgres \
	TEST_ADMIN_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
	go test -race -p 1 ./...

vet:
	gofmt -l . && go vet ./...

docker:
	docker build -t pokebrowser-api .
