import typing as _t


def multikeysort(items: _t.Iterable, columns: _t.Iterable, reverse: bool = False) -> _t.List:
    ...


def get_file_value(filename: _t.Text, default: _t.Text = '', raise_error: bool = False, strip: bool = True):
    ...


class File:
    def __init__(self, filename: bytes, mode: _t.Text = 'r'):
        ...

    def read(self) -> _t.Text:
        ...

    def write(self, value: _t.Text) -> _t.NoReturn:
        ...

    def flush(self) -> _t.SupportsInt:
        ...

    def feof(self) -> bool:
        ...

    def readline(self) -> _t.Text:
        ...
