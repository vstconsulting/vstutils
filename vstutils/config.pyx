# cython: c_string_type=str, c_string_encoding=utf8, linetrace=True, profile=True
# distutils: define_macros=CYTHON_TRACE_NOGIL=1

import typing as _t
import re
import os
import io
import json
import pytimeparse
from functools import reduce

from configparser import ConfigParser as BaseConfigParser
from .tools import get_file_value

from libc.stdio cimport getline, FILE, fopen, fclose, printf, ftell
from posix.stat cimport stat, struct_stat
from posix.stdio cimport fmemopen
from libc.stdlib cimport free
from libc.string cimport strlen
from cpython.dict cimport PyDict_GetItem, PyDict_Contains, PyDict_SetItem, PyDict_New
from cpython.unicode cimport PyUnicode_Replace


cdef extern from '_config.h' nogil:
    int __has_only_whitespaces(char*)

cdef dict __get_dict_from_dict_for_reduce(dict collect, str key):
    if PyDict_Contains(collect, key) == 1:
        return <dict>PyDict_GetItem(collect, key)
    return PyDict_New()


cdef bint __is_section(object obj):
    return isinstance(obj, Section)


cdef str __get_section_subname(Section section):
    return section.get_name().split('.')[-1]

cdef object __get_or_create_section_recursive(list section_name_list, str full_name, object dict_ptr, object config, int carret_pos = 0):
    cdef:
        str key
        object section
        unsigned long name_len
        unsigned long key_len

    key = section_name_list[0]

    if key == '':
        return dict_ptr

    name_len = len(section_name_list)
    key_len = len(key)

    if PyDict_Contains(dict_ptr, key) == 0:
        section = config.get_section_instance(full_name[:carret_pos + key_len])
        PyDict_SetItem(dict_ptr, key, section)
    else:
        section = <object>PyDict_GetItem(dict_ptr, key)

    if name_len > 1:
        return __get_or_create_section_recursive(section_name_list[1:], full_name, section, config, carret_pos + key_len + 1)

    return section


cdef class Empty:
    pass


cdef class ConfigParserException(Exception):
    pass


cdef class ParseError(ConfigParserException):
    pass


cdef class BaseType:
    def convert(self, value):
        return value

    def str_convert(self, value):
        return value

    def __call__(self, value):
        return self.convert(value)


cdef class StrType(BaseType):
    def convert(self, value):
        return str(value)


cdef class IntType(BaseType):
    def convert(self, value):

        if not isinstance(value, str):
            value = str(value)

        if 'K' in value:
            value = PyUnicode_Replace(value, 'K', '000', 1)
        elif 'M' in value:
            value = PyUnicode_Replace(value, 'M', '000000', 1)
        elif 'G' in value:
            value = PyUnicode_Replace(value, 'G', '000000000', 1)

        if '.' in value:
            value = float(value)

        return int(value)


cdef class BytesSizeType(BaseType):
    re_size = re.compile(r"(?P<val>[\d\.]+)(?P<mul>[KMGTkmgt]{0,1})[bB]{0,1}")
    _kb = 1024
    _mb = _kb * 1024
    _gb = _mb * 1024
    _tb = _gb * 1024

    def convert(self, value):
        if not isinstance(value, str):
            value = str(value)

        multiplier = 1

        match = self.re_size.match(value)
        value = match.group('val')
        mul = match.group('mul')
        if mul:
            multiplier = getattr(self, '_' + mul.lower() + 'b', multiplier)

        return (int(float(value) * multiplier))


cdef class BoolType(BaseType):
    def convert(self, value):
        if isinstance(value, str):
            if 'False' in value:
                value = PyUnicode_Replace(value, 'False', '', -1)
            elif 'false' in value:
                value = PyUnicode_Replace(value, 'false', '', -1)
        return bool(value)


cdef class IntSecondsType(BaseType):
    def convert(self, value):
        value = pytimeparse.parse(str(value)) or value
        return int(value)


cdef class ListType(BaseType):
    cdef str separator

    def __cinit__(self, separator=','):
        self.separator = separator

    def convert(self, value):
        if isinstance(value, (str, bytes)):
            value = filter(bool, value.split(self.separator))
        elif isinstance(value, (int, float)):
            return value,
        return tuple(value)

    def str_convert(self, value):
        return self.separator.join(value)


cdef class JsonType(BaseType):
    def convert(self, value):
        if not isinstance(value, str):
            value = json.dumps(value)
        return json.loads(value)

    def str_convert(self, value):
        return json.dumps(value)


cdef class __BaseDict(dict):

    def __eq__(self, other):
        if not isinstance(other, dict):
            return False
        if self.keys() != other.keys():
            return False
        for key in self:
            if self[key] != other[key]:
                return False
        return True

    def __ne__(self, other):
        return not self == other


cdef class ConfigParserC(__BaseDict):
    """

    """

    section_regex = re.compile(r"^\[(?P<section>(.+))\].*$", re.MULTILINE)
    pair_regex = re.compile(r"^(?P<key>([^\s]+?))[\s]{0,}=[\s]{0,}(?P<value>(.*?))[\s]{0,}$", re.MULTILINE)

    cdef:
        dict __sections_map
        dict section_defaults
        dict __format_kwargs

    def __init__(self, dict section_overload = None, dict section_defaults = None, dict format_kwargs = None):
        self.__sections_map = {}
        self.section_defaults = getattr(self, 'defaults', section_defaults or {}).copy()
        self.__format_kwargs = getattr(self, 'format_kwargs', {}).copy()

        if format_kwargs:
            self.__format_kwargs.update(format_kwargs)

        if hasattr(self, 'section_overload') and self.section_overload:
            self.__sections_map.update(self.section_overload)
        if section_overload:
            self.__sections_map.update(section_overload)

        super().__init__()

        for key in self.section_defaults:
            self[key] = self.get_section_instance(key)

    def __getitem__(self, item):
        if item not in self:
            section = self.get_section_instance(item)
        else:
            section = super().__getitem__(item)

            subsections_names = list(section.subsections_names)
            only_subsections = not frozenset(subsections_names).symmetric_difference(section.keys())

            if (not section or only_subsections) and isinstance(section, Section) and item in self.section_defaults:
                section = section.copy()
                for key, value in self.section_defaults[item].copy().items():
                    if key not in subsections_names:
                        section[key] = value

        return section

    cdef void __set_object_item(self, str key, object value):
        PyDict_SetItem(self, key, value)

    def __setitem__(self, key, value):
        if isinstance(value, dict) and not isinstance(value, Section):
            value = self.get_section_instance(key, default=value)
        self.__set_object_item(key, value)

    def get(self, key, default = Empty()):
        if key not in self and not isinstance(default, Empty):
            return self.get_section_instance(key, default=default)
        return self[key]

    def format_string(self, value, section_name=None):
        if isinstance(value, str) and '{' in value and '}' in value:
            return value.format(
                __section=section_name,
                this=self.copy(),
                **self.__format_kwargs
            )
        return value

    def get_section_instance(self, section_name, *args, **kwargs):
        return self.get_section_class(section_name)(section_name, self, *args, **kwargs)

    def get_section_class(self, section_name):
        if isinstance(section_name, bytes):
            section_name = section_name.decode('utf-8')
        if section_name in self.__sections_map:
            return self.__sections_map[section_name]
        elif hasattr(self, 'section_class_' + section_name):
            return getattr(self, 'section_class_' + section_name, Section)
        return Section

    cdef object _parse_section(self, str line):
        if '[' in line and ']' in line:
            match = self.section_regex.match(line)
            if match is not None:
                return match.group('section')

    cdef object _parse_pair(self, str line):
        cdef:
            str key, value
            object match

        match = self.pair_regex.match(line)
        if match is not None:
            key = match.group('key')
            if not key:
                return
            value = match.group('value')
            return key, value

    cdef object _add_section(self, str section_name):
        return __get_or_create_section_recursive(section_name.split('.'), section_name, self, self)

    cdef int _parse_file(self, FILE *config_file, unsigned long long config_file_size):
        cdef:
            str section_name
            char *line
            size_t count
            object result
            Section current_section
        count = 0
        current_section = None

        while <long>config_file_size > ftell(config_file):
            line = NULL
            with nogil:
                if getline(&line, &count, config_file) == -1:
                    printf('Failed read line or end of file')
                    break
            if __has_only_whitespaces(line) == 1:
                continue
            elif line[0] == b'#' or line[0] == b';':
                continue

            section_name = self._parse_section(line)
            if section_name is not None:
                current_section = self._add_section(section_name)
                with nogil:
                    free(line)
                continue
            elif current_section is None:
                free(line)
                return -1

            result = self._parse_pair(line)
            if result is not None:
                current_section[result[0]] = result[1]
            else:
                free(line)
                return -1
            free(line)
        return 0

    cdef _parse_file_by_name(self, char *filename):
        cdef:
            FILE *fd
            struct_stat st
            int err

        with nogil:
            err = 0
            stat(filename, &st)
            fd = fopen(filename, 'r')
        if fd == NULL:
            return err
        err = self._parse_file(fd, st.st_size)
        fclose(fd)
        return err

    cdef _parse_text(self, char* text):
        cdef:
            FILE *fd
            size_t size
            int err

        with nogil:
            err = 0
            size = strlen(text) * sizeof(char)
            fd = fmemopen(text, size, 'r')
        if fd == NULL:
            printf('Failed to open memory stream for text - `%s`; size - %zu\n', text, size)
            return err
        err = self._parse_file(fd, size)
        fclose(fd)
        return err

    def parse_file(self, filename):
        error = self._parse_file_by_name(filename.encode('utf-8'))
        if error:
            raise ParseError(f'Couldnt parse config string without section or key-value in file `{filename}`.')

    def parse_files(self, filename_array: _t.Sequence):
        for filepath in list(filter(bool, filename_array))[::-1]:
            if os.path.exists(filepath):
                self.parse_file(filepath)

    def parse_text(self, text):
        if not text:
            return 
        error = self._parse_text(text.encode('utf-8'))
        if error:
            raise ParseError('Couldnt parse config string without section and key-value in text.')

    def all(self):
        return {
            key: self[key].all()
            for key in self
        }

    def generate_config_string(self):
        return ''.join([self[key].generate_section_string() for key in self])

    def __repr__(self):
        return repr(self.all())


cdef class Section(__BaseDict):
    cdef:
        str name
        ConfigParserC config
        dict __type_map

    def __init__(self, name, config, default=None, type_map=None):
        if isinstance(name, bytes):
            name = name.decode('utf-8')
        self.name = name
        self.config = config

        self.__type_map = {}
        prefix = 'type_'

        if hasattr(self, 'types_map') and self.types_map:
            self.__type_map.update(self.types_map)
        if type_map:
            self.__type_map.update(type_map)

        if default and isinstance(default, dict):
            super().__init__(default)
        else:
            super().__init__()

    def __repr__(self):
        return json.dumps(self.all())

    cdef __set_item_value(self, str key, object value):
        cdef:
            object format_string

        format_string = self.config.format_string
        key = format_string(key, self.name)
        if isinstance(value, dict) and not isinstance(value, Section):
            value = self.config.get_section_instance(self._get_subsection_name(key), value)
        elif isinstance(value, str):
            value = format_string(value, self.name)
        PyDict_SetItem(self, key, self.type_conversation(key, value))

    cdef object __get_item_value(self, str item):
        cdef:
            object value

        if item not in self:
            value = self.__get_default_value(item)
        else:
            value = <object>PyDict_GetItem(self, item)
            if isinstance(value, Section) and not value:
                value = self.__get_default_value(item)
        return self.type_conversation(item, value)

    def __setitem__(self, key, value):
        self.__set_item_value(key, value)

    def __getitem__(self, item):
        return self.__get_item_value(item)

    cdef str _get_subsection_name(self, str key):
        return self.name + '.' + key

    cdef dict __get_default_data(self):
        cdef:
            dict section_defaults
        section_defaults = self.config.section_defaults

        if section_defaults:
            return reduce(__get_dict_from_dict_for_reduce, self.name.split('.'), section_defaults)
        return {}

    cdef object __get_default_value(self, str item):
        cdef:
            dict section_defaults
            object value

        section_defaults = self.__get_default_data()

        if section_defaults and item in section_defaults:
            value = <object>PyDict_GetItem(section_defaults, item)

            if isinstance(value, dict):
                value = self.config.get_section_instance(self._get_subsection_name(item), section_defaults[item])

            return value
        return super(Section, self).__getitem__(item)

    def get_default_data(self):
        return self.__get_default_data()

    @property
    def subsections(self):
        return filter(__is_section, self.values())

    @property
    def subsections_names(self):
        return map(__get_section_subname, self.subsections)

    def get_name(self):
        return self.name

    def copy(self):
        return self.__class__(self.name, self.config, default=super().copy())

    def get(self, key, fallback = Empty()):
        try:
            return self[key]
        except KeyError:
            if not isinstance(fallback, Empty):
                return self.config.format_string(fallback)
            raise

    def all(self):
        data = dict()
        for key in self:
            value = self[key]
            data[self.key_handler_to_all(key)] = value.all() if isinstance(value, Section) else value
        return data

    def key_handler_to_all(self, key):
        return key

    cdef object get_type_conversation_instance(self, str key, object default=BaseType()):
        if PyDict_Contains(self.__type_map, key) == 1:
            return <object>PyDict_GetItem(self.__type_map, key)
        return getattr(self, 'type_'+key, default)

    cdef object type_conversation(self, str key, object value, BaseType conv_class=None):
        cdef BaseType conversation_cls

        if conv_class is not None:
            conversation_cls = conv_class
        else:
           conversation_cls = self.get_type_conversation_instance(key)
        if conversation_cls is not None:
            return conversation_cls(value)
        return value

    def generate_section_string(self):
        section_str = '[' + self.get_name() + ']\n'
        subs_names = list(self.subsections_names)

        for key in self.keys():
            if key not in subs_names:
                section_str += self.to_str(key) + '\n'

        section_str += '\n'
        for sub_name in subs_names:
            section_str += self[sub_name].generate_section_string()

        return section_str

    def to_str(self, key):
        conversation_class = self.get_type_conversation_instance(key)
        return f'{key} = {conversation_class.str_convert(self[key])}'\
            .replace('{', '{{')\
            .replace('}', '}}')

    def getboolean(self, option, fallback=None):
        return self.type_conversation(None, self.get(option, fallback), BoolType())

    def getint(self, option, fallback=None):
        value = self.get(option, str(fallback))
        return self.type_conversation(None, value, IntType())

    def getseconds(self, option, fallback=None):
        return self.type_conversation(None, self.get(option, str(fallback)), IntSecondsType())

    def getbytes(self, option, fallback=None):
        return self.type_conversation(None, self.get(option, str(fallback)), BytesSizeType())

    def getlist(self, option, fallback=None, separator=','):
        fallback = fallback or ''
        return self.type_conversation(None, self.get(option, fallback), ListType(separator))

    def getjson(self, option, fallback = None):
        return self.type_conversation(None, self.get(option, str(fallback)), JsonType())


class ConfigParser(BaseConfigParser):

    def read(self, filenames, encoding=None):
        if isinstance(filenames, (str, os.PathLike)):
            filenames = [filenames]
        read_ok = []
        for filename in filenames:
            data = get_file_value(filename, default='')
            if not data:
                continue
            self.read_string(data, filename)
            if isinstance(filename, os.PathLike):
                filename = os.fspath(filename)
            read_ok.append(filename)
        return read_ok

    def generate_config_string(self):
        fp = io.StringIO()
        self.write(fp)
        return fp.getvalue()


# Test used for get performance speed of config parser
# path - absolute path to test config file
# def test(path):
#     test_parser = ConfigParserC()
#     files_list = [path]
#     with open(files_list[0], 'r') as fd:
#         config_text = fd.read()
#     test_parser.parse_files(files_list)
#     test_parser.parse_text(config_text)
#
# def test2(path):
#     test_parser = ConfigParser()
#     files_list = [path]
#     with open(files_list[0], 'r') as fd:
#         config_text = fd.read()
#     test_parser.read(files_list)
#     test_parser.read_string(config_text)
