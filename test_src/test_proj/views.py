from vstutils.api.serializers import VSTSerializer
from vstutils.api.base import ModelViewSetSet, nested_view
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


class _HostGroupViewSet(ModelViewSetSet):
    model = HostGroup
    serializer_class = HostGroupSerializer

@nested_view('subgroups', 'id', view=_HostGroupViewSet)
@nested_view('hosts', 'id', view=HostViewSet)
@nested_view('subhosts', methods=["get"], manager_name='hosts', view=HostViewSet)
@nested_view('shost', 'id', manager_name='hosts', view=HostViewSet, allow_append=True)
class HostGroupViewSet(_HostGroupViewSet):
    pass


try:
    @nested_view('subgroups', 'id')
    class ErrorView(_HostGroupViewSet):
        pass
except Exception as err:
    assert str(err) == 'Argument "view" must be installed for `nested_view` decorator.'
