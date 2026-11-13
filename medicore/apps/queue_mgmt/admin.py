from django.contrib import admin

from apps.queue_mgmt.models import QueueSession, QueueToken

admin.site.register(QueueSession)
admin.site.register(QueueToken)
