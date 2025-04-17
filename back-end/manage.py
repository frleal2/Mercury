#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

print('PYTHONPATH:', sys.path)  # Debugging line to check PYTHONPATH    
print("Files in back-end:", os.listdir('/opt/render/project/src/back-end'))  # Debugging line

def main():
    """Run administrative tasks."""
    settings_module = 'MercApi.deployment_settings' if 'RENDER_EXTERNAL_HOSTNAME' in os.environ else 'MercApi.settings'
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', settings_module)
    print('DJANGO_SETTINGS_MODULE:', os.environ.get('DJANGO_SETTINGS_MODULE'))  # Debugging line
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
