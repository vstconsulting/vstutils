from rest_framework import status, response


__globals = globals()


def __status_name_filter(name):
    return name.startswith('HTTP_')


class BaseResponseClass(response.Response):
    """
    API response class with default status code.

    :var status_code: HTTP status code.
    :vartype status_code: int

    :ivar timings: Response timings.
    :vartype timings: int,None

    :param timings: Response timings.
    :vartype timings: int,None
    """

    def __init__(self, *args, **kwargs):
        self.timings = kwargs.pop('timings', None)
        super().__init__(*args, **kwargs)
        if isinstance(self.data, str):
            self.data = {'detail': self.data}


for __status_name in filter(__status_name_filter, dir(status)):
    __status_code = getattr(status, __status_name)
    __response_name = f'Response{__status_code}'
    __http_response_name = __status_name
    __globals[__response_name] = type(
        __response_name,
        (BaseResponseClass,),
        {"status_code": __status_code}
    )
    __globals[__http_response_name] = __globals[__response_name]
