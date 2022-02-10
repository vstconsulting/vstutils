from django.db import models
from vstutils.models import BaseModel


class Group(BaseModel):
    deep_parent_field = 'parents'

    name = models.CharField(max_length=256)
    parents = models.ManyToManyField('Group', related_query_name="childrens")

    class Meta:
        default_related_name = "groups"
