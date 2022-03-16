from django.db import models
from vstutils.models import BaseModel


class Group(BaseModel):
    deep_parent_field = 'parents'
    deep_parent_allow_append = True

    name = models.CharField(max_length=256)
    parents = models.ManyToManyField('Group', related_name="childrens")
    fkmodel = models.ForeignKey('ModelWithNestedModels', on_delete=models.CASCADE, null=True)

    class Meta:
        default_related_name = "groups"


class GroupWithFK(BaseModel):
    deep_parent_field = 'parent'
    deep_parent_allow_append = True

    name = models.CharField(max_length=256)
    parent = models.ForeignKey('GroupWithFK', on_delete=models.CASCADE, related_name="child", null=True)
    fkmodel = models.ForeignKey('ModelWithNestedModels', on_delete=models.CASCADE, null=True)

    class Meta:
        default_related_name = "groupswithfk"


class AnotherDeepNested(BaseModel):
    deep_parent_field = 'parent'

    name = models.CharField(max_length=256)
    parent = models.ForeignKey('AnotherDeepNested', on_delete=models.CASCADE, related_name="child", null=True)


class ModelWithNestedModels(BaseModel):
    name = models.CharField(max_length=256)

    class Meta:
        _nested = {
            'groups': {
                'allow_append': True,
                'model': Group,
            },
            'groupswithfk': {
                'model': GroupWithFK,
            },
        }
