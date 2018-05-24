import logging
from django.conf import settings


logger = logging.getLogger(settings.VST_PROJECT)


class BaseMiddleware(object):
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

    def __call__(self, request):
        return self.handler(request, self.get_response(request))


class TimezoneHeadersMiddleware(BaseMiddleware):
    def handler(self, request, response):
        response['Server-Timezone'] = self.get_setting('TIME_ZONE')
        response['VSTutils-Version'] = self.get_setting('VSTUTILS_VERSION')
        return response
