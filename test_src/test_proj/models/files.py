import os
from vstutils.models import models
from vstutils.custom_model import ListModel, FileModel
from vstutils.api import fields


class File(FileModel):
    file_path = os.path.dirname(__file__) + '/../custom_model.yaml'
    name = models.CharField(max_length=1024)
    for_order1 = models.IntegerField()
    for_order2 = models.IntegerField()
    origin_pos = models.IntegerField(primary_key=True)

    class Meta:
        _view_class = 'read_only'
        _list_fields = (
            'name',
            'for_order1',
            'for_order2',
            'origin_pos',
        )
        _override_list_fields = {
            'name': fields.CommaMultiSelect(select='HostGroup')
        }
        _filterset_fields = (
            'name',
            'for_order1',
            'for_order2',
            'origin_pos',
        )


class List(ListModel):
    data = [
        dict(id=i, value=f'Some data {i}')
        for i in range(100)
    ]
    id = models.IntegerField(primary_key=True)
    value = models.TextField()
