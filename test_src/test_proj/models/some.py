from django_filters import CharFilter
from django.db import models

from vstutils.api.fields import RelatedListField
from vstutils.models import BModel
from vstutils.api import fields, filter_backends
from vstutils.models.fields import (
    NamedBinaryFileInJSONField,
    NamedBinaryImageInJSONField,
    MultipleNamedBinaryFileInJSONField,
    MultipleNamedBinaryImageInJSONField,
    FkModelField, MultipleFileField, MultipleImageField
)
from .hosts import Host
from ..validators import image_res_validator


def bin_file_handler(self, instance, fields_mapping, model, field_name):
    instance[field_name] = 'bin file handled'


class EmptyFilterBackend(filter_backends.VSTFilterBackend):
    def filter_queryset(self, request, queryset, view):
        return queryset


class ModelWithFK(BModel):
    some_fk = models.ForeignKey('test_proj.Host', on_delete=models.CASCADE,
                                null=True, default=None, blank=True)
    no_prefetch_and_link_fk = models.ForeignKey('test_proj.Host', related_name='ModelWithFK2', on_delete=models.CASCADE,
                                                null=True, default=None, blank=True)
    multiselect = models.TextField(null=True, default=None, blank=True)
    fk_with_filters = models.ForeignKey('test_proj.Post', on_delete=models.CASCADE, null=True)

    class Meta:
        _detail_fields = (
            'some_fk',
            'no_prefetch_and_link_fk',
            'multiselect',
            'fk_with_filters'
        )
        _override_list_fields = {
            'some_fk': fields.FkModelField(select=Host)
        }
        _override_detail_fields = {
            'some_fk': fields.FkModelField(select=Host),
            'no_prefetch_and_link_fk': fields.FkModelField(select=Host.generated_view.serializer_class,
                                                           use_prefetch=False, make_link=False, required=False),
            'multiselect': fields.CommaMultiSelect(select='test_proj.Host', required=False),
            'fk_with_filters': fields.FkModelField(select='test_proj.Post', filters={'rating': 5}, required=False, allow_null=True)
        }


class ModelWithBinaryFiles(BModel):
    some_binfile = models.TextField(default='')
    some_namedbinfile = NamedBinaryFileInJSONField(default='')
    some_namedbinimage = NamedBinaryImageInJSONField(default='')
    some_validatednamedbinimage = NamedBinaryImageInJSONField(default='')
    some_multiplenamedbinfile = MultipleNamedBinaryFileInJSONField(default='')
    some_multiplenamedbinimage = MultipleNamedBinaryImageInJSONField(default='')
    some_validatedmultiplenamedbinimage = MultipleNamedBinaryImageInJSONField(default='')
    some_filefield = models.FileField(null=True, blank=True)
    some_imagefield = models.ImageField(null=True, blank=True)
    some_FkModelfield = FkModelField('test_proj.Author', null=True, blank=True, on_delete=models.CASCADE)
    some_multiplefile = MultipleFileField(blank=True)
    some_multipleimage = MultipleImageField(blank=True,  default='')
    related_model = models.ManyToManyField('ModelForCheckFileAndImageField', related_name='rel_models')
    some_multiplefile_none = MultipleFileField(blank=True, default=None, null=True)

    class Meta:
        _view_field_name = 'some_namedbinfile'
        default_related_name = 'rel_model'
        _override_list_fields = dict(
            some_binfile=fields.BinFileInStringField(required=False),
            some_validatednamedbinimage=fields.NamedBinaryImageInJsonField(
                required=False,
                validators=[image_res_validator]
            ),
            some_validatedmultiplenamedbinimage=fields.MultipleNamedBinaryImageInJsonField(
                required=False,
                validators=[image_res_validator]
            ),
        )
        _filterset_fields = {
            'some_binfile': CharFilter(label='Some label for binfile')
        }


class ModelForCheckFileAndImageField(BModel):
    some_image_field = models.ImageField(default='')
    some_file_field = models.FileField(default='')
    some_multiple_image_field = MultipleImageField(default='')
    some_multiple_file_field = MultipleFileField(default='')
    some_json_field = models.JSONField()

    class Meta:
        _list_fields = [
            'some_image_field',
            'some_file_field',
            'some_multiple_image_field',
            'some_multiple_file_field',
            'some_json_field',
        ]
        _detail_fields = [
            'some_related_field',
        ]
        _override_detail_fields = {
            'some_related_field': RelatedListField(
                related_name='rel_models',
                fields=[
                    'some_binfile',
                    'some_namedbinfile',
                    'some_namedbinimage',
                    'some_multiplenamedbinfile',
                    'some_multiplenamedbinimage',
                    'some_filefield',
                    'some_imagefield',
                    'some_multiplefile',
                    'some_multipleimage',
                    'some_FkModelfield__image',
                ],
                fields_custom_handlers={
                    'some_binfile': bin_file_handler
                }
            )
        }


class OverridenModelWithBinaryFiles(ModelWithBinaryFiles):

    class Meta:
        proxy = True
        _view_field_name = 'some_namedbinfile'
        _override_list_fields = dict(
            some_binfile=fields.BinFileInStringField(required=False),
            some_namedbinfile=fields.NamedBinaryFileInJsonField(required=False),
            some_validatednamedbinimage=fields.NamedBinaryImageInJsonField
            (
                required=False,
                validators=[image_res_validator]
            ),
            some_namedbinimage=fields.NamedBinaryImageInJsonField(required=False),
            some_multiplenamedbinfile=fields.MultipleNamedBinaryFileInJsonField(required=False),
            some_multiplenamedbinimage=fields.MultipleNamedBinaryImageInJsonField(required=False),
            some_validatedmultiplenamedbinimage=fields.MultipleNamedBinaryImageInJsonField
            (
                required=False,
                validators=[image_res_validator]
            ),
            some_filefield=fields.NamedBinaryFileInJsonField(required=False, file=True, allow_null=True),
            some_imagefield=fields.NamedBinaryImageInJsonField(required=False, file=True, allow_null=True)
        )
        _filterset_fields = {
            'some_binfile': CharFilter(label='Some label for binfile')
        }


class DeepNestedModel(BModel):
    name = models.CharField(max_length=10)
    parent = models.ForeignKey('self', null=True, default=None, on_delete=models.CASCADE)

    deep_parent_field = 'parent'
    deep_parent_allow_append = True

    class Meta:
        default_related_name = 'deepnested'
        _detail_fields = _list_fields = ('id', 'name', 'parent')
        _filter_backends = (EmptyFilterBackend,)


class ReadonlyDeepNestedModel(BModel):
    name = models.CharField(max_length=10)
    parent = models.ForeignKey('self', null=True, default=None, on_delete=models.CASCADE)

    deep_parent_field = 'parent'

    class Meta:
        default_related_name = 'readonly_deepnested'
        _filter_backends = (EmptyFilterBackend,)
        _view_class = 'read_only'
        _list_fields = ('name', 'parent')
        _detail_fields = '__all__'
