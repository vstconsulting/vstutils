from configparserc import tools


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


get_file_value = tools.get_file_value
File = tools.File
