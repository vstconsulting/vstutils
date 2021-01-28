from vstutils.api.validators import ImageResolutionValidator

image_res_validator = ImageResolutionValidator(
    extensions=['jpg'],
    max_height=600,
    max_width=600,
    min_height=200,
    min_width=200,
)
