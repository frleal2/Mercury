from django.apps import AppConfig

class MercapiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'MercAPI'
    
    def ready(self):
        import MercAPI.signals  # Import signals when app is ready