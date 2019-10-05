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


cdef dict __get_dict_from_dict_for_reduce(dict collect, str key):
    if PyDict_Contains(collect, key) == 1:
        return <dict>PyDict_GetItem(collect, key)
    return PyDict_New()


cdef class Empty:
    pass


cdef class ConfigParserException(Exception):
    pass


cdef class ParseError(ConfigParserException):
    pass


cdef class BaseType:
    def convert(self, value):
        return value

    def __call__(self, value):
        return self.convert(value)


cdef class StrType(BaseType):
    def convert(self, value):
        return str(value)


cdef class IntType(BaseType):
    def convert(self, value):
        replace = str.replace
        if not isinstance(value, str):
            value = str(value)
        value = replace(value, 'K', '0' * 3)
        value = replace(value, 'M', '0' * 6)
        value = replace(value, 'G', '0' * 9)
        return int(float(value))


cdef class BoolType(BaseType):
    def convert(self, value):
        replace = str.replace
        if isinstance(value, str):
            value = replace(value, 'False', '')
            value = replace(value, 'false', '')
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
            value = value,
        return tuple(value)


cdef class JsonType(BaseType):
    def convert(self, value):
        if not isinstance(value, str):
            value = json.dumps(value)
        return json.loads(value)


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
    pair_regex = re.compile(r"^(?P<key>(.+?))[\s]{0,}=[\s]{0,}(?P<value>(.*?))[\s]{0,}$", re.MULTILINE)

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

        subsections = filter(lambda x: isinstance(x, Section), section.values())
        subsections_names = map(lambda x: x.get_name().split('.')[-1], subsections)
        only_subsections = tuple(subsections_names) == tuple(section.keys())

        if (not section or only_subsections) and isinstance(section, dict) and item in self.section_defaults:
            section = section.copy()
            for key, value in self.section_defaults[item].copy().items():
                if key not in subsections_names:
                    section[key] = value

        return section

    def __setitem__(self, key, value):
        if isinstance(value, dict) and not isinstance(value, Section):
            value = self.get_section_class(key)(key, self, value)
        super().__setitem__(key, value)

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
        cdef:
            object dict_ptr
            unsigned long long section_name_len
            str section

        section_name_len = 0
        full_section_name = section_name
        dict_ptr = self
        get_section_instance = self.get_section_instance

        for section in section_name.split('.'):
            section_name_len += len(section)
            section_name_curr = full_section_name[:section_name_len]

            if PyDict_Contains(dict_ptr, section) == 0:
                PyDict_SetItem(dict_ptr, section, get_section_instance(section_name_curr))

            dict_ptr = <object>PyDict_GetItem(dict_ptr, section)
            section_name_len += 1

        return dict_ptr

    cdef int _parse_file(self, FILE *config_file, unsigned long long config_file_size):
        cdef:
            str section_name
            char *line
            size_t count
            object result
            Section current_section
        count = 0
        current_section = None
        strip = str.strip

        while config_file_size > ftell(config_file):
            line = NULL
            with nogil:
                if getline(&line, &count, config_file) == -1:
                    printf('Failed read line or end of file')
                    break
            if line[0] == b'#' or line[0] == b';' or not strip(line):
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
            unsigned long long size
            int err

        with nogil:
            err = 0
            size = strlen(text) * sizeof(char)
            fd = fmemopen(text, size, 'r')
        if fd == NULL:
            printf('Failed to open memory stream\n')
            return err
        err = self._parse_file(fd, size)
        fclose(fd)
        return err

    def parse_file(self, filename):
        error = self._parse_file_by_name(filename.encode('utf-8'))
        if error:
            raise ParseError('Couldnt parse config string without section and key-value in file `{}`.'.format(filename))

    def parse_files(self, filename_array: _t.Sequence):
        for filepath in list(filename_array)[::-1]:
            self.parse_file(filepath)

    def parse_text(self, text):
        error = self._parse_text(text.encode('utf-8'))
        if error:
            raise ParseError('Couldnt parse config string without section and key-value in text.')


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

    def _get_subsection_name(self, key):
        return self.name + '.' + key

    def __setitem__(self, key, value):
        format_string = self.config.format_string
        key = format_string(key, self.name)
        if isinstance(value, dict) and not isinstance(value, Section):
            value = self.config.get_section_instance(self._get_subsection_name(key), value)
        else:
            value = format_string(value, self.name)
        super().__setitem__(key, self.type_conversation(key, value))

    cdef dict __get_default_data(self):
        cdef:
            dict section_defaults
        section_defaults = self.config.section_defaults

        if section_defaults:
            return reduce(__get_dict_from_dict_for_reduce, self.name.split('.'), section_defaults)
        return {}

    def get_default_data(self):
        return self.__get_default_data()

    def __get_default_value(self, item):
        section_defaults = self.__get_default_data()
        if section_defaults and item in section_defaults:
            value = section_defaults[item]
            if isinstance(value, dict):
                value = self.config.get_section_instance(self._get_subsection_name(item), section_defaults)
            return value
        return super().__getitem__(item)

    def __getitem__(self, item):
        if item not in self:
            value = self.__get_default_value(item)
        else:
            value = super().__getitem__(item)
            if isinstance(value, Section) and not value:
                value = self.__get_default_value(item)
        return self.type_conversation(item, value)

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

    cdef object type_conversation(self, str key, object value, BaseType conv_class=None):
        cdef BaseType conversation_cls

        if conv_class is not None:
            conversation_cls = conv_class
        else:
            if PyDict_Contains(self.__type_map, key) == 1:
                conversation_cls = self.__type_map[key]
            else:
                conversation_cls = getattr(self, 'type_'+key, BaseType())
        return conversation_cls(value)

    def getboolean(self, option, fallback=None):
        return self.type_conversation(None, self.get(option, fallback), BoolType())

    def getint(self, option, fallback=None):
        value = self.get(option, str(fallback))
        return self.type_conversation(None, value, IntType())

    def getseconds(self, option, fallback=None):
        return self.type_conversation(None, self.get(option, str(fallback)), IntSecondsType())

    def getlist(self, option, fallback=None, separator=','):
        fallback = fallback or ''
        return self.type_conversation(None, self.get(option, fallback), ListType(separator))

    def getjson(self, option, fallback = None):
        return self.type_conversation(None, self.get(option, str(fallback)), JsonType())

    def __str__(self):
        return json.dumps(self.all())


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
