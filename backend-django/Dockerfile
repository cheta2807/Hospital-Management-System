FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Collect static files for the Django admin (served by WhiteNoise)
RUN SECRET_KEY=build-only-key DB_ENGINE=sqlite python manage.py collectstatic --noinput

RUN chmod +x entrypoint.sh
EXPOSE 8000
CMD ["./entrypoint.sh"]
