import os
from celery import Celery

# Set default Django settings module (use deployment_settings on Render)
settings_module = 'MercAPI.deployment_settings' if 'RENDER_EXTERNAL_HOSTNAME' in os.environ else 'MercAPI.settings'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', settings_module)

app = Celery('MercAPI')

# Load config from Django settings, using CELERY_ namespace
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()
