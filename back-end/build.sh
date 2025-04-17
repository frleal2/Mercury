#!/usr/bin/env bash
# Exit on error
set -o errexit

# Modify this line as needed for your package manager (pip, poetry, etc.)
pip install -r requirements.txt

# Export the correct settings module for Render deployment
export DJANGO_SETTINGS_MODULE=MercApi.deployment_settings

# Convert static asset files
python manage.py collectstatic --no-input || echo "collectstatic failed, continuing..."

# Apply any outstanding database migrations
python manage.py migrate