from ..api import decorators as api_decorators, serializers


class register_view_decorator:  # pylint: disable=invalid-name
    __slots__ = ('method_type', 'args', 'kwargs')

    def __init__(self, method_type, *args, **kwargs):
        self.method_type = f'type_{method_type}'
        assert hasattr(self, self.method_type), f'Invalid register type {method_type}.'
        self.args = args
        self.kwargs = kwargs

    def type_action(self, func):
        if func.__doc__ and 'description' not in self.kwargs:
            self.kwargs['description'] = func.__doc__
        if 'response_serializer' not in self.kwargs and 'serializer_class' not in self.kwargs:
            self.kwargs['serializer_class'] = serializers.EmptySerializer
        return api_decorators.subaction(*self.args, **self.kwargs)(func)

    def type_override_method(self, func):
        return func

    def __call__(self, func):
        result = getattr(self, self.method_type)(func)
        result._append_to_view = True
        return result


class register_view_action(register_view_decorator):  # pylint: disable=invalid-name
    """
    Simple decorator for marking model methods as generated view
    `actions <https://www.django-rest-framework.org/api-guide/viewsets/#marking-extra-actions-for-routing>`_.
    The decorated method becomes a method of generated view and `self` will be view object.
    See supported args in :func:`vstutils.api.decorators.subaction`

    .. note::
        Often, the action does not transfer any parameters and requires only sending an empty query.
        To speed up development, we set the default serializer to :class:`vstutils.api.serializers.EmptySerializer`.

    """
    __slots__ = ()  # type: ignore

    def __init__(self, *args, **kwargs):
        super().__init__('action', *args, **kwargs)


class register_view_method(register_view_decorator):  # pylint: disable=invalid-name
    __slots__ = ()  # type: ignore

    def __init__(self, *args, **kwargs):
        super().__init__('override_method', *args, **kwargs)
