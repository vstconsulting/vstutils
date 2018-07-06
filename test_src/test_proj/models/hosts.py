from vstutils.models import BQuerySet, BModel, Manager, models


class HostQuerySet(BQuerySet):
    def test_filter(self):
        return self.filter(name__startswith='test_')


class Host(BModel):
    objects = Manager.from_queryset(HostQuerySet)()
    name = models.CharField(max_length=1024)


class HostGroup(BModel):
    objects = Manager.from_queryset(HostQuerySet)()
    name = models.CharField(max_length=1024)
    hosts = models.ManyToManyField(Host)
    parent = models.ForeignKey('self', on_delete=models.CASCADE,
                               related_query_name='subgroups', related_name='subgroups',
                               null=True, default=None, blank=True)
