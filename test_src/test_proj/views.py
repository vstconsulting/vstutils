from vstutils.api.serializers import VSTSerializer
from vstutils.api.base import ModelViewSetSet, nested_view, action, Response
from vstutils.api.filters import filters
from .models import Host, HostGroup


class HostFilter(filters.FilterSet):
    class Meta:
        model = HostGroup
        fields = (
            'id',
            'name',
        )


class HostSerializer(VSTSerializer):
    class Meta:
        model = Host
        fields = (
            'id',
            'name',
        )



class HostGroupSerializer(VSTSerializer):
    class Meta:
        model = HostGroup
        fields = (
            'id',
            'name',
            'parent',
        )


class HostViewSet(ModelViewSetSet):
    model = Host
    serializer_class = HostSerializer
    filter_class = HostFilter

    @action(detail=True)
    def test(self, request, *args, **kwargs):
        return Response("OK", 200).resp

    @action(detail=True, serializer_class=HostSerializer)
    def test2(self, request, *args, **kwargs):
        return Response("OK", 201).resp

    @action(detail=True, serializer_class=HostSerializer)
    def test3(self, request, *args, **kwargs):
        return Response("OK", 201).resp


class _HostGroupViewSet(ModelViewSetSet):
    model = HostGroup
    serializer_class = HostGroupSerializer

@nested_view('subgroups', 'id', view=_HostGroupViewSet)
@nested_view('hosts', 'id', view=HostViewSet)
@nested_view('subhosts', methods=["get"], manager_name='hosts', view=HostViewSet)
@nested_view(
    'shost', 'id',
    manager_name='hosts', subs=['test', 'test2'],
    view=HostViewSet, allow_append=True
)
class HostGroupViewSet(_HostGroupViewSet):
    pass


try:
    @nested_view('subgroups', 'id')
    class ErrorView(_HostGroupViewSet):
        pass
except nested_view.NoView:
    pass
