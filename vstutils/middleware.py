import logging
from django.conf import settings


logger = logging.getLogger(settings.VST_PROJECT)


class BaseMiddleware(object):
    def __init__(self, get_response):
        self.get_response = get_response
        super(BaseMiddleware, self).__init__()

    def handler(self, request, response):  # nocv
        # pylint: disable=unused-argument
        return response

    def __call__(self, request):
        return self.handler(request, self.get_response(request))


class TimezoneHeadersMiddleware(BaseMiddleware):
    def handler(self, request, response):
        response['Server-Timezone'] = getattr(settings, 'TIME_ZONE')
        return response
