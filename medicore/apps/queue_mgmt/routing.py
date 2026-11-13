from django.urls import re_path

from apps.queue_mgmt.consumers import QueueConsumer

websocket_urlpatterns = [
    re_path(r"ws/queue/(?P<mode>staff|tv)/(?P<doctor_id>\d+)/$", QueueConsumer.as_asgi()),
]
