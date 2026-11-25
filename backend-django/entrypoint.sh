#!/bin/sh
set -e

python manage.py wait_for_db
python manage.py migrate --noinput

if [ "$SEED_DEMO" = "true" ]; then
  python manage.py seed_demo
fi

exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers ${WEB_CONCURRENCY:-3} --access-logfile -
