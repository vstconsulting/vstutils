import datetime
import os
from django.db import models
from django_filters import ChoiceFilter
from rest_framework import permissions, fields as drf_fields
from vstutils.api.serializers import BaseSerializer, DataSerializer
from vstutils.models.decorators import register_view_action
from vstutils.custom_model import ListModel, FileModel
from vstutils.api import fields, base, responses


class TestQuerySerializer(BaseSerializer):
    test_value = drf_fields.ChoiceField(required=True, choices=("TEST1", "TEST2"))


class FileViewMixin(base.FileResponseRetrieveMixin):
    # required always
    instance_field_data = 'value'
    # required for response caching in browser
    instance_field_timestamp = 'updated'
    # this is not required, but allow to understand file response mime type in schema
    produces_for_retrieve = ['application/octet-stream', 'application/pdf']
    # search this field in instance for response filename
    # instance_field_filename = 'filename'  # as default
    # headers for response caching (default works with user auth)
    # cache_control_header_data = 'private, no-cache'
    #
    # WARNING:
    # DO NOT OVERRIDE `serializer_class_retrieve` if you do not know what you do.


class File(FileModel):
    file_path = os.path.dirname(__file__) + '/../custom_model.yaml'
    name = models.CharField(max_length=1024)
    for_order1 = models.IntegerField()
    for_order2 = models.IntegerField()
    origin_pos = models.IntegerField(primary_key=True)

    class Meta:
        _view_class = 'read_only'
        _override_list_fields = {
            'name': fields.CommaMultiSelect(select='HostGroup')
        }
        _filterset_fields = (
            'name',
            'for_order1',
            'for_order2',
            'origin_pos',
        )
        _permission_classes = [permissions.AllowAny]
        _override_permission_classes = True

    @classmethod
    def __prepare_model__(cls):
        pass

    @register_view_action(
        methods=['get'],
        detail=False,
        query_serializer=TestQuerySerializer,
        serializer_class=DataSerializer,
        suffix='Instance'
    )
    def query_serializer_test(self, request):
        query_validated_data = self.get_query_serialized_data(request)
        return responses.HTTP_200_OK(query_validated_data)

    @register_view_action(
        methods=['get'],
        detail=False,
        query_serializer=TestQuerySerializer,
        is_list=True
    )
    def query_serializer_test_list(self, request):
        return self.list(request)


class List(ListModel):
    data = [
        dict(value=f'Some data {i}')
        for i in range(100)
    ]
    value = models.TextField()


class ListOfFiles(ListModel):
    data = [
        {'id': i, 'value': 'File data', 'updated': datetime.datetime(2021, 3, 1, 16, 15, 51, 801564), 'test': 1}
        for i in range(1)
    ]
    id = models.IntegerField(primary_key=True)
    value = models.TextField()
    test = models.CharField(choices=tuple((i, i) for i in range(3)), max_length=3)
    updated = models.DateTimeField()

    class Meta:
        _view_class = (FileViewMixin, 'read_only')
        _list_fields = _detail_fields = ('id', 'filename', 'test',)
        _permission_classes = [permissions.AllowAny]
        _override_permission_classes = True
        _filterset_fields = {
            'id': None,
            'test': None,
        }

    @property
    def filename(self):
        return f"File_{self.id}.txt"
