import time
import logging
import typing as _t

from django.db import connection
from django.conf import settings
from django.http.request import HttpRequest
from django.http.response import HttpResponse
from django.utils import translation
from django.urls import resolve
from django.shortcuts import redirect

from .api.models import Language
from .utils import BaseVstObject


logger = logging.getLogger(settings.VST_PROJECT)


class QueryTimingLogger:
    __slots__ = ('queries_time',)

    def __init__(self):
        self.queries_time = 0

    def __call__(self, execute, sql, params, many, context):
        start = time.time()
        try:
            return execute(sql, params, many, context)
        finally:
            self.queries_time += time.time() - start


class BaseMiddleware(BaseVstObject):
    """
    Middleware base class for handling:

    * Incoming requests by :meth:`.BaseMiddleware.request_handler()`;
    * Outgoing response before any calling on server by :meth:`.BaseMiddleware.get_response_handler()`;
    * Outgoing responses by :meth:`.BaseMiddleware.handler()`.

    Middleware must be added to `MIDDLEWARE` list in settings.

    Example:
        .. sourcecode:: python

            from vstutils.middleware import BaseMiddleware
            from django.http import HttpResponse


            class CustomMiddleware(BaseMiddleware):
                def request_handler(self, request):
                    # Add header to request
                    request.headers['User-Agent'] = 'Mozilla/5.0'
                    return request

                def get_response_handler(self, request):
                    if not request.user.is_stuff:
                        # Return 403 HTTP status for non-stuff users.
                        # This request never gets in any view.
                        return HttpResponse(
                            "Access denied!",
                            content_type="text/plain",
                            status_code=403
                        )
                    return super().get_response_handler(request)

                def handler(self, request, response):
                    # Add header to response
                    response['Custom-Header'] = 'Some value'
                    return response

    """
    __slots__ = 'get_response', 'logger'

    logger: logging.Logger

    def __init__(self, get_response: _t.Callable):
        self.get_response = get_response
        self.logger = logger
        super().__init__()

    def get_setting(self, value: _t.Text):
        return self.get_django_settings(value)

    def handler(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:  # nocv
        # pylint: disable=unused-argument

        """
        The response handler. Method to process responses.

        :param request: HTTP-request object.
        :type request: django.http.HttpRequest
        :param response: HTTP-response object which will be sended to client.
        :type response: django.http.HttpResponse
        :return: Handled response object.
        :rtype: django.http.HttpResponse
        """

        return response

    def request_handler(self, request: HttpRequest) -> HttpRequest:
        # pylint: disable=unused-argument

        """
        The request handler. Called before request is handled by a view.

        :param request: HTTP-request object which is wrapped from client request.
        :type request: django.http.HttpRequest
        :return: Handled request object.
        :rtype: django.http.HttpRequest
        """

        return request

    def get_response_handler(self, request: HttpRequest) -> HttpResponse:
        """
        Entrypoint for breaking or continuing request handling.
        This function must return `django.http.HttpResponse` object
        or result of parent class calling.

        :param request: HTTP-request object which is wrapped from client request.
        :type request: django.http.HttpRequest
        :rtype: django.http.HttpResponse
        """
        return self.get_response(request)

    def __call__(self, request: HttpRequest) -> HttpResponse:
        return self.handler(
            self.request_handler(request),
            self.get_response_handler(request)
        )


class TimezoneHeadersMiddleware(BaseMiddleware):
    __slots__ = ()

    def handler(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        response['Server-Timezone'] = self.get_setting('TIME_ZONE')
        response['VSTutils-Version'] = self.get_setting('VSTUTILS_VERSION')
        return response


class ExecuteTimeHeadersMiddleware(BaseMiddleware):
    __slots__ = ()

    def __duration_handler(self, data):
        key, value = data
        if isinstance(value, (list, tuple, map, filter, _t.Generator)):
            value = ''.join((self.__duration_handler(('', v)) for v in value))
        elif isinstance(value, (int, float)):
            value = f';dur={float(value)}'
        elif isinstance(value, str) and value:
            if ' ' in value:
                value = f'"{value}"'
            value = f';desc={value}'
        elif not value:
            value = ''
        return f'{key}{value}'

    def _round_time(self, seconds: _t.Union[int, float]):
        return round(seconds * 1000, 2)

    def get_response_handler(self, request: HttpRequest) -> HttpResponse:
        start_time = time.time()
        get_response_handler = super().get_response_handler
        ql = QueryTimingLogger()

        if not getattr(request, 'is_bulk', False):
            with connection.execute_wrapper(ql):
                response = get_response_handler(request)
        else:
            response = get_response_handler(request)

        response_durations = getattr(response, 'timings', None)  # type: ignore
        total_time = self._round_time(time.time() - start_time)

        if getattr(request, 'is_bulk', False):
            response['Response-Time'] = str(total_time)
        else:
            if response_durations:
                response_durations = f', {", ".join(map(self.__duration_handler, response_durations.items()))}'
            else:
                response_durations = ""
            response_durations += f', db_execution_time;dur={self._round_time(ql.queries_time)}'
            response['Server-Timing'] = f'total;dur={total_time}{response_durations or ""}'
        return response


class LangMiddleware(BaseMiddleware):
    __slots__ = ()

    def get_lang_object(self, request: HttpRequest) -> _t.Tuple[Language, bool]:
        set_cookie = True
        if 'lang' in request.GET:
            code = request.GET['lang']
        elif settings.LANGUAGE_COOKIE_NAME in request.COOKIES:
            code = request.COOKIES[settings.LANGUAGE_COOKIE_NAME]
            set_cookie = False
        else:
            code = translation.get_language_from_request(request)  # type: ignore
        obj = Language.objects.filter(code=code).first()
        if obj is not None:
            return obj, set_cookie
        return Language.objects.get(code=settings.LANGUAGE_CODE), set_cookie  # nocv

    def get_response_handler(self, request: HttpRequest) -> HttpResponse:
        request.language, set_cookie = self.get_lang_object(request)  # type: ignore
        translation.activate(request.language.code)  # type: ignore
        request.LANGUAGE_CODE = translation.get_language()  # type: ignore
        response = super().get_response_handler(request)
        if set_cookie:
            response.set_cookie('lang', request.language.code)  # type: ignore
        if 'Content-Language' not in response:
            response['Content-Language'] = request.language.code  # type: ignore
        return response


class TwoFaMiddleware(BaseMiddleware):
    pass_names = (
        'login',
        'logout',
        'pwa_manifest',
        'service_worker',
        'offline_gui',
        'user_registration',
        'terms',
    )

    def request_handler(self, request: HttpRequest) -> HttpRequest:
        request.user.need_twofa = False  # type: ignore
        if request.user.is_authenticated:
            twofa = getattr(request.user, 'twofa', None)
            if twofa and not request.session.get('2fa', False):
                request.user.need_twofa = True  # type: ignore
        return request

    def check_url_name(self, request):
        url_name = resolve(request.path).url_name
        return any([
            url_name not in self.pass_names,
            url_name is not None and url_name.startswith('password_reset')
        ])

    def get_response_handler(self, request: HttpRequest) -> HttpResponse:
        if request.user.need_twofa and self.check_url_name(request):  # type: ignore
            return redirect('login')
        return super().get_response_handler(request)
