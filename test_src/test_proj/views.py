import time
import json

from vstutils.api import fields, filters, responses
from vstutils.api.base import (CopyMixin, ModelViewSet, NonModelsViewSet,
                               ReadOnlyModelViewSet, Response)
from vstutils.api.decorators import action, nested_view, subaction
from vstutils.api.serializers import EmptySerializer, VSTSerializer, DataSerializer

from .models import (
    File,
    Host,
    HostGroup,
    ModelWithBinaryFiles,
    ModelWithFK,
    VarBasedModel,
    Variable
)


class TestFilterBackend:
    required = True

    def filter_queryset(self, request, queryset, view):
        return queryset

    def get_schema_fields(self, view):
        return []


class HostFilter(filters.DefaultIDFilter):
    class Meta:
        model = Host
        fields = (
            'id',
            'name',
        )


class HostGroupFilter(filters.DefaultIDFilter):
    class Meta:
        model = HostGroup
        fields = (
            'id',
        )


class FileSerializer(VSTSerializer):
    name = fields.CommaMultiSelect(select='HostGroup')

    class Meta:
        model = File
        fields = (
            'name',
            'for_order1',
            'for_order2',
            'origin_pos',
        )


class FileFilter(filters.filters.FilterSet):
    class Meta:
        model = File
        fields = (
            'name',
            'for_order1',
            'for_order2',
            'origin_pos',
        )


class HostSerializer(VSTSerializer):
    id = fields.RedirectIntegerField(read_only=True)
    name = fields.DependEnumField(field='id', choices={3: 'hello', 1: 'NOO!'})

    class Meta:
        model = Host
        fields = (
            'id',
            'name',
        )


class CreateHostSerializer(HostSerializer):
    name = fields.CharField(required=True)


class HostGroupSerializer(VSTSerializer):
    name = fields.AutoCompletionField(autocomplete=['Some', 'Another'])
    parent = fields.AutoCompletionField(autocomplete='Host', required=False)
    secret_file = fields.SecretFileInString(read_only=True)
    file = fields.FileInStringField(read_only=True)

    class Meta:
        model = HostGroup
        fields = (
            'id',
            'name',
            'parent',
            'file',
            'secret_file',
        )


class HostViewSet(ModelViewSet):
    '''
    Hosts view
    '''
    model = Host
    serializer_class = HostSerializer
    action_serializers = {
        'create': CreateHostSerializer
    }
    filterset_class = HostFilter
    filter_backends = list(ModelViewSet.filter_backends) + [TestFilterBackend]

    @subaction(
        response_code=200, response_serializer=EmptySerializer, detail=True,
        description='Some desc'
    )
    def test(self, request, *args, **kwargs):
        return responses.HTTP_200_OK('OK')

    @subaction(detail=True, serializer_class=HostSerializer)
    def test2(self, request, *args, **kwargs):
        self.get_object()
        return Response("OK", 201).resp

    @subaction(detail=True, serializer_class=HostSerializer)
    def test3(self, request, *args, **kwargs):
        return Response("OK", 201).resp  # nocv


class _HostGroupViewSet(ModelViewSet):
    '''
    Host group opertaions.
    '''
    model = HostGroup
    serializer_class = HostGroupSerializer
    serializer_class_one = HostGroupSerializer
    filterset_class = HostGroupFilter


def queryset_nested_filter(parent, qs):
    return qs


@nested_view('subgroups', 'id', view=_HostGroupViewSet, subs=None)
@nested_view('hosts', 'id', view=HostViewSet)
@nested_view('subhosts', methods=["get"], manager_name='hosts', view=HostViewSet)
@nested_view(
    'shost', 'id',
    manager_name=lambda o: getattr(o, 'hosts'), subs=['test', 'test2'],
    view=HostViewSet, allow_append=True,
    queryset_filters=[queryset_nested_filter]
)
@nested_view(
    'shost_all', 'id',
    manager_name='hosts', subs=None,
    view=HostViewSet, methods=['get']
)
class HostGroupViewSet(_HostGroupViewSet, CopyMixin):
    serializer_class_one = HostGroupSerializer
    copy_related = ['hosts', 'subgroups']


@nested_view('subdeephosts', 'id', view=HostGroupViewSet, serializer_class_one=HostGroupSerializer)
class _DeepHostGroupViewSet(_HostGroupViewSet, CopyMixin):

    def get_manager_subdeephosts(self, parent):
        return getattr(parent, 'subgroups')


@nested_view('subsubhosts', 'id', manager_name='subgroups', view=_DeepHostGroupViewSet)
class DeepHostGroupViewSet(_DeepHostGroupViewSet):
    pass


try:
    @nested_view('subgroups', 'id')
    class ErrorView(_HostGroupViewSet):  # nocv
        pass
except nested_view.NoView:
    pass


try:
    class ErrorView(_HostGroupViewSet):
        @subaction(response_code=200, detail=True)
        def test_err(self, request, *args, **kwargs):  # nocv
            return Response("OK", 200).resp
except AssertionError:
    pass


class FilesViewSet(ReadOnlyModelViewSet):
    model = File
    serializer_class = FileSerializer
    filterset_class = FileFilter


class ModelWithFKSerializer(VSTSerializer):
    some_fk = fields.FkModelField(select=HostSerializer)

    class Meta:
        model = ModelWithFK
        fields = (
            'id',
            'some_fk'
        )


class TestFkViewSet(ModelViewSet):
    model = ModelWithFK
    serializer_class = ModelWithFKSerializer


class ModelWithBinaryFilesSerializer(VSTSerializer):
    some_binfile = fields.BinFileInStringField(required=False)
    some_namedbinfile = fields.NamedBinaryFileInJsonField(required=False)
    some_namedbinimage = fields.NamedBinaryImageInJsonField(required=False)
    some_multiplenamedbinfile = fields.MultipleNamedBinaryFileInJsonField(required=False)
    some_multiplenamedbinimage = fields.MultipleNamedBinaryImageInJsonField(required=False)

    class Meta:
        model = ModelWithBinaryFiles
        fields = (
            'id',
            'some_binfile',
            'some_namedbinfile',
            'some_namedbinimage',
            'some_multiplenamedbinfile',
            'some_multiplenamedbinimage',
        )


class TestBinaryFilesViewSet(ModelViewSet):
    model = ModelWithBinaryFiles
    serializer_class = ModelWithBinaryFilesSerializer

    @action(methods=['get'], detail=True)
    def test_nested_view_inspection(self, *args, **kwargs):
        raise Exception  # nocv

    test_nested_view_inspection._nested_view = None
    test_nested_view_inspection._nested_name = ''


class RequestInfoTestView(NonModelsViewSet):
    base_name = 'request_info'

    def list(self, request):
        start_time = time.time()
        headers = request._request.META
        # Don't send wsgi.* headers
        headers = {k: v for k, v in headers.items() if not k.startswith('wsgi.')}
        serializer = DataSerializer(data=json.dumps(
            dict(
                headers=headers,
                query=request.query_params,
                user_id=request.user.id
            )
        ))
        serializer.is_valid(raise_exception=True)
        return responses.HTTP_200_OK(
            serializer.data,
            timings=dict(
                req=(i for i in ['test case', time.time() - start_time]),
                miss=None
            )
        )

    def put(self, request):
        data = request.data

        return responses.HTTP_200_OK(data)


class VariableSerializer(VSTSerializer):

    class Meta:
        model = Variable
        fields = (
            'id',
            'value',
        )


class VarBasedSerializer(VSTSerializer):

    class Meta:
        model = VarBasedModel
        fields = (
            'id',
            'name',
        )


class VariablesViewSet(ModelViewSet):
    model = Variable
    serializer_class = VariableSerializer


@nested_view('vars', 'id', manager_name='variables', allow_append=False, view=VariablesViewSet)
class VarBasedViewSet(ModelViewSet):
    model = VarBasedModel
    serializer_class = VarBasedSerializer
