from vstutils.api.serializers import VSTSerializer
from vstutils.api.base import ModelViewSetSet, Response, CopyMixin
from vstutils.api.decorators import nested_view, action
from vstutils.api import filters
from vstutils.api import fields
from .models import Host, HostGroup


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


class HostSerializer(VSTSerializer):
    id = fields.RedirectIntegerField(read_only=True)
    name = fields.DependEnumField(field='id', choices={ None: 'hello', 1: 'NOO!' })

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


class HostViewSet(ModelViewSetSet):
    '''
    Hosts view
    '''
    model = Host
    serializer_class = HostSerializer
    action_serializers = {
        'create': CreateHostSerializer
    }
    filter_class = HostFilter

    @action(detail=True)
    def test(self, request, *args, **kwargs):
        return Response("OK", 200).resp

    @action(detail=True, serializer_class=HostSerializer)
    def test2(self, request, *args, **kwargs):
        self.get_object()
        return Response("OK", 201).resp

    @action(detail=True, serializer_class=HostSerializer)
    def test3(self, request, *args, **kwargs):
        return Response("OK", 201).resp


class _HostGroupViewSet(ModelViewSetSet):
    '''
    Host group opertaions.
    '''
    model = HostGroup
    serializer_class = HostGroupSerializer
    serializer_class_one = HostGroupSerializer
    filter_class = HostGroupFilter

@nested_view('subgroups', 'id', view=_HostGroupViewSet, subs=None)
@nested_view('hosts', 'id', view=HostViewSet)
@nested_view('subhosts', methods=["get"], manager_name='hosts', view=HostViewSet)
@nested_view(
    'shost', 'id',
    manager_name='hosts', subs=['test', 'test2'],
    view=HostViewSet, allow_append=True
)
@nested_view(
    'shost_all', 'id',
    manager_name='hosts', subs=None,
    view=HostViewSet, methods=['get']
)
class HostGroupViewSet(_HostGroupViewSet, CopyMixin):
    serializer_class_one = HostGroupSerializer
    copy_related = ['hosts', 'subgroups']


@nested_view('subdeephosts', 'id', manager_name='subgroups', view=HostGroupViewSet)
class _DeepHostGroupViewSet(_HostGroupViewSet, CopyMixin):
    pass


@nested_view('subsubhosts', 'id', manager_name='subgroups', view=_DeepHostGroupViewSet)
class DeepHostGroupViewSet(_DeepHostGroupViewSet):
    pass


try:
    @nested_view('subgroups', 'id')
    class ErrorView(_HostGroupViewSet):
        pass
except nested_view.NoView:
    pass
