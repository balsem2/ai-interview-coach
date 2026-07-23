# Docker Compose

This project is split into four Docker containers:

- `frontend`: React application served by Nginx
- `backend`: FastAPI API
- `postgres`: PostgreSQL database
- `ollama`: local AI runtime in Docker

## Start

Create `backend/.env` automatically if it does not exist:

```powershell
.\setup-env.ps1
```

If `backend/.env` already exists, the script keeps it unchanged.

```powershell
docker compose up --build
```

Frontend:

```text
http://localhost:3000
```

Backend:

```text
http://localhost:8001
```

PostgreSQL from the host machine:

```text
localhost:5433
```

Inside Docker, the backend connects to PostgreSQL with:

```text
postgres:5432
```

Inside Docker, the backend connects to Ollama with:

```text
ollama:11434
```

## Pull the Ollama model

The first time, download the model inside the Ollama container:

```powershell
docker exec -it ai-interview-ollama ollama pull llama3.2:1b
```

## Stop

```powershell
docker compose down
```

To delete database and Ollama volumes too:

```powershell
docker compose down -v
```

## Import questions

Before importing, copy the dataset into:

```text
database/Mock_interview_questions.json
```

After the containers are running, run:

```powershell
docker compose exec backend python scripts/import_questions.py
```

The backend container reads it from:

```text
/app/data/Mock_interview_questions.json
```

This path is configured in `docker-compose.yml` with `DATASET_PATH`.
