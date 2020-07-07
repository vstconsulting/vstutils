from vstutils.models import BQuerySet, BModel, Manager, models
from vstutils.api import fields


class TestFilterBackend:
    required = True

    def filter_queryset(self, request, queryset, view):
        return queryset

    def get_schema_fields(self, view):
        return []


class HostQuerySet(BQuerySet):
    def test_filter(self):
        return self.filter(name__startswith='test_')


class Host(BModel):
    objects = Manager.from_queryset(HostQuerySet)()
    name = models.CharField(max_length=1024)

    class Meta:
        _list_fields = (
            'id',
            'name'
        )
        _override_list_fields = {
            'id': fields.RedirectIntegerField(read_only=True),
            'name': fields.DependEnumField(field='id', choices={3: 'hello', 1: 'NOO!'})
        }
        _filterset_fields = 'serializer'
        _filter_backends = (TestFilterBackend,)


class HostGroup(BModel):
    objects = Manager.from_queryset(HostQuerySet)()
    name = models.CharField(max_length=1024)
    hosts = models.ManyToManyField(Host)
    parent = models.ForeignKey('self', on_delete=models.CASCADE,
                               related_query_name='subgroups', related_name='subgroups',
                               null=True, default=None, blank=True)

    class Meta:
        _list_fields = (
            'id',
            'name',
            'parent',
            'file',
            'secret_file',
        )
        _copy_attrs = dict(
            copy_field_name='name'
        )
        _override_list_fields = dict(
            name=fields.AutoCompletionField(autocomplete=['Some', 'Another']),
            parent=fields.AutoCompletionField(autocomplete='Host', required=False),
            secret_file=fields.SecretFileInString(read_only=True),
            file=fields.FileInStringField(read_only=True)
        )
        _filterset_fields = ('id',)

    @property
    def file(self):
        return "Some value"

    @property
    def secret_file(self):
        return "Some secret value"
