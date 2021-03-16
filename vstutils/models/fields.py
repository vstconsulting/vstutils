from django.db.models import TextField, ForeignKey

"""
These model fields used in :`class:vstutils.api.serializers.VstSerializer`
to form model_field_class: serializer_field_class mapping
"""


class NamedBinaryFileInJSONField(TextField):
    pass


class NamedBinaryImageInJSONField(TextField):
    pass


class MultipleNamedBinaryFileInJSONField(TextField):
    pass


class MultipleNamedBinaryImageInJSONField(TextField):
    pass


class FkModelField(ForeignKey):
    pass
