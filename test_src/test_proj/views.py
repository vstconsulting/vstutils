import time
import json

from vstutils.api import responses
from vstutils.api.base import NonModelsViewSet, Response
from vstutils.api.decorators import action, nested_view, subaction
from vstutils.api.serializers import EmptySerializer, DataSerializer

from .models import (
    File,
    Host,
    HostGroup,
    ModelWithBinaryFiles,
    ModelWithFK,
    VarBasedModel
)


class CreateHostSerializer(Host.generated_view.serializer_class):
    pass


class HostViewSet(Host.generated_view):
    '''
    Hosts view
    '''
    action_serializers = {
        'create': CreateHostSerializer
    }

    @subaction(
        response_code=200, response_serializer=EmptySerializer, detail=True,
        description='Some desc'
    )
    def test(self, request, *args, **kwargs):
        return responses.HTTP_200_OK('OK')

    @subaction(detail=True, serializer_class=Host.generated_view.serializer_class)
    def test2(self, request, *args, **kwargs):
        self.get_object()
        return Response("OK", 201).resp

    @subaction(detail=True, serializer_class=Host.generated_view.serializer_class)
    def test3(self, request, *args, **kwargs):
        return Response("OK", 201).resp  # nocv


class _HostGroupViewSet(HostGroup.generated_view):
    '''
    Host group opertaions.
    '''


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
class HostGroupViewSet(_HostGroupViewSet):
    copy_related = ['hosts', 'subgroups']


@nested_view('subdeephosts', 'id', view=HostGroupViewSet, serializer_class_one=HostGroupViewSet.serializer_class)
class _DeepHostGroupViewSet(_HostGroupViewSet):

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


class FilesViewSet(File.generated_view):
    pass


class TestFkViewSet(ModelWithFK.generated_view):
    pass


class TestBinaryFilesViewSet(ModelWithBinaryFiles.generated_view):
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


class VarBasedViewSet(VarBasedModel.generated_view):
    pass
