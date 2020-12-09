from django.db import models
from vstutils.models import BQuerySet, BModel, Manager, register_view_action, register_view_method
from vstutils.api import fields, responses, serializers, base


class TestFilterBackend:
    required = True

    def filter_queryset(self, request, queryset, view):
        return queryset.extra(select={'local_filter_applied': 1})

    def get_schema_fields(self, view):
        return []


class HostQuerySet(BQuerySet):
    def test_filter(self):
        return self.filter(name__startswith='test_')

    def test_filter2(self):
        return self.test_filter()

    test_filter2.queryset_only = True


class Host(BModel):
    objects = Manager.from_queryset(HostQuerySet)()
    name = models.CharField(max_length=1024)

    class Meta:
        _serializer_class = 'vstutils.api.serializers.VSTSerializer'
        _list_fields = (
            'name',
            'local_filter_applied',
            'filter_applied',
        )
        _override_list_fields = {
            'id': fields.RedirectIntegerField(read_only=True),
            'name': fields.DependEnumField(field='id', choices={3: 'hello', 1: 'NOO!'}),
            'local_filter_applied': fields.IntegerField(default=0, read_only=True),
            'filter_applied': fields.IntegerField(default=0, read_only=True),
        }
        _filterset_fields = ('id', 'name')
        _filter_backends = (TestFilterBackend,)

    @register_view_action(
        response_code=200,
        response_serializer=serializers.EmptySerializer,
        detail=True,
        description='Some desc',
        multiaction=True
    )
    def test(self, request, *args, **kwargs):
        response = request.session.get(0, "OK")
        request.session[0] = "OK"
        request.session.save()
        return responses.HTTP_200_OK(response)

    @register_view_action(detail=True)
    def test2(self, request, *args, **kwargs):
        """ test description """
        obj = self.get_object()
        response = request.session.get(0, "OK")
        request.session.save()
        request.session[0] = "OK"
        assert hasattr(obj, 'filter_applied')
        return base.Response(response, 201).resp


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
            'filter_applied'
        )
        _copy_attrs = dict(
            copy_field_name='name'
        )
        _override_list_fields = dict(
            name=fields.AutoCompletionField(autocomplete=['Some', 'Another']),
            parent=fields.AutoCompletionField(autocomplete='Host', required=False),
            secret_file=fields.SecretFileInString(read_only=True),
            file=fields.FileInStringField(read_only=True),
            filter_applied=fields.IntegerField(default=0, read_only=True),
        )
        _filterset_fields = ('id',)

    @property
    def file(self):
        return "Some value"

    @property
    def secret_file(self):
        return "Some secret value"

    @register_view_method()
    def get_manager_subdeephosts(self, parent):
        return getattr(parent, 'subgroups')
