FROM python:3.12-slim

# Системные зависимости
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    libmagic1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Зависимости Python — два слоя для лучшего кеширования.
# base.txt (production) кешируется отдельно от local.txt (dev-инструменты).
COPY requirements/base.txt requirements/base.txt
RUN pip install --no-cache-dir --timeout=300 -r requirements/base.txt

COPY requirements/local.txt requirements/local.txt
RUN pip install --no-cache-dir --timeout=300 -r requirements/local.txt

# Исходный код
COPY . .

# Не запускать от root
RUN addgroup --system django && adduser --system --ingroup django django
RUN chown -R django:django /app
USER django

EXPOSE 8000
