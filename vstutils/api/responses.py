from rest_framework import status, response


class BaseResponseClass(response.Response):
    """
    API response class with default status code.
    """

    __slots__ = ('data',)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if isinstance(self.data, str):
            self.data = dict(detail=self.data)


for __status_name in filter(lambda x: x.startswith('HTTP_'), dir(status)):
    __status_code = getattr(status, __status_name)
    __response_name = 'Response{}'.format(__status_code)
    __http_response_name = __status_name
    globals()[__response_name] = type(__response_name, (BaseResponseClass,), {"status_code": __status_code, "__slots__": ()})
    globals()[__http_response_name] = globals()[__response_name]
