"""Каркас сервера. Нужен, чтобы проверить цепочку GitHub -> Docker -> VPS -> HTTPS
до того, как готова настоящая логика (сначала «ходячий скелет», потом мясо)."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Azimut", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok"}


# TODO (ваша часть): эндпоинты /api/clients, /api/feed, /api/card/{id}, /api/chat.
# Подсказка: описывайте входы и выходы моделями pydantic по contract_schema.json,
# тогда Swagger на /docs появится сам и закроет пункт про OpenAPI.

# Статика (фронтенд по макету) подключается последней, чтобы не перекрывать /api и /health.
# Путь считаем от самого файла, а не от текущей папки: так сервер находит static/
# и при запуске из Docker (WORKDIR /app), и из любой другой директории.
# Если папки нет, сервер всё равно стартует: /health и /docs остаются рабочими.
STATIC_DIR = Path(__file__).resolve().parent / "static"
if STATIC_DIR.is_dir():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
