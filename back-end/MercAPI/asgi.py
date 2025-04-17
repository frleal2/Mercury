"""
ASGI config for MercApi project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application

settings_module = 'MercApi.deployment_settings' if 'RENDER_EXTERNAL_HOSTNAME' in os.environ else 'MercApi.settings'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', settings_module)  # Corrected to use the dynamic settings module

application = get_asgi_application()
