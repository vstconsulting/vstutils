from django.db import models
from django.dispatch import receiver
from django.db.models.signals import pre_delete
from django.core.validators import ValidationError

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


class ProtectedBySignal(BaseModel):
    name = models.CharField(max_length=256)
    fkmodel = models.ManyToManyField('ModelWithNestedModels')

    class Meta:
        default_related_name = 'protected'


@receiver(pre_delete, sender=ProtectedBySignal)
def protect_from_delete(instance: ProtectedBySignal, **kwargs):
    if instance.fkmodel.exists():
        raise ValidationError('Remove all references to this instance first')


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
            'protected': {
                'allow_append': True,
                'model': ProtectedBySignal,
            },
        }
