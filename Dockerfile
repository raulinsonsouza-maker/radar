# API + app
FROM python:3.12-slim AS api

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY db ./db
COPY data ./data
COPY scripts ./scripts

ENV PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Frontend build
FROM node:20-alpine AS frontend-build
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Production: API serves SPA
FROM python:3.12-slim AS production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY db ./db
COPY data ./data
COPY scripts ./scripts
COPY --from=frontend-build /web/dist ./frontend/dist
COPY scripts/docker_entrypoint.sh ./scripts/docker_entrypoint.sh
RUN chmod +x ./scripts/docker_entrypoint.sh

ENV PYTHONUNBUFFERED=1
ENV SERVE_FRONTEND=1
EXPOSE 8000
CMD ["./scripts/docker_entrypoint.sh"]
