import os
from vstutils.models import models
from vstutils.custom_model import FileModel


class File(FileModel):
    file_path = os.path.dirname(__file__) + '/../custom_model.yaml'
    name = models.CharField(max_length=1024)
    for_order1 = models.IntegerField()
    for_order2 = models.IntegerField()
    origin_pos = models.IntegerField()

    class Meta:
        managed = False


class FilesModelView(object):
    pass
