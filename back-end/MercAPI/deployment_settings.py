import os
import dj_database_url
from .settings import *
from .settings import BASE_DIR

ALLOWED_HOSTS = [os.environ.get('RENDER_EXTERNAL_HOSTNAME')]  # Default to '*' if not set
CSRF_TRUSTED_ORIGINS = ['https://' + os.environ.get('RENDER_EXTERNAL_HOSTNAME')]  # Handle None gracefully
DEBUG = False
SECRET_KEY = os.environ.get('SECRET_KEY')  # Fixed to use os.environ.get as a function

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Add CorsMiddleware at the top
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
    },
}

DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600
    )
}

if not DATABASES['default']:
    raise ValueError("DATABASE_URL environment variable is not set or invalid.")

print("Deployment settings loaded")  # Debugging line


