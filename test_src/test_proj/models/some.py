from vstutils.models import BModel, models


class ModelWithFK(BModel):
    some_fk = models.ForeignKey('test_proj.Host', on_delete=models.CASCADE,
                                null=True, default=None, blank=True)


class ModelWithBinaryFiles(BModel):
    some_binfile = models.TextField(default='')
    some_namedbinfile = models.TextField(default='')
    some_namedbinimage = models.TextField(default='')
    some_multiplenamedbinfile = models.TextField(default='')
    some_multiplenamedbinimage = models.TextField(default='')
