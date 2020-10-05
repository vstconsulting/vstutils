import typing as _t
import re

from rest_framework import serializers


class RegularExpressionValidator:
    """
    Class for regular expression based validation

    :raises rest_framework.exceptions.ValidationError: in case value does not match regular expression
    """
    regexp: _t.Optional[_t.Pattern[_t.Text]] = None

    def __init__(self, regexp: _t.Optional[_t.Pattern] = None):
        """
        :param regexp: Compiled regular expression
        """
        self._regexp = regexp if regexp else self.regexp

    def __call__(self, value):
        if value and not self._regexp.match(value):
            raise serializers.ValidationError(self._error_msg())

    def _error_msg(self):
        return f'This field must match pattern {self._regexp.pattern}'


class UrlQueryStringValidator(RegularExpressionValidator):
    """Class for validation url query string, for example a=&b=1"""

    regexp = re.compile(r'^[^&?=].+=.*$')
