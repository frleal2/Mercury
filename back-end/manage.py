#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

print('PYTHONPATH:', sys.path)  # Debugging line to check PYTHONPATH    
print("Files in back-end:", os.listdir('/opt/render/project/src/back-end'))  # Debugging line

def main():
    """Run administrative tasks."""
    settings_module = 'MercAPI.deployment_settings' if 'RENDER_EXTERNAL_HOSTNAME' in os.environ else 'MercAPI.settings'
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', settings_module)  # Update to match the new folder name
    print('DJANGO_SETTINGS_MODULE:', os.environ.get('DJANGO_SETTINGS_MODULE'))  # Debugging line
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    # Automatically create a superuser if it doesn't exist
    if 'RENDER_EXTERNAL_HOSTNAME' in os.environ and os.environ.get('CREATE_SUPERUSER') == 'true':
        try:
            from django.contrib.auth.models import User
            username = os.environ.get('DJANGO_SUPERUSER_USERNAME')
            email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
            password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')

            if username and email and password:
                if not User.objects.filter(is_superuser=True).exists():
                    User.objects.create_superuser(username=username, email=email, password=password)
                    print("Superuser created successfully.")
            else:
                print("Superuser creation skipped: Missing required environment variables.")
        except Exception as e:
            print(f"Error creating superuser: {e}")

    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
