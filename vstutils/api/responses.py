from rest_framework import status, response


__globals = globals()


def __status_name_filter(name):
    return name.startswith('HTTP_')


class BaseResponseClass(response.Response):
    """
    API response class with default status code.
    """

    __slots__ = ('data',)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if isinstance(self.data, str):
            self.data = dict(detail=self.data)


for __status_name in filter(__status_name_filter, dir(status)):
    __status_code = getattr(status, __status_name)
    __response_name = 'Response{}'.format(__status_code)
    __http_response_name = __status_name
    __globals[__response_name] = type(
        __response_name,
        (BaseResponseClass,),
        {"status_code": __status_code, "__slots__": ()}
    )
    __globals[__http_response_name] = __globals[__response_name]
