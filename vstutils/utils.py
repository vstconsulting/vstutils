def import_class(path):
    '''
    Get class from string-path

    :param path: -- string containing full python-path
    :type path: str,unicode
    :return: -- return class or module in path
    :rtype: class, module, object
    '''
    m_len = path.rfind(".")
    class_name = path[m_len + 1:len(path)]
    try:
        module = __import__(path[0:m_len], globals(), locals(), [class_name])
        return getattr(module, class_name)
    except SystemExit:  # nocv
        return None  # nocv
