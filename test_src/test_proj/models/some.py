import uuid
from io import BytesIO
from PIL import Image
from django_filters import CharFilter
from django.db import models
from rest_framework.fields import FileField

from vstutils.api.base import EtagDependency
from vstutils.api.fields import RelatedListField, RedirectIntegerField
from vstutils.api.responses import HTTP_200_OK
from vstutils.api.serializers import BaseSerializer, VSTSerializer
from vstutils.api import fields, filter_backends, validators as vst_validators
from vstutils.models import BModel, register_view_action, LAZY_MODEL
from vstutils.models.fields import (
    NamedBinaryFileInJSONField,
    NamedBinaryImageInJSONField,
    MultipleNamedBinaryFileInJSONField,
    MultipleNamedBinaryImageInJSONField,
    FkModelField, MultipleFileField, MultipleImageField,
)
from .hosts import Host
from ..validators import (
    image_res_validator, image_res_max_validator, image_height_validator,
    image_width_validator, invalid_image_validator_resizer, valid_image_validator_resizer,
    image_validator_resizer_with_margin
)

files_validators = [vst_validators.FileMediaTypeValidator(extensions=('txt', 'slk', 'application/json'))]
validators = [image_res_validator, image_res_max_validator, image_height_validator, image_width_validator]


def bin_file_handler(self, instance, fields_mapping, model, field_name):
    instance[field_name] = 'bin file handled'


def pre_handler(binary_data, original_data):
    with Image.open(BytesIO(binary_data)) as img:
        assert img.mode == 'RGB'
        assert original_data['name'] == '1280_720_png.png' and \
               img.size == tuple(map(int, original_data['name'].split('_')[:2]))
        original_data['name'] = '1280_720.png'
        return binary_data


class EmptyFilterBackend(filter_backends.VSTFilterBackend):
    def filter_queryset(self, request, queryset, view):
        return queryset


class FieldsTestingSerializer(BaseSerializer):
    hosts_id = RedirectIntegerField(read_only=True)


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
        _hidden = True


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
        _list_fields = (
            'some_binfile',
            'some_namedbinfile',
            'some_namedbinimage',
            'some_validatednamedbinimage',
            'some_multiplenamedbinfile',
            'some_multiplenamedbinimage',
            'some_validatedmultiplenamedbinimage',
            'some_filefield',
            'some_imagefield',
            'some_FkModelfield',
            'some_multiplefile',
            'some_multipleimage',
            'some_multiplefile_none',
            'some_imagefield_qr_code_url',
            'some_barcode128',
        )
        _override_list_fields = dict(
            some_binfile=fields.BinFileInStringField(required=False, max_length=2*1024*1024, min_length=1),
            some_validatednamedbinimage=fields.NamedBinaryImageInJsonField(required=False, validators=validators),
            some_validatedmultiplenamedbinimage=fields.MultipleNamedBinaryImageInJsonField(
                required=False,
                validators=validators,
            ),
            some_imagefield_qr_code_url=fields.QrCodeField(read_only=True, child=FileField(use_url=True), source='some_imagefield'),
            some_barcode128=fields.Barcode128Field(source='some_imagefield', required=False),
        )
        _filterset_fields = {
            'some_binfile': CharFilter(label='Some label for binfile')
        }


class ModelForCheckFileAndImageField(BModel):
    _cache_responses = True
    _cache_related_labels = (ModelWithBinaryFiles._meta.label,)
    _cache_response_dependencies = EtagDependency.LANG | EtagDependency.SESSION

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
            ),
        }


class OverridenModelWithBinaryFiles(ModelWithBinaryFiles):

    class Meta:
        proxy = True
        _view_field_name = 'some_namedbinfile'
        _override_list_fields = dict(
            some_binfile=fields.BinFileInStringField(required=False, max_length=2*1024*1024, min_length=1),
            some_namedbinfile=fields.NamedBinaryFileInJsonField(required=False, validators=files_validators),
            some_validatednamedbinimage=fields.NamedBinaryImageInJsonField(required=False, validators=validators),
            some_namedbinimage=fields.NamedBinaryImageInJsonField(required=False, background_fill_color='pink'),
            some_multiplenamedbinfile=fields.MultipleNamedBinaryFileInJsonField(required=False),
            some_multiplenamedbinimage=fields.MultipleNamedBinaryImageInJsonField(required=False, background_fill_color='white'),
            some_validatedmultiplenamedbinimage=fields.MultipleNamedBinaryImageInJsonField(
                required=False,
                validators=validators,
            ),
            some_filefield=fields.NamedBinaryFileInJsonField(required=False, file=True, allow_null=True, max_length=100, max_content_size=10000),
            some_imagefield=fields.NamedBinaryImageInJsonField(required=False, file=True, allow_null=True, max_length=100, min_content_size=7000),
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

    @register_view_action(detail=True, serializer_class=FieldsTestingSerializer)
    def test_action(self: 'vstutils.api.base.GenericViewSet', request, *args, **kwargs):
        return HTTP_200_OK(self.create_action_serializer(data=request.data).data)


class ReadonlyDeepNestedSerializer(VSTSerializer):
    class Meta:
        model = LAZY_MODEL
        fields = (
            'id',
            'name',
            'parent',
        )


class ReadonlyDeepNestedModel(BModel):
    name = models.CharField(max_length=10)
    parent = models.ForeignKey('self', null=True, default=None, on_delete=models.CASCADE)

    deep_parent_field = 'parent'

    class Meta:
        default_related_name = 'readonly_deepnested'
        _filter_backends = (EmptyFilterBackend,)
        _extra_serializer_classes = {
            'serializer_class_list': ReadonlyDeepNestedSerializer,
        }
        _view_class = 'read_only'
        _list_fields = ('name', 'parent')
        _detail_fields = '__all__'


class SomethingWithImage(BModel):
    name = models.CharField(max_length=100)
    validimage = NamedBinaryImageInJSONField(default='')
    invalidimage = NamedBinaryImageInJSONField(default='')
    imagewithmarginapplying = NamedBinaryImageInJSONField(default='')
    class Meta:
        _list_fields = [
            'id',
            'name',
        ]
        _detail_fields = [
            'id',
            'name',
            'validimage',
            'invalidimage',
            'imagewithmarginapplying',
        ]
        _override_detail_fields = {
            'validimage': fields.NamedBinaryImageInJsonField(
                required=False,
                validators=[valid_image_validator_resizer],
                pre_handlers=(pre_handler,),
            ),
            'invalidimage': fields.NamedBinaryImageInJsonField(
                required=False,
                validators=[invalid_image_validator_resizer],
            ),
            'imagewithmarginapplying': fields.NamedBinaryImageInJsonField(
                required=False,
                validators=[image_validator_resizer_with_margin],
            ),
        }


class ModelWithUuid(BModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid1)
    data = models.CharField(max_length=256)

    class Meta:
        default_related_name = 'model_with_uuid'
