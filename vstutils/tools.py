import pathlib


def multikeysort(items, columns, reverse=False):
    if not isinstance(items, list):
        items = list(items)  # nocv
    if not isinstance(columns, list):
        columns = list(columns)  # nocv
    columns.reverse()

    for column in columns:
        # pylint: disable=cell-var-from-loop
        is_reverse = column.startswith('-')
        if is_reverse:
            column = column[1:]
        items.sort(key=lambda row: row[column], reverse=is_reverse)

    if reverse:
        items.reverse()

    return items


def get_file_value(filename, default='', raise_error=False, strip=True):
    result = default

    try:
        result = pathlib.Path(filename).read_text(encoding='utf-8')
        if strip:
            result = result.strip()
    except IOError:
        if raise_error:
            raise  # nocv

    return result


try:
    # pylint: disable=unused-import
    from ._tools import get_file_value  # noqa: F811,F401
except ImportError:  # nocv
    pass
