# pylint: disable=unused-import
from __future__ import unicode_literals
from rest_framework import status


class VSTUtilsException(Exception):
    msg = "Bad request."
    status = status.HTTP_400_BAD_REQUEST

    def __init__(self, *args, **kwargs):
        self.msg = (list(args)[0:1]+[""])[0]
        super(VSTUtilsException, self).__init__(*args, **kwargs)

    def __repr__(self):
        return str(self.msg)


class UnknownTypeException(VSTUtilsException):
    _def_message = "Unknown type {}."
    status = status.HTTP_415_UNSUPPORTED_MEDIA_TYPE

    def __init__(self, tp, msg=None):
        self._def_message = msg or self._def_message
        msg = self._def_message.format(tp)
        super(UnknownTypeException, self).__init__(msg)


class NotApplicable(VSTUtilsException):
    status = status.HTTP_404_NOT_FOUND
