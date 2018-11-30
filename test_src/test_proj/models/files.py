from vstutils.models import CustomQuerySet, BModel, Manager, models


class FileQuerySet(CustomQuerySet):
    pass


class File(BModel):
    name = models.CharField(max_length=1024)
    objects = Manager.from_queryset(FileQuerySet)

    class Meta:
        abstract = True
    pass


class FileModelView():
    pass
