"""Каркас сервера. Нужен, чтобы проверить цепочку GitHub -> Docker -> VPS -> HTTPS
до того, как готова настоящая логика (сначала «ходячий скелет», потом мясо)."""
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
app.mount("/", StaticFiles(directory="static", html=True), name="static")
