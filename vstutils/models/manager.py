import inspect
from django.db import models


def is_class_method_or_function(obj):
    return inspect.isfunction(obj) or \
           inspect.ismethod(obj) or \
           isinstance(obj, type(is_class_method_or_function))


class BaseManager(models.Manager):

    @classmethod
    def _get_queryset_methods(cls, queryset_class):
        """
        Django overrloaded method for add cyfunction.
        """
        def create_method(name, method):  # nocv
            def manager_method(self, *args, **kwargs):
                return getattr(self.get_queryset(), name)(*args, **kwargs)

            manager_method.__name__ = method.__name__
            manager_method.__doc__ = method.__doc__
            return manager_method

        orig_method = models.Manager._get_queryset_methods
        new_methods = orig_method(queryset_class)
        for name, method in inspect.getmembers(queryset_class, predicate=is_class_method_or_function):
            # Only copy missing methods.
            if hasattr(cls, name) or name in new_methods:
                continue
            queryset_only = getattr(method, 'queryset_only', None)
            if queryset_only or (queryset_only is None and name.startswith('_')):
                continue
            # Copy the method onto the manager.
            new_methods[name] = create_method(name, method)  # nocv
        return new_methods
