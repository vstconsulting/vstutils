from ..api import decorators as api_decorators, serializers


class register_view_decorator:  # pylint: disable=invalid-name
    __slots__ = ('method_type', 'args', 'kwargs', 'inherit')

    def __init__(self, method_type, *args, **kwargs):
        self.method_type = f'type_{method_type}'
        assert hasattr(self, self.method_type), f'Invalid register type {method_type}.'
        self.args = args
        self.kwargs = kwargs
        self.inherit = kwargs.pop('inherit', False)

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
        result._inherit = self.inherit
        return result


class register_view_action(register_view_decorator):  # pylint: disable=invalid-name
    """
    Decorator for turning model methods to generated view
    `actions <https://www.django-rest-framework.org/api-guide/viewsets/#marking-extra-actions-for-routing>`_.
    When a method is decorated, it becomes a part of the generated view and
    the `self` reference within the method points to the view object.
    This allows you to extend the functionality of generated views with custom actions.

    The `register_view_action` decorator supports various arguments, and you can refer to the documentation
    for :func:`vstutils.api.decorators.subaction` to explore the complete list of supported arguments.
    These arguments provide flexibility in defining the behavior and characteristics of the generated view actions.

    .. note::
        In scenarios where you're working with proxy models that share a common set of actions,
        you can use the `inherit` named argument with a value of `True`.
        This allows the proxy model to inherit actions defined in the base model,
        reducing redundancy and promoting code reuse.

    .. note::
        In many cases, an action may not require any parameters and can be executed by sending an empty query.
        To streamline development and enhance efficiency, the `register_view_action` decorator sets
        the default serializer to :class:`vstutils.api.serializers.EmptySerializer`.
        This means that the action expects no input data,
        making it convenient for actions that operate without additional parameters.

    Example:

        This example demonstrates how to use the decorator to create a custom action within a model view.
        The ``empty_action`` method becomes part of the generated view and expects no input parameters.

        .. sourcecode:: python

            from vstutils.models import BModel
            from vstutils.models.decorators import register_view_action
            from vstutils.api.responses import HTTP_200_OK


            class MyModel(BModel):
                # ... model fields ...

                @register_view_action(detail=False, inherit=True)
                def empty_action(self, request, *args, **kwargs):
                    # in this case `self` will be reference within the method points to the view object
                    return HTTP_200_OK('OK')

    """
    __slots__ = ()  # type: ignore

    def __init__(self, *args, **kwargs):
        super().__init__('action', *args, **kwargs)


class register_view_method(register_view_decorator):  # pylint: disable=invalid-name
    __slots__ = ()  # type: ignore

    def __init__(self, *args, **kwargs):
        super().__init__('override_method', *args, **kwargs)
