import base64
import typing as _t
import re
import warnings
from io import BytesIO
from mimetypes import guess_type

from django.conf import settings
from rest_framework import serializers
from vstutils.utils import raise_context, translate

try:
    from PIL import Image, UnidentifiedImageError

    has_pillow = True
except ImportError:  # nocv
    has_pillow = False


def get_orientations_with_comma(*args):
    for arg in '.,;'.join(args).split(';'):
        yield from arg.split('.')


def apply_ratio(apply_to, ratio=1, rounded=False):
    return {
        side: rounded and round(side_size * ratio) or side_size * ratio
        for side, side_size in apply_to.items()
    }


def find_broken_orientation(size, limits) -> _t.Tuple:
    return tuple(
        str(orient)
        for orient, orient_limits in limits.items()
        if not (orient_limits['min'] <= size[orient] <= orient_limits['max'])
    )


def resize_image_from_to(img, limits):
    """
    Utility function to resize image proportional to values between min and max values for each side.
    Can create white margins if it's needed to satisfy restrictions

    :param img: Pillow Image object
    :type img: PIL.Image
    :param limits: Dict with min/max side restrictions like:
                   ``{'width': {'min': 300, 'max: 600'}, 'height':  {'min': 400, 'max: 800'}}``
    :type limits: dict
    :return: Pillow Image object
    :rtype: PIL.Image
    """
    size = {'width': img.size[0], 'height': img.size[1]}
    limits_list = [{'orient': k, **v} for k, v in limits.items()]

    best_size = apply_ratio(
        size,
        ratio=limits_list[0]['max'] / size[limits_list[0]['orient']]
    )
    # decrease next side if needed
    if len(limits_list) == 2:
        ratio = limits_list[1]['max'] / best_size[limits_list[1]['orient']]
        if ratio <= 1:
            best_size = apply_ratio(best_size, ratio=ratio)

    best_size = apply_ratio(best_size, rounded=True)

    resized_image = img.resize((best_size['width'], best_size['height']), Image.NEAREST)
    broken_orientation = next(iter(find_broken_orientation(best_size, limits)), None)
    if not broken_orientation:
        return resized_image
    # add margin to image
    summary_margin_size = limits[broken_orientation]['min'] - best_size[broken_orientation]
    margin_parts = [int(summary_margin_size / 2), summary_margin_size - int(summary_margin_size / 2)]
    margin_sides = broken_orientation == "width" and ['left', 'right'] or ['top', 'bottom']
    margin = {margin_sides[i]: margin_parts[i] for i in range(2)}
    margined_image = Image.new(
        resized_image.mode,
        (resized_image.size[0] + margin.get('left', 0) + margin.get('right', 0),
         resized_image.size[1] + margin.get('top', 0) + margin.get('bottom', 0)),
        (255, 255, 255)
    )
    margined_image.paste(resized_image, (margin.get('left', 0), margin.get('top', 0)))
    return margined_image


def resize_image(img, width, height):
    """
    Utility function to resize image proportional to specific values.
    Can create white margins if it's needed to satisfy required size

    :param img: Pillow Image object
    :type img: PIL.Image
    :param width: Required width
    :type width: int
    :param height: Required height
    :type height: int
    :return: Pillow Image object
    :rtype: PIL.Image
    """
    return resize_image_from_to(img, {
        'width': {'min': width, 'max': width},
        'height': {'min': height, 'max': height},
    })


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


class FileMediaTypeValidator:
    """
    Base Image Validation class.
    Validates media types.

    :param extensions: Tuple or List of file extensions, that should pass the validation

    Raises rest_framework.exceptions.ValidationError: in case file extension are not in the list
    """

    default_extensions: _t.Union[_t.Tuple, _t.List] = ()

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
                    if not (e and '/' in e and len(e.split('/')) == 2) else
                    e
                    for e in extensions
                }
            )
        ))
        for key, value in kwargs.items():
            setattr(self, key, value)

    def __call__(self, value):
        file_media_type = guess_type(value['name'])[0]
        if value and self.extensions and file_media_type not in self.extensions:
            raise serializers.ValidationError(
                translate('Unsupported image file format') +
                f' "{value["name"]}" ({file_media_type or ""}) ' +
                translate('is not in listed supported types') +
                f' ({",".join(self.extensions)}).'
            )
        self.media_type = file_media_type.split(sep='/')[1].upper()


class ImageValidator(FileMediaTypeValidator):
    """
        Base Image Validation class
        Validates image format
        Won't work if Pillow isn't installed
        Base Image Validation class.
        Validates media types.

        :param extensions: Tuple or List of file extensions, that should pass the validation

        Raises rest_framework.exceptions.ValidationError: in case file extension are not in the list
        """

    warning_msg = 'Warning! Pillow is not installed, validation has not been done'
    default_extensions = [
        'bmp',
        'jpeg',
        'jpg',
        'png',
    ]

    def __call__(self, value):
        if not self.has_pillow:
            warnings.warn(self.warning_msg, ImportWarning)
            return
        super().__call__(value)

    @property
    def has_pillow(self):
        """
        Check if Pillow is installed
        """
        return has_pillow


class ImageOpenValidator(ImageValidator):
    """
    Image validator that checks if image can be unpacked from b64 to PIL Image obj.
    Won't work if Pillow isn't installed.

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

        broken_orientations = find_broken_orientation(size, limits)
        if broken_orientations:
            if should_resize_image and settings.ALLOW_AUTO_IMAGE_RESIZE:
                buffered = BytesIO()
                resize_image_from_to(self.img, limits).save(buffered, format=self.media_type)
                img_data['content'] = base64.b64encode(buffered.getvalue()).decode('utf-8')
            else:
                raise serializers.ValidationError([
                    'Invalid image size orientations', ': ',
                    *tuple(get_orientations_with_comma(*broken_orientations)),
                    '. ',
                    'Current image size', ': ',
                    'x'.join([str(size[x]) for x in broken_orientations]),
                ])


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
