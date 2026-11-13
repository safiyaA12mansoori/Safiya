from django.apps import AppConfig


class TextbooksConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.textbooks"
    label = "textbooks"
    verbose_name = "Textbooks"
