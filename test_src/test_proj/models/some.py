from django_filters import CharFilter
from django.db import models
from vstutils.models import BModel
from vstutils.api import fields
from .hosts import Host
from ..validators import image_res_validator


class ModelWithFK(BModel):
    some_fk = models.ForeignKey('test_proj.Host', on_delete=models.CASCADE,
                                null=True, default=None, blank=True)
    no_prefetch_and_link_fk = models.ForeignKey('test_proj.Host', related_name='ModelWithFK2', on_delete=models.CASCADE,
                                                null=True, default=None, blank=True)
    multiselect = models.TextField(null=True, default=None, blank=True)

    class Meta:
        _detail_fields = (
            'some_fk',
            'no_prefetch_and_link_fk',
            'multiselect'
        )
        _override_list_fields = {
            'some_fk': fields.FkModelField(select=Host)
        }
        _override_detail_fields = {
            'some_fk': fields.FkModelField(select=Host),
            'no_prefetch_and_link_fk': fields.FkModelField(select=Host.generated_view.serializer_class,
                                                           use_prefetch=False, make_link=False, required=False),
            'multiselect': fields.CommaMultiSelect(select='test_proj.Host', required=False)
        }


class ModelWithBinaryFiles(BModel):
    some_binfile = models.TextField(default='')
    some_namedbinfile = models.TextField(default='')
    some_namedbinimage = models.TextField(default='')
    some_validatednamedbinimage = models.TextField(default='')
    some_multiplenamedbinfile = models.TextField(default='')
    some_multiplenamedbinimage = models.TextField(default='')
    some_validatedmultiplenamedbinimage = models.TextField(default='')

    class Meta:
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
            )
        )
        _filterset_fields = {
            'some_binfile': CharFilter(label='Some label for binfile')
        }
