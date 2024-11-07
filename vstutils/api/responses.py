from rest_framework import status, response


__globals = globals()
NO_CONTENT_STATUS_CODES = {
    status.HTTP_100_CONTINUE,
    status.HTTP_101_SWITCHING_PROTOCOLS,
    status.HTTP_102_PROCESSING,
    status.HTTP_103_EARLY_HINTS,
    status.HTTP_204_NO_CONTENT,
    status.HTTP_304_NOT_MODIFIED,
    # This statuses might be also included in the future:
    # status.HTTP_301_MOVED_PERMANENTLY,
    # status.HTTP_302_FOUND,
    # status.HTTP_303_SEE_OTHER,
    # status.HTTP_307_TEMPORARY_REDIRECT,
    # status.HTTP_308_PERMANENT_REDIRECT,
}


def __status_name_filter(name):
    return name.startswith('HTTP_')


class BaseResponseClass(response.Response):
    """
    API response class with default status code.

    :var status_code: HTTP status code.
    :type status_code: int

    :ivar timings: Response timings.
    :type timings: int,None

    :param timings: Response timings.
    :type timings: int,None
    """

    def __init__(self, *args, **kwargs):
        self.timings = kwargs.pop('timings', None)
        super().__init__(*args, **kwargs)
        if isinstance(self.data, str):
            self.data = {'detail': self.data}


class NoResponse(BaseResponseClass):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.data = None


for __status_name in filter(__status_name_filter, dir(status)):
    __status_code = getattr(status, __status_name)
    __response_name = f'Response{__status_code}'
    __http_response_name = __status_name
    __globals[__response_name] = type(
        __response_name,
        (NoResponse if __status_code in NO_CONTENT_STATUS_CODES else BaseResponseClass,),
        {"status_code": __status_code}
    )
    __globals[__http_response_name] = __globals[__response_name]
