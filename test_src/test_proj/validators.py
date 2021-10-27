from vstutils.api.validators import ImageResolutionValidator, ImageHeightValidator, ImageWidthValidator

image_res_validator = ImageResolutionValidator(
    extensions=['jpg'],
    max_height=600,
    max_width=600,
    min_height=200,
    min_width=200,
)

image_res_max_validator = ImageResolutionValidator(
    extensions=['jpg', 'jpeg', 'png'],
    max_width=400,
    max_height=800,
)
image_height_validator = ImageHeightValidator(
    min_height=201,
    max_height=550,
)

image_width_validator = ImageWidthValidator(
    min_width=202,
    max_width=549,
)

invalid_image_validator_resizer = ImageResolutionValidator(
    max_height=600,
    max_width=600,
    min_height=200,
    min_width=200,
)

valid_image_validator_resizer = ImageResolutionValidator(
    max_height=1000,
    max_width=1400,
    min_height=600,
    min_width=1000,
)

image_validator_resizer_with_margin = ImageResolutionValidator(
    max_height=600,
    max_width=600,
    min_height=600,
    min_width=600,
)