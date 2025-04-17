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
        from django.apps import apps  # Import apps to check readiness
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    # Automatically run migrations
    if 'RENDER_EXTERNAL_HOSTNAME' in os.environ:
        def run_migrations():
            try:
                print("Running makemigrations...")
                execute_from_command_line(['manage.py', 'makemigrations'])
                print("Running migrate...")
                execute_from_command_line(['manage.py', 'migrate'])
                print("Migrations applied successfully.")
            except Exception as e:
                print(f"Error during migrations: {e}")

        run_migrations()

    # Automatically create a superuser if it doesn't exist
    if 'RENDER_EXTERNAL_HOSTNAME' in os.environ and os.environ.get('CREATE_SUPERUSER') == 'true':
        def create_superuser():
            from django.contrib.auth.models import User
            username = os.environ.get('DJANGO_SUPERUSER_USERNAME')
            email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
            password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')

            if username and email and password:
                if not User.objects.filter(username=username).exists():
                    try:
                        User.objects.create_superuser(username=username, email=email, password=password)
                        print("Superuser created successfully.")
                    except Exception as e:
                        print(f"Error creating superuser: {e}")
                else:
                    print("Superuser already exists.")
                    print(f"Username: {username}")
                    print(f"Password: {password}")
            else:
                print("Superuser creation skipped: Missing required environment variables.")
                print(f"DJANGO_SUPERUSER_USERNAME: {username}")
                print(f"DJANGO_SUPERUSER_EMAIL: {email}")
                print(f"DJANGO_SUPERUSER_PASSWORD: {'set' if password else 'not set'}")

        # Ensure apps are loaded before creating the superuser
        if apps.ready:
            create_superuser()

    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
