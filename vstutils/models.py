# pylint: disable=no-member,no-classmethod-decorator,protected-access
from __future__ import unicode_literals
import inspect
import cython
from django.db import models
from .utils import Paginator


@cython.cfunc
@cython.returns(cython.bint)
def __cyfunc():  # noprj
    return 1


CyFunctionType = type(__cyfunc)


def iscyfunction(object):  # noprj
    return isinstance(object, CyFunctionType)


class BQuerySet(models.QuerySet):  # noprj
    '''
    QuerySet class with basic operations.
    '''
    use_for_related_fields = True

    def paged(self, *args, **kwargs):
        return self.get_paginator(*args, **kwargs).items()

    def get_paginator(self, *args, **kwargs):
        return Paginator(self.filter(), *args, **kwargs)

    def cleared(self):
        return (
            self.filter(hidden=False) if hasattr(self.model, "hidden")
            else self
        )

    def _find(self, field_name, tp_name, *args, **kwargs):
        field = kwargs.get(field_name, None) or (list(args)[0:1]+[None])[0]
        if field is None:
            return self
        if isinstance(field, list):
            return getattr(self, tp_name)(**{field_name+"__in": field})
        return getattr(self, tp_name)(**{field_name: field})

    def as_manager(cls):
        manager = BaseManager.from_queryset(cls)()
        manager._built_with_as_manager = True
        return manager
    as_manager.queryset_only = True
    as_manager = classmethod(as_manager)


class BaseManager(models.Manager):  # noprj
    '''
    Base Manager class created from queryset
    '''

    @classmethod
    def _get_queryset_methods(cls, queryset_class):
        '''
        Django overrloaded method for add cyfunction.
        '''
        def create_method(name, method):
            def manager_method(self, *args, **kwargs):
                return getattr(self.get_queryset(), name)(*args, **kwargs)

            manager_method.__name__ = method.__name__
            manager_method.__doc__ = method.__doc__
            return manager_method

        orig_method = models.Manager._get_queryset_methods
        new_methods = orig_method(queryset_class)
        for name, method in inspect.getmembers(queryset_class, predicate=iscyfunction):
            # Only copy missing methods.
            if hasattr(cls, name) or name in new_methods:
                continue
            queryset_only = getattr(method, 'queryset_only', None)
            if queryset_only or (queryset_only is None and name.startswith('_')):
                continue
            # Copy the method onto the manager.
            new_methods[name] = create_method(name, method)
        return new_methods


class Manager(BaseManager.from_queryset(BQuerySet)):
    '''
    Default VSTUtils manager
    '''


class BaseModel(models.Model):  # noprj
    # pylint: disable=no-member
    objects    = Manager()

    def __init__(self, *args, **kwargs):  # nocv
        super(BaseModel, self).__init__(*args, **kwargs)
        self.no_signal = False

    class Meta:
        abstract = True

    def __str__(self):  # nocv
        return self.__unicode__()


class BModel(BaseModel):  # noprj
    id         = models.AutoField(primary_key=True, max_length=20)
    hidden     = models.BooleanField(default=False)

    class Meta:
        abstract = True

    def __unicode__(self):  # nocv
        return "<{}>".format(self.id)
