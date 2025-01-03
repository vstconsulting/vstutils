# Stubs for vstutils.api.responses (Python 3)
#
# NOTE: This dynamically typed stub was automatically generated by... hands in shell:
# from rest_framework import status
# template = '\nclass {name}(BaseResponseClass):\n    status_code = status.{name}\n\n\nclass Response{code}({name}):\n    ...\n\n'
# st = [(s, getattr(status, s)) for s in dir(status) if s.startswith('HTTP_')]
# for name, code in st: print(template.format(name=name, code=code), end='')

from rest_framework import response, status
from typing import Any, Dict, Text, SupportsFloat, Optional, Set


NO_CONTENT_STATUS_CODES: Set[int]


class BaseResponseClass(response.Response):
    data: Any
    timings: Optional[Dict[Text, SupportsFloat]]
    def __init__(self, *args: Any, **kwargs: Any) -> None: ...


class HTTP_100_CONTINUE(BaseResponseClass):
    status_code = status.HTTP_100_CONTINUE


class Response100(HTTP_100_CONTINUE):
    ...


class HTTP_101_SWITCHING_PROTOCOLS(BaseResponseClass):
    status_code = status.HTTP_101_SWITCHING_PROTOCOLS


class Response101(HTTP_101_SWITCHING_PROTOCOLS):
    ...


class HTTP_102_PROCESSING(BaseResponseClass):
    status_code = status.HTTP_102_PROCESSING


class Response102(HTTP_102_PROCESSING):
    ...


class HTTP_103_EARLY_HINTS(BaseResponseClass):
    status_code = status.HTTP_103_EARLY_HINTS


class Response103(HTTP_103_EARLY_HINTS):
    ...


class HTTP_200_OK(BaseResponseClass):
    status_code = status.HTTP_200_OK


class Response200(HTTP_200_OK):
    ...


class HTTP_201_CREATED(BaseResponseClass):
    status_code = status.HTTP_201_CREATED


class Response201(HTTP_201_CREATED):
    ...


class HTTP_202_ACCEPTED(BaseResponseClass):
    status_code = status.HTTP_202_ACCEPTED


class Response202(HTTP_202_ACCEPTED):
    ...


class HTTP_203_NON_AUTHORITATIVE_INFORMATION(BaseResponseClass):
    status_code = status.HTTP_203_NON_AUTHORITATIVE_INFORMATION


class Response203(HTTP_203_NON_AUTHORITATIVE_INFORMATION):
    ...


class HTTP_204_NO_CONTENT(BaseResponseClass):
    status_code = status.HTTP_204_NO_CONTENT


class Response204(HTTP_204_NO_CONTENT):
    ...


class HTTP_205_RESET_CONTENT(BaseResponseClass):
    status_code = status.HTTP_205_RESET_CONTENT


class Response205(HTTP_205_RESET_CONTENT):
    ...


class HTTP_206_PARTIAL_CONTENT(BaseResponseClass):
    status_code = status.HTTP_206_PARTIAL_CONTENT


class Response206(HTTP_206_PARTIAL_CONTENT):
    ...


class HTTP_207_MULTI_STATUS(BaseResponseClass):
    status_code = status.HTTP_207_MULTI_STATUS


class Response207(HTTP_207_MULTI_STATUS):
    ...


class HTTP_208_ALREADY_REPORTED(BaseResponseClass):
    status_code = status.HTTP_208_ALREADY_REPORTED


class Response208(HTTP_208_ALREADY_REPORTED):
    ...


class HTTP_226_IM_USED(BaseResponseClass):
    status_code = status.HTTP_226_IM_USED


class Response226(HTTP_226_IM_USED):
    ...


class HTTP_300_MULTIPLE_CHOICES(BaseResponseClass):
    status_code = status.HTTP_300_MULTIPLE_CHOICES


class Response300(HTTP_300_MULTIPLE_CHOICES):
    ...


class HTTP_301_MOVED_PERMANENTLY(BaseResponseClass):
    status_code = status.HTTP_301_MOVED_PERMANENTLY


class Response301(HTTP_301_MOVED_PERMANENTLY):
    ...


class HTTP_302_FOUND(BaseResponseClass):
    status_code = status.HTTP_302_FOUND


class Response302(HTTP_302_FOUND):
    ...


class HTTP_303_SEE_OTHER(BaseResponseClass):
    status_code = status.HTTP_303_SEE_OTHER


class Response303(HTTP_303_SEE_OTHER):
    ...


class HTTP_304_NOT_MODIFIED(BaseResponseClass):
    status_code = status.HTTP_304_NOT_MODIFIED


class Response304(HTTP_304_NOT_MODIFIED):
    ...


class HTTP_305_USE_PROXY(BaseResponseClass):
    status_code = status.HTTP_305_USE_PROXY


class Response305(HTTP_305_USE_PROXY):
    ...


class HTTP_306_RESERVED(BaseResponseClass):
    status_code = status.HTTP_306_RESERVED


class Response306(HTTP_306_RESERVED):
    ...


class HTTP_307_TEMPORARY_REDIRECT(BaseResponseClass):
    status_code = status.HTTP_307_TEMPORARY_REDIRECT


class Response307(HTTP_307_TEMPORARY_REDIRECT):
    ...


class HTTP_308_PERMANENT_REDIRECT(BaseResponseClass):
    status_code = status.HTTP_308_PERMANENT_REDIRECT


class Response308(HTTP_308_PERMANENT_REDIRECT):
    ...


class HTTP_400_BAD_REQUEST(BaseResponseClass):
    status_code = status.HTTP_400_BAD_REQUEST


class Response400(HTTP_400_BAD_REQUEST):
    ...


class HTTP_401_UNAUTHORIZED(BaseResponseClass):
    status_code = status.HTTP_401_UNAUTHORIZED


class Response401(HTTP_401_UNAUTHORIZED):
    ...


class HTTP_402_PAYMENT_REQUIRED(BaseResponseClass):
    status_code = status.HTTP_402_PAYMENT_REQUIRED


class Response402(HTTP_402_PAYMENT_REQUIRED):
    ...


class HTTP_403_FORBIDDEN(BaseResponseClass):
    status_code = status.HTTP_403_FORBIDDEN


class Response403(HTTP_403_FORBIDDEN):
    ...


class HTTP_404_NOT_FOUND(BaseResponseClass):
    status_code = status.HTTP_404_NOT_FOUND


class Response404(HTTP_404_NOT_FOUND):
    ...


class HTTP_405_METHOD_NOT_ALLOWED(BaseResponseClass):
    status_code = status.HTTP_405_METHOD_NOT_ALLOWED


class Response405(HTTP_405_METHOD_NOT_ALLOWED):
    ...


class HTTP_406_NOT_ACCEPTABLE(BaseResponseClass):
    status_code = status.HTTP_406_NOT_ACCEPTABLE


class Response406(HTTP_406_NOT_ACCEPTABLE):
    ...


class HTTP_407_PROXY_AUTHENTICATION_REQUIRED(BaseResponseClass):
    status_code = status.HTTP_407_PROXY_AUTHENTICATION_REQUIRED


class Response407(HTTP_407_PROXY_AUTHENTICATION_REQUIRED):
    ...


class HTTP_408_REQUEST_TIMEOUT(BaseResponseClass):
    status_code = status.HTTP_408_REQUEST_TIMEOUT


class Response408(HTTP_408_REQUEST_TIMEOUT):
    ...


class HTTP_409_CONFLICT(BaseResponseClass):
    status_code = status.HTTP_409_CONFLICT


class Response409(HTTP_409_CONFLICT):
    ...


class HTTP_410_GONE(BaseResponseClass):
    status_code = status.HTTP_410_GONE


class Response410(HTTP_410_GONE):
    ...


class HTTP_411_LENGTH_REQUIRED(BaseResponseClass):
    status_code = status.HTTP_411_LENGTH_REQUIRED


class Response411(HTTP_411_LENGTH_REQUIRED):
    ...


class HTTP_412_PRECONDITION_FAILED(BaseResponseClass):
    status_code = status.HTTP_412_PRECONDITION_FAILED


class Response412(HTTP_412_PRECONDITION_FAILED):
    ...


class HTTP_413_REQUEST_ENTITY_TOO_LARGE(BaseResponseClass):
    status_code = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE


class Response413(HTTP_413_REQUEST_ENTITY_TOO_LARGE):
    ...


class HTTP_414_REQUEST_URI_TOO_LONG(BaseResponseClass):
    status_code = status.HTTP_414_REQUEST_URI_TOO_LONG


class Response414(HTTP_414_REQUEST_URI_TOO_LONG):
    ...


class HTTP_415_UNSUPPORTED_MEDIA_TYPE(BaseResponseClass):
    status_code = status.HTTP_415_UNSUPPORTED_MEDIA_TYPE


class Response415(HTTP_415_UNSUPPORTED_MEDIA_TYPE):
    ...


class HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE(BaseResponseClass):
    status_code = status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE


class Response416(HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE):
    ...


class HTTP_417_EXPECTATION_FAILED(BaseResponseClass):
    status_code = status.HTTP_417_EXPECTATION_FAILED


class Response417(HTTP_417_EXPECTATION_FAILED):
    ...


class HTTP_418_IM_A_TEAPOT(BaseResponseClass):
    status_code = status.HTTP_418_IM_A_TEAPOT


class Response418(HTTP_418_IM_A_TEAPOT):
    ...


class HTTP_421_MISDIRECTED_REQUEST(BaseResponseClass):
    status_code = status.HTTP_421_MISDIRECTED_REQUEST


class Response421(HTTP_421_MISDIRECTED_REQUEST):
    ...


class HTTP_422_UNPROCESSABLE_ENTITY(BaseResponseClass):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY


class Response422(HTTP_422_UNPROCESSABLE_ENTITY):
    ...


class HTTP_423_LOCKED(BaseResponseClass):
    status_code = status.HTTP_423_LOCKED


class Response423(HTTP_423_LOCKED):
    ...


class HTTP_424_FAILED_DEPENDENCY(BaseResponseClass):
    status_code = status.HTTP_424_FAILED_DEPENDENCY


class Response424(HTTP_424_FAILED_DEPENDENCY):
    ...


class HTTP_425_TOO_EARLY(BaseResponseClass):
    status_code = status.HTTP_425_TOO_EARLY


class Response425(HTTP_425_TOO_EARLY):
    ...


class HTTP_426_UPGRADE_REQUIRED(BaseResponseClass):
    status_code = status.HTTP_426_UPGRADE_REQUIRED


class Response426(HTTP_426_UPGRADE_REQUIRED):
    ...


class HTTP_428_PRECONDITION_REQUIRED(BaseResponseClass):
    status_code = status.HTTP_428_PRECONDITION_REQUIRED


class Response428(HTTP_428_PRECONDITION_REQUIRED):
    ...


class HTTP_429_TOO_MANY_REQUESTS(BaseResponseClass):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS


class Response429(HTTP_429_TOO_MANY_REQUESTS):
    ...


class HTTP_431_REQUEST_HEADER_FIELDS_TOO_LARGE(BaseResponseClass):
    status_code = status.HTTP_431_REQUEST_HEADER_FIELDS_TOO_LARGE


class Response431(HTTP_431_REQUEST_HEADER_FIELDS_TOO_LARGE):
    ...


class HTTP_451_UNAVAILABLE_FOR_LEGAL_REASONS(BaseResponseClass):
    status_code = status.HTTP_451_UNAVAILABLE_FOR_LEGAL_REASONS


class Response451(HTTP_451_UNAVAILABLE_FOR_LEGAL_REASONS):
    ...


class HTTP_500_INTERNAL_SERVER_ERROR(BaseResponseClass):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR


class Response500(HTTP_500_INTERNAL_SERVER_ERROR):
    ...


class HTTP_501_NOT_IMPLEMENTED(BaseResponseClass):
    status_code = status.HTTP_501_NOT_IMPLEMENTED


class Response501(HTTP_501_NOT_IMPLEMENTED):
    ...


class HTTP_502_BAD_GATEWAY(BaseResponseClass):
    status_code = status.HTTP_502_BAD_GATEWAY


class Response502(HTTP_502_BAD_GATEWAY):
    ...


class HTTP_503_SERVICE_UNAVAILABLE(BaseResponseClass):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE


class Response503(HTTP_503_SERVICE_UNAVAILABLE):
    ...


class HTTP_504_GATEWAY_TIMEOUT(BaseResponseClass):
    status_code = status.HTTP_504_GATEWAY_TIMEOUT


class Response504(HTTP_504_GATEWAY_TIMEOUT):
    ...


class HTTP_505_HTTP_VERSION_NOT_SUPPORTED(BaseResponseClass):
    status_code = status.HTTP_505_HTTP_VERSION_NOT_SUPPORTED


class Response505(HTTP_505_HTTP_VERSION_NOT_SUPPORTED):
    ...


class HTTP_506_VARIANT_ALSO_NEGOTIATES(BaseResponseClass):
    status_code = status.HTTP_506_VARIANT_ALSO_NEGOTIATES


class Response506(HTTP_506_VARIANT_ALSO_NEGOTIATES):
    ...


class HTTP_507_INSUFFICIENT_STORAGE(BaseResponseClass):
    status_code = status.HTTP_507_INSUFFICIENT_STORAGE


class Response507(HTTP_507_INSUFFICIENT_STORAGE):
    ...


class HTTP_508_LOOP_DETECTED(BaseResponseClass):
    status_code = status.HTTP_508_LOOP_DETECTED


class Response508(HTTP_508_LOOP_DETECTED):
    ...


class HTTP_509_BANDWIDTH_LIMIT_EXCEEDED(BaseResponseClass):
    status_code = status.HTTP_509_BANDWIDTH_LIMIT_EXCEEDED


class Response509(HTTP_509_BANDWIDTH_LIMIT_EXCEEDED):
    ...


class HTTP_510_NOT_EXTENDED(BaseResponseClass):
    status_code = status.HTTP_510_NOT_EXTENDED


class Response510(HTTP_510_NOT_EXTENDED):
    ...


class HTTP_511_NETWORK_AUTHENTICATION_REQUIRED(BaseResponseClass):
    status_code = status.HTTP_511_NETWORK_AUTHENTICATION_REQUIRED


class Response511(HTTP_511_NETWORK_AUTHENTICATION_REQUIRED):
    ...
