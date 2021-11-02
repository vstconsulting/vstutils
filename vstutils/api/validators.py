import base64
import typing as _t
import re
import warnings
from io import BytesIO
from mimetypes import guess_type

from rest_framework import serializers
from vstutils.utils import raise_context, translate

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
        return translate('This field must match pattern ') + f'{self._regexp.pattern}'


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
        self.extensions = tuple(sorted(  # type: ignore
            filter(
                bool,
                {
                    guess_type(f'name.{e}')[0]
                    for e in extensions
                }
            )
        ))
        for key, value in kwargs.items():
            setattr(self, key, value)

    def __call__(self, value):
        if not self.has_pillow:
            warnings.warn(self.warning_msg, ImportWarning)
            return
        file_media_type = guess_type(value['name'])[0]
        if value and self.extensions and file_media_type not in self.extensions:
            raise serializers.ValidationError(
                translate('Unsupported image file format') +
                f' "{value["name"]}" ({file_media_type or ""}) ' +
                translate('is not in listed supported types') +
                f' ({",".join(self.extensions)}).'
            )
        self.media_type = file_media_type.split(sep='/')[1].upper()

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
    error_msg = 'For some reason, this image file cannot be opened'

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

    requires_context = True

    def __call__(self, value, serializer_field=None):
        if not self.has_pillow:
            warnings.warn(self.warning_msg, ImportWarning)
            return
        super().__call__(value)
        should_resize_image = False
        with raise_context():
            should_resize_image = serializer_field.context['request'].headers.get('Auto-Resize-Image', None) == 'true'
        self.validate(value, should_resize_image)

    def validate(self, img_data, should_resize_image):
        limits = {}
        size = {}
        for orientation in self.orientation:
            min_value = getattr(self, f'min_{orientation}', 1)
            max_value = getattr(self, f'max_{orientation}', float('inf'))
            value = getattr(self.img, orientation)
            limits[orientation] = {'min': min_value, 'max': max_value}
            size[orientation] = value

        broken_orientations = self.find_broken_orientation(size, limits)
        if broken_orientations:
            if should_resize_image:
                self.auto_resize_image(img_data, size, limits)
            else:
                raise serializers.ValidationError([
                    'Invalid image size orientations', ': ',
                    *';, '.join(broken_orientations).split(';'),
                    '. ',
                    'Current image size', ': ',
                    'x'.join([str(size[x]) for x in broken_orientations]),
                ])

    def auto_resize_image(self, img_data, size, limits):
        buffered = BytesIO()
        self.get_resized_image(size, limits).save(buffered, format=self.media_type)
        img_data['content'] = base64.b64encode(buffered.getvalue()).decode('utf-8')

    def get_resized_image(self, size, limits):
        best_size = size
        # satisfying min limits
        for orient, orient_limits in limits.items():
            if orient_limits['min'] <= best_size[orient]:
                continue
            ratio = orient_limits['min'] / best_size[orient]
            best_size = {
                side: side_size * ratio
                for side, side_size in best_size.items()
            }
        # then satisfying max limits
        for orient, orient_limits in limits.items():
            if orient_limits['max'] > best_size[orient]:
                continue
            ratio = orient_limits['max'] / best_size[orient]
            best_size = {
                side: side_size * ratio
                for side, side_size in best_size.items()
            }
        # applying our new size
        best_size = {
            side: int(side_size)
            for side, side_size in best_size.items()
        }
        resized_img = self.img.resize((best_size['width'], best_size['height']), Image.ANTIALIAS)
        broken_orientation = self.find_broken_orientation(best_size, limits)
        if not broken_orientation:
            return resized_img
        broken_orientation = broken_orientation[0]
        # add margin to image if its needed
        summary_margins_size = limits[broken_orientation]['min'] - best_size[broken_orientation]
        basic_margin_size = int(summary_margins_size / 2)
        margin = {'left': 0, 'top': 0, 'right': 0, 'bottom': 0}
        if broken_orientation == "width":
            margin['left'] = basic_margin_size
            margin['right'] = summary_margins_size - basic_margin_size
        else:
            margin['top'] = basic_margin_size
            margin['bottom'] = summary_margins_size - basic_margin_size
        margined_image = Image.new(
            resized_img.mode,
            (resized_img.size[0] + margin['left'] + margin['right'],
             resized_img.size[1] + margin['top'] + margin['bottom']),
            (255, 255, 255)
        )
        margined_image.paste(resized_img, (margin['left'], margin['top']))
        return margined_image

    @staticmethod
    def find_broken_orientation(size, limits) -> _t.Tuple:
        return tuple(
            str(orient)
            for orient, orient_limits in limits.items()
            if not (orient_limits['min'] <= size[orient] <= orient_limits['max'])
        )


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
