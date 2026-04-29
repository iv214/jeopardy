# Jeopardy // Своя игра

## Развертывание

### Требования к среде развертывания

1. Установленный [Docker](https://docs.docker.com/engine/install)
2. Файл [docker-compose.yml](./docker-compose.yml) в целевой директории

### Инструкция по развертыванию

В терминале из целевой директории выполнить:
```
docker pull ghcr.io/iv214/jeopardy-backend:latest
docker pull ghcr.io/iv214/jeopardy-frontend:latest
docker compose down
docker compose up -d
docker image prune -f
```

## Среда разработки

### Требования к среде разработки

Установленный [Node.js](https://nodejs.org/)

### Backend

[Инструкции по работе с бэкенд-частью](./jeopardy-backend/README.md)

[Документация разработчика по бэкенд-части](./jeopardy-frontend/README.dev.md)

### Frontend

[Инструкции по работе с фронтенд-частью](./jeopardy-frontend/README.md)


[Документация разработчика по фронтенд-части](./jeopardy-frontend/README.dev.md)
