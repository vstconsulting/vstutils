from django.db.models import TextField, ForeignKey

"""
These model fields used in :`class:vstutils.api.serializers.VstSerializer`
to form model_field_class: serializer_field_class mapping
"""


class NamedBinaryFileInJSONField(TextField):
    """
    Extends :class:`django.db.models.TextField`. Use this field in :class:`vstutils.models.BModel` to get
    `vstutils.api.NamedBinaryFileInJSONField` in serializer.
    """


class NamedBinaryImageInJSONField(TextField):
    """
    Extends :class:`django.db.models.TextField`. Use this field in :class:`vstutils.models.BModel` to get
    `vstutils.api.NamedBinaryImageInJSONField` in serializer.
    """


class MultipleNamedBinaryFileInJSONField(TextField):
    """
    Extends :class:`django.db.models.TextField`. Use this field in :class:`vstutils.models.BModel` to get
    `vstutils.api.MultipleNamedBinaryFileInJSONField` in serializer.
    """


class MultipleNamedBinaryImageInJSONField(TextField):
    """
    Extends :class:`django.db.models.TextField`. Use this field in :class:`vstutils.models.BModel` to get
    `vstutils.api.MultipleNamedBinaryImageInJSONField in serializer`.
    """


class FkModelField(ForeignKey):
    """
    Extends :class:`django.db.models.ForeignKey`. Use this field in :class:`vstutils.models.BModel` to get
    `vstutils.api.FkModelField in serializer`. To set Foreign Key relation set `to` argument to string path to model
    or to Model Class as in :class:`django.db.models.ForeignKey`
    """
