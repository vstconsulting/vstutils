import typing as _t
import mimetypes
import time
import json

import pydantic
from django.utils.functional import SimpleLazyObject
from rest_framework.permissions import AllowAny

from vstutils.api import responses, filter_backends, fields
from vstutils.api.views import SettingsViewSet
from vstutils.api.base import GenericViewSet, NonModelsViewSet
from vstutils.api.decorators import action, nested_view, subaction, extend_filterbackends
from vstutils.api.serializers import DataSerializer, JsonObjectSerializer, EmptySerializer
from vstutils.api.auth import UserViewSet
from vstutils.api.actions import Action, SimpleAction, SimpleFileAction
from vstutils.utils import create_view
from vstutils.gui.context import gui_version

from .models import Host, HostList, HostGroup, ModelWithBinaryFiles, ModelWithFK, CachableProxyModel


class TestFilterBackend(filter_backends.VSTFilterBackend):
    required = True

    def filter_queryset(self, request, queryset, view):
        return queryset.extra(select={'filter_applied': 1})


class CreateHostSerializer(Host.generated_view.serializer_class):
    pass


@extend_filterbackends([TestFilterBackend])
class HostViewSet(Host.generated_view):
    '''
    Hosts view
    '''
    action_serializers = {
        'create': CreateHostSerializer
    }
    select_related = True

    @subaction(
        detail=True,
        serializer_class=Host.generated_view.serializer_class,
        icons=["fas", "fa-calculator"],
        title='Test 3 action'
    )
    def test3(self, request, *args, **kwargs):
        return responses.HTTP_201_CREATED("OK")  # nocv


@extend_filterbackends(list(HostGroup.generated_view.filter_backends) + [TestFilterBackend], override=True)
class _HostGroupViewSet(HostGroup.generated_view):
    """
    Host group operations.

    list:
        return all hosts

    """
    select_related = True

    def get_queryset(self):
        return super().get_queryset().select_related('parent')


def queryset_nested_filter(parent, qs):
    return qs


HiddenOnFrontendHostsViewSet = create_view(
    Host,
    hidden=True,
    extra_view_attributes={
        'empty_action': Action(
            name='hidden_action',
            hidden=True,
            require_confirmation=True,
        )(lambda *a, **k: None),
    }
)


@nested_view('subgroups', 'id', view=_HostGroupViewSet, subs=None)
@nested_view('hosts', 'id', view=HostViewSet)
@nested_view('hidden_on_frontend_hosts', 'id', view=HiddenOnFrontendHostsViewSet)
@nested_view('hidden_hosts', 'id', view=HostViewSet, schema=None)
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
    select_related = True

    @action(suffix='Instance', detail=False)
    def instance_suffix_action_test(self, *args, **kwsrgs):  # nocv
        pass


@nested_view('subdeephosts', 'id', view=HostGroupViewSet, serializer_class_one=HostGroupViewSet.serializer_class)
class _DeepHostGroupViewSet(_HostGroupViewSet):
    select_related = False


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
            return responses.HTTP_200_OK("OK")
except AssertionError:
    pass


class TestBinaryFilesPydantic(pydantic.BaseModel):
    model_config = pydantic.ConfigDict(
        extra='ignore',
        from_attributes=True,
        title="TestBinaryFilesObject",
        strict=True,
    )
    id: int


class TestBinaryFilesViewSet(ModelWithBinaryFiles.generated_view):
    @SimpleAction(serializer_class=TestBinaryFilesPydantic)
    def test_pydantic(self, request, *args, **kwargs):
        return self.get_object()

    @SimpleAction(serializer_class=TestBinaryFilesPydantic, is_list=True)
    def test_pydantic_list(self, request, *args, **kwargs):
        return self.get_queryset()

    @SimpleFileAction(as_attachment=True)
    def test_some_filefield_default(self, request, *args, **kwargs):
        return self.get_object().some_filefield

    @SimpleFileAction(as_attachment=True)
    def test_some_filefield(self, request, *args, **kwargs):
        return self.get_object()

    @test_some_filefield.modified_since
    def test_some_filefield(self, obj):
        return obj.some_filefield.storage.get_modified_time(obj.some_filefield.name)

    @test_some_filefield.pre_data
    def test_some_filefield(self, obj):
        file = obj.some_filefield
        filename = file.name
        content_type, _ = mimetypes.guess_type(filename)
        content_type = content_type or 'application/octet-stream'
        return file, filename, content_type

    @action(methods=['get'], detail=True)
    def test_nested_view_inspection(self, *args, **kwargs):
        raise Exception  # nocv

    test_nested_view_inspection._nested_view = None
    test_nested_view_inspection._nested_name = ''


class RequestInfoTestView(NonModelsViewSet):
    base_name = 'request_info'
    serializer_class = DataSerializer

    def list(self, request):
        start_time = time.time()
        headers = dict(request.headers)
        serializer = DataSerializer(data=json.dumps(
            dict(
                headers=headers,
                query=request.query_params,
                user_id=request.user.id
            )
        ))
        serializer.is_valid(raise_exception=True)
        request._request.is_bulk = False
        return responses.HTTP_200_OK(
            serializer.data,
            timings=dict(
                req=(i for i in ['test case', time.time() - start_time]),
                miss=None
            )
        )

    def put(self, request):
        data = request.data
        response = responses.HTTP_200_OK(SimpleLazyObject(lambda: data))
        response.set_cookie('request_info_cookie', 'request_info_cookie_value')
        return response


class TestUserViewSet(UserViewSet):
    @action(methods=['get'], detail=True)
    def test_bulk_perf(self, request, *args, **kwargs):
        time.sleep(0.001)
        return responses.HTTP_200_OK({'id': request.user.id})


class SettingsViewSetV2(SettingsViewSet):
    __slots__ = ()

    @action(methods=['get'], detail=False)
    def new_action(self, request, *args, **kwargs):
        return responses.HTTP_200_OK('OK')  # nocv

    @action(methods=['get'], detail=True)
    def new_action_detail(self, request, *args, **kwargs):
        return responses.HTTP_200_OK('OK')  # nocv

    localization = None


HostListViewSet = HostList.get_view_class(view_class='list_only')

ModelWithFKViewSet = create_view(
    ModelWithFK,
    serializer_class_name='SuperModelWithFK',
    override_detail_fields={
        'some_fk': fields.FkModelField(select=Host),
        'no_prefetch_and_link_fk': fields.FkModelField(select=HostViewSet.serializer_class,
                                                       use_prefetch=False, make_link=False, required=False),
        'multiselect': fields.CommaMultiSelect(select='test_proj.Host', required=False),
        'fk_with_filters': fields.FkModelField(select='test_proj.Post', filters={'rating': 5}, required=False,
                                               allow_null=True)
    }
)


class HostCreateDummyMixin:
    def create(self, request, *args, **kwargs):
        return responses.HTTP_201_CREATED("OK")

    @action(methods=['POST'], detail=False, serializer_class=JsonObjectSerializer)
    def test_json_serializer(self, request, *_, **__):
        return responses.HTTP_201_CREATED(self.get_serializer(request.data).data)


HostWithoutAuthViewSet = create_view(
    Host,
    view_class=(HostCreateDummyMixin, 'read_only'),
    override_authentication_classes=None,
    permission_classes=[AllowAny],
    override_permission_classes=True,
)

CacheableView = create_view(CachableProxyModel)


class CacheableViewSet(CacheableView):
    def get_etag_value(self, model_class, request):
        return super().get_etag_value((model_class, gui_version), request)



class TestOauth2ViewSet(GenericViewSet):
    serializer_class = EmptySerializer
    permission_classes = [AllowAny]

    @subaction(methods=['POST', 'GET'], detail=False)
    def counter(self, request):
        value = request.session.get('test_counter', 0)
        if request.method == 'POST':
            value += 1
            request.session['test_counter'] = value
        # Some tests run with session middleware disabled so it needs to be saved manually
        request.session.save()
        return responses.Response200({'value': value})
