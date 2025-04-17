set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input || echo "collectstatic failed, continuing..."
python manage.py migrate

