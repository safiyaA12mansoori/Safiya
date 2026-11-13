import json

from channels.generic.websocket import AsyncWebsocketConsumer


class QueueConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.doctor_id = self.scope["url_route"]["kwargs"]["doctor_id"]
        self.mode = self.scope["url_route"]["kwargs"].get("mode", "staff")
        if self.mode == "tv":
            self.group_name = f"queue_tv_{self.doctor_id}"
        else:
            self.group_name = f"queue_doctor_{self.doctor_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def queue_update(self, event):
        await self.send(text_data=json.dumps(event))
