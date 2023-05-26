from vstutils.signals import before_mount_app
from django.dispatch import receiver
from fastapi import FastAPI
from fastapi.responses import JSONResponse


@receiver(before_mount_app)
def setup_new_view(sender: FastAPI, **kwargs):
    @sender.get('/test/view/json', response_class=JSONResponse, status_code=418)
    async def test_view_json():
        return {'ping': "PONG"}
