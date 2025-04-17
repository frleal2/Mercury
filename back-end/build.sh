set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input

python manage.py migrate

gunicorn MercApi.wsgi:application --bind 0.0.0.0:$PORT  # Corrected gunicorn command

