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

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://mercury-337x.onrender.com',
    'https://myfleetly.com',
    'https://www.myfleetly.com',
]

# Frontend URL for invitation links
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://myfleetly.com')

# Static files configuration for production
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# WhiteNoise configuration for better static file serving
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = True

# AWS S3 Configuration for Production
USE_S3 = os.environ.get('USE_S3', 'False').lower() == 'true'

if USE_S3:
    # AWS S3 Settings
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'us-east-1')
    AWS_S3_CUSTOM_DOMAIN = os.environ.get('AWS_S3_CUSTOM_DOMAIN')
    
    # S3 Storage Settings
    AWS_DEFAULT_ACL = None
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
    }
    
    # Use signed URLs for private files
    AWS_QUERYSTRING_AUTH = True
    AWS_QUERYSTRING_EXPIRE = 3600  # URLs expire after 1 hour
    
    # Media URL for S3 (will be signed URLs)
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/' if AWS_S3_CUSTOM_DOMAIN else f'https://{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com/media/'
    
    # Use S3 for media files, WhiteNoise for static files
    STORAGES = {
        'default': {
            'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage',
        },
        'staticfiles': {
            'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
        },
    }
    
    # Static files are still served by WhiteNoise, not S3
    STATIC_URL = '/static/'
else:
    # Fallback to WhiteNoise for both static and media files
    STORAGES = {
        'default': {
            'BACKEND': 'django.core.files.storage.FileSystemStorage',
        },
        'staticfiles': {
            'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
        },
    }
    
    # Local static and media URLs
    STATIC_URL = '/static/'
    MEDIA_URL = '/media/'

DATABASES = {
    'default': dj_database_url.config(
        default=os.environ['DATABASE_URL'],  # Use the DATABASE_URL environment variable
        conn_max_age=600
    )
}

if not DATABASES['default']:
    raise ValueError("DATABASE_URL environment variable is not set or invalid.")

# Email Configuration for Production (Google Workspace)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)
SERVER_EMAIL = DEFAULT_FROM_EMAIL

print("Deployment settings loaded")  # Debugging line


