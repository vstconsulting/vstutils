from django.db import models
from django.core.validators import MinValueValidator
from rest_framework.permissions import BasePermission

from vstutils.models import BaseModel


class DisallowStaffPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_superuser and request.user.is_staff:
            return False
        return super().has_permission(request, view)


class Option(BaseModel):
    name = models.CharField(max_length=255)
    product = models.ForeignKey('Product', on_delete=models.CASCADE)

    class Meta:
        default_related_name = 'options'


class Attribute(BaseModel):
    name = models.CharField(max_length=255)
    product = models.ForeignKey('Product', on_delete=models.CASCADE)

    class Meta:
        default_related_name = 'attributes'
        _permission_classes = [DisallowStaffPermission]


class Product(BaseModel):
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    store = models.ForeignKey('Store', on_delete=models.CASCADE)
    manufacturer = models.ForeignKey('Manufacturer', on_delete=models.CASCADE)

    class Meta:
        default_related_name = 'products'
        constraints = [
            models.UniqueConstraint(models.F('name'), models.F('store'), name='uniq_name_store')
        ]
        _nested = {
            'options': {
                'allow_append': True,
                'model': Option,
            },
            'attributes': {
                'allow_append': True,
                'model': Attribute,
            }
        }


class Manufacturer(BaseModel):
    name = models.CharField(max_length=255)
    store = models.ForeignKey('Store', on_delete=models.CASCADE)

    class Meta:
        default_related_name = 'manufacturers'
        _nested = {
            'products': {
                'allow_append': False,
                'model': Product,
            }
        }


class Store(BaseModel):
    name = models.CharField(max_length=255)

    class Meta:
        default_related_name = 'stores'
        _nested = {
            'products': {
                'allow_append': True,
                'model': Product,
                'allow_bulk': False,
            },
            'manufacturers': {
                'allow_append': False,
                'model': Manufacturer,
            }
        }
