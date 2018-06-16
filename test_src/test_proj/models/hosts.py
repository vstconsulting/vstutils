from vstutils.models import BQuerySet, BModel, Manager, models


class HostQuerySet(BQuerySet):
    def test_filter(self):
        return self.filter(name__startswith='test_')


class Host(BModel):
    objects = Manager.from_queryset(HostQuerySet)()
    name = models.CharField(max_length=1024)
