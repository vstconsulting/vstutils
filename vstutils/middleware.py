import time
import logging
from django.conf import settings


logger = logging.getLogger(settings.VST_PROJECT)


class BaseMiddleware(object):
    __slots__ = 'get_response', 'logger'

    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = logger
        super(BaseMiddleware, self).__init__()

    def get_setting(self, value):
        '''
        Return django setting or None
        :param value: setting name
        :return: django setting or None
        '''
        return getattr(settings, value, None)

    def handler(self, request, response):  # nocv
        # pylint: disable=unused-argument
        return response

    def get_response_handler(self, request):
        return self.get_response(request)

    def __call__(self, request):
        return self.handler(request, self.get_response_handler(request))


class TimezoneHeadersMiddleware(BaseMiddleware):
    def handler(self, request, response):
        response['Server-Timezone'] = self.get_setting('TIME_ZONE')
        response['VSTutils-Version'] = self.get_setting('VSTUTILS_VERSION')
        return response


class ExecuteTimeHeadersMiddleware(BaseMiddleware):
    def get_response_handler(self, request):
        start_time = time.time()
        resonse = super(ExecuteTimeHeadersMiddleware, self).get_response_handler(request)
        resonse['ResponseTime'] = time.time() - start_time
        return resonse
