import typing as _t


class register_view_decorator:
    method_type: _t.Text

    def __init__(self, method_type: _t.Text, *args, **kwargs):
        ...

    def __call__(self, func: _t.Callable) -> _t.Callable:
        ...


class register_view_action(register_view_decorator):
    def __init__(self, *args, **kwargs):
        super().__init__('action', *args, **kwargs)


class register_view_method(register_view_decorator):
    def __init__(self, *args, **kwargs):
        super().__init__('override_method', *args, **kwargs)
