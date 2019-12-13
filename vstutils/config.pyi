import typing as _t

JsonBaseType = _t.Union[_t.Text, _t.SupportsInt, _t.SupportsFloat, _t.List, _t.Dict]

class BaseType:
    def convert(self, value: _t.Any) -> _t.Any:
        ...

    def __call__(self, value: _t.Any):
        return self.convert(value)

class StrType(BaseType):
    def convert(self, value: _t.Any) -> _t.Text:
        ...

class IntType(BaseType):
    def convert(self, value: _t.Any) -> _t.SupportsInt:
        ...

class BytesSizeType(BaseType):
    def convert(self, value: _t.Any) -> _t.SupportsInt:
        ...

class BoolType(BaseType):
    def convert(self, value: _t.Any) -> bool:
        ...

class IntSecondsType(BaseType):
    def convert(self, value: _t.Any) -> _t.SupportsInt:
        ...

class ListType(BaseType):
    def convert(self, value: _t.Any) -> _t.List:
        ...

class JsonType(BaseType):
    def convert(self, value: _t.Any) -> JsonBaseType:
        ...

class __BaseDict(_t.Dict):
    def all(self) -> _t.Dict:
        ...

class Section(__BaseDict):
    subsections: _t.Generator
    subsections_names: _t.Generator

    def __init__(self, name: _t.Text, config: ConfigParserC, default: _t.Dict = None, type_map: _t.Dict = None):
        super().__init__()

    def get_default_data(self) -> _t.Dict:
        ...
    def get_name(self) -> _t.Text:
        ...
    def key_handler_to_all(self, key: _t.Text) -> _t.Any:
        ...
    def generate_section_string(self) -> _t.Text:
        ...
    def to_str(self, key: _t.Text) -> _t.Text:
        ...
    def getboolean(self, option, fallback=None) -> bool:
        ...
    def getint(self, option, fallback=None) -> _t.SupportsInt:
        ...
    def getseconds(self, option, fallback=None) -> _t.SupportsInt:
        ...
    def getbytes(self, option, fallback=None) -> _t.SupportsInt:
        ...
    def getlist(self, option, fallback=None, separator=',') -> _t.List:
        ...
    def getjson(self, option, fallback = None) -> JsonBaseType:
        ...

class ConfigParserC(__BaseDict):
    section_defaults: _t.Dict
    __sections_map: _t.Dict
    __format_kwargs: _t.Dict

    def __init__(self, section_overload: _t.Dict = None, section_defaults: _t.Dict = None, format_kwargs: _t.Dict = None):
        super().__init__()

    def parse_files(self, filename_array: _t.Sequence) -> _t.NoReturn:
        ...
    def parse_file(self, filename: _t.Text):
        ...
    def parse_text(self, text: _t.Text) -> _t.NoReturn:
        ...
    def format_string(self, value, section_name=None) -> _t.Union[_t.Text, _t.Any]:
        ...
    def get_section_instance(self, section_name: _t.Text, *args, **kwargs):
        ...
    def get_section_class(self, section_name: _t.Text):
        ...
    def _add_section(self, section_name: _t.Text) -> Section:
        ...
