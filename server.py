"""API сервиса Azimut: профили клиентов и персональные инсайты."""

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent
PROFILES_FILE = BASE_DIR / "client_profiles.json"
INSIGHTS_FILE = BASE_DIR / "insights.json"

app = FastAPI(title="Azimut", version="0.2.0")


def read_json(path: Path) -> Any:
    """Читает JSON-файл и возвращает понятную ошибку, если он недоступен."""
    if not path.is_file():
        raise HTTPException(
            status_code=503,
            detail=f"Файл данных не найден: {path.name}",
        )

    try:
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except (json.JSONDecodeError, OSError) as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Не удалось прочитать {path.name}: {exc}",
        ) from exc


def get_profiles() -> list[dict]:
    data = read_json(PROFILES_FILE)
    if not isinstance(data, list):
        raise HTTPException(
            status_code=500,
            detail="client_profiles.json должен содержать список",
        )
    return data


def get_insights() -> list[dict]:
    data = read_json(INSIGHTS_FILE)
    if not isinstance(data, list):
        raise HTTPException(
            status_code=500,
            detail="insights.json должен содержать список",
        )
    return data


def find_source(insight: dict) -> dict:
    """Находит источник, соответствующий событию."""
    event = insight.get("event", {})
    event_id = event.get("event_id")

    for source in insight.get("sources", []):
        if source.get("source_id") == event_id:
            return source

    return {}


def format_insight(insight: dict) -> dict:
    """Преобразует инсайт в удобный формат для интерфейса."""
    event = insight.get("event", {})
    relevance = insight.get("relevance", {})
    interpretation = insight.get("interpretation", {})
    score = relevance.get("score", 0) or 0
    source = find_source(insight)

    if score >= 0.65:
        level = "высокая"
    elif score >= 0.4:
        level = "средняя"
    else:
        level = "низкая"

    tags = event.get("topic_tags", [])
    consequences = interpretation.get("possible_consequences", [])

    kinds = []
    if any(item.get("type") == "risk" for item in consequences):
        kinds.append("risk")
    if any(item.get("type") == "opportunity" for item in consequences):
        kinds.append("opp")
    if interpretation.get("bank_view"):
        kinds.append("bank")

    return {
        "id": event.get("event_id", ""),
        "client_id": insight.get("client_id", ""),
        "title": event.get("title", "Без названия"),
        "level": level,
        "score": score,
        "kind": "Новость",
        "kindCls": "cf",
        "src": source.get("title") or event.get("source_type", "Источник не указан"),
        "url": source.get("url_or_doc", ""),
        "date": event.get("published_at", ""),
        "tags": tags,
        "kinds": kinds,
        "why": "Почему это важно:",
        "text": interpretation.get("why_relevant", ""),
        "foot": [
            ["cc", "Данные клиента"],
            ["cm", "Вывод модели"],
        ],
        "interpretation": interpretation,
        "relevance": relevance,
        "sources": insight.get("sources", []),
        "attribution": insight.get("attribution", {}),
        "provenance": insight.get("provenance", {}),
        "raw": insight,
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/clients")
def list_clients():
    """Список клиентов для выбора в интерфейсе."""
    result = []

    for profile in get_profiles():
        products = profile.get("products") or []
        result.append({
            "id": profile.get("client_id", ""),
            "industry": profile.get("okved_name")
                        or profile.get("industry_sector", "Не указана"),
            "region": profile.get("region", "Не указан"),
            "city": profile.get("city", ""),
            "products": products,
            "productsCap": ", ".join(map(str, products)),
            "revenue_bucket": profile.get("revenue_bucket"),
            "employees_bucket": profile.get("employees_bucket"),
            "chips": [],
        })

    return result


@app.get("/api/feed")
def list_feed(
    client_id: str = Query(..., description="Идентификатор клиента"),
):
    """Персональная лента готовых инсайтов для выбранного клиента."""
    known_clients = {
        profile.get("client_id") for profile in get_profiles()
    }

    if client_id not in known_clients:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    items = [
        format_insight(item)
        for item in get_insights()
        if item.get("client_id") == client_id
    ]

    items.sort(
        key=lambda item: (
            item.get("score", 0),
            item.get("date", ""),
        ),
        reverse=True,
    )

    return {
        "client_id": client_id,
        "count": len(items),
        "items": items,
    }


@app.get("/api/card/{event_id}")
def get_card(event_id: str):
    """Подробная карточка инсайта по идентификатору события."""
    for insight in get_insights():
        event = insight.get("event", {})
        if event.get("event_id") == event_id:
            return format_insight(insight)

    raise HTTPException(status_code=404, detail="Инсайт не найден")


# Статика подключается последней, чтобы не перекрывать API-маршруты.
STATIC_DIR = BASE_DIR / "static"
if STATIC_DIR.is_dir():
    app.mount(
        "/",
        StaticFiles(directory=STATIC_DIR, html=True),
        name="static",
    )