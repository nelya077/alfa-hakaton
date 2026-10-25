# Версия Python: одна и та же в README, локально и здесь.
# Перед сменой проверьте, что для неё есть сборки torch и sentence-transformers.
ARG PYTHON_VERSION=3.12
FROM python:${PYTHON_VERSION}-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/models

WORKDIR /app

# 1) Тяжёлое и редко меняющееся: CPU-версия torch (на VPS нет GPU, образ меньше в разы).
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu

# 2) Остальные зависимости: слой кэшируется, пока requirements.txt не менялся.
COPY requirements.txt .
RUN pip install -r requirements.txt

# 3) Код. Данные и PDF банка сюда не копируются (см. .dockerignore), они монтируются томами.
COPY . .

# Не запускаем от root; каталог кэша моделей принадлежит пользователю app.
RUN useradd --create-home app && mkdir -p /models && chown -R app:app /app /models
USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)"

# Один воркер: на сервере 2 ГБ памяти, а модель эмбеддингов грузится в каждый процесс.
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
