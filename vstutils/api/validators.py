import base64
import typing as _t
import re
import warnings
from io import BytesIO
from mimetypes import guess_type

from rest_framework import serializers

try:
    from PIL import Image, UnidentifiedImageError

    has_pillow = True
except ImportError:  # nocv
    has_pillow = False


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


class ImageValidator:
    """
    Base Image Validation class
    Validates image format
    Won't work if Pillow isn't installed
    :param extensions: Tuple or List of file extensions, that should pass the validation
    Raises rest_framework.exceptions.ValidationError: in case file extension are not in the list
    """
    warning_msg = 'Warning! Pillow is not installed, validation has not been done'
    default_extensions: _t.Union[_t.Tuple, _t.List] = [
        'bmp',
        'jpeg',
        'jpg',
        'png',
    ]

    def __init__(self, extensions: _t.Optional[_t.Union[_t.Tuple, _t.List]] = None, **kwargs):
        if extensions is not None:
            assert isinstance(extensions, (tuple, list)), "extensions must be list or tuple"
        else:
            extensions = self.default_extensions
        self.extensions = tuple(
            filter(
                bool,
                {
                    guess_type(f'name.{e}')[0]
                    for e in extensions
                }
            )
        )
        for key, value in kwargs.items():
            setattr(self, key, value)

    def __call__(self, value):
        if not self.has_pillow:
            warnings.warn(self.warning_msg, ImportWarning)
            return
        file_media_type = guess_type(value['name'])[0]
        if value and self.extensions and file_media_type not in self.extensions:
            raise serializers.ValidationError(f'unsupported image file format,'
                                              f' expected ({",".join(self.extensions)}),'
                                              f' got {file_media_type or ""}')

    @property
    def has_pillow(self):
        """
        Check if Pillow is installed
        """
        return has_pillow


class ImageOpenValidator(ImageValidator):
    """
    Image validator that checks if image can be unpacked from b64 to PIL Image obj

    Raises rest_framework.exceptions.ValidationError if PIL throws error when trying to open image
    """
    error_msg = 'for some reason, this image file cannot be opened'

    def __call__(self, value):
        if not self.has_pillow:
            warnings.warn(self.warning_msg, ImportWarning)
            return
        super().__call__(value)
        try:
            self.img = Image.open(BytesIO(base64.b64decode(value['content'])))
        except UnidentifiedImageError as err:
            raise serializers.ValidationError(self.error_msg) from err


class ImageBaseSizeValidator(ImageOpenValidator):
    """
    Validates image size
    To use this class for validating image width/height, rewrite
    self.orientation to ('height',) or ('width',) or ('height', 'width')

    Raises rest_framework.exceptions.ValidationError: if not(min <= (height or width) <= max)
    """
    orientation: _t.Union[_t.Union[_t.Tuple[str], _t.Tuple[str, str]], _t.Tuple] = ()

    def __call__(self, value):
        if not self.has_pillow:
            warnings.warn(self.warning_msg, ImportWarning)
            return
        super().__call__(value)
        self.validate()

    def validate(self):
        for orientation in self.orientation:
            min_value = getattr(self, f'min_{orientation}', 1)
            max_value = getattr(self, f'max_{orientation}', float('inf'))
            value = getattr(self.img, orientation)
            if not (min_value <= value <= max_value):
                raise serializers.ValidationError(f'Invalid image {orientation}. Expected from {min_value}'
                                                  f' to {max_value}, got {value}')


class ImageHeightValidator(ImageBaseSizeValidator):
    """
    Wrapper for ImageBaseSizeValidator that validates only height

    :param min_height: minimal height of an image being validated
    :param max_height: maximal height of an image being validated
    """
    orientation = ('height',)


class ImageWidthValidator(ImageBaseSizeValidator):
    """
    Wrapper for ImageBaseSizeValidator that validates only width

    :param min_width: minimal width of an image being validated
    :param max_width: maximal width of an image being validated
    """
    orientation = ('width',)


class ImageResolutionValidator(ImageBaseSizeValidator):
    """
    Wrapper for ImageBaseSizeValidator that validates both height and width

    :param min_height: minimal height of an image being validated
    :param max_height: maximal height of an image being validated
    :param min_width: minimal width of an image being validated
    :param max_width: maximal width of an image being validated
    """
    orientation = ('height', 'width')
