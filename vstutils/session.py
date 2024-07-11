import ormsgpack
import yaml


Dumper = getattr(yaml, 'CSafeDumper', yaml.SafeDumper)
Loader = getattr(yaml, 'CSafeLoader', yaml.SafeLoader)


class YamlSessionSerializer:
    """
    Simple wrapper around json and yaml to be used in signing.dumps and
    signing.loads.
    """
    __slots__ = ()

    def dumps(self, obj):
        return yaml.dump(obj, Dumper=Dumper).encode('latin-1')  # nocv

    def loads(self, data):  # nocv
        return yaml.load(data.decode('latin-1'), Loader=Loader)  # nosec


class MsgpackSessionSerializer:
    __slots__ = ()
    options = (
        ormsgpack.OPT_SERIALIZE_PYDANTIC |
        ormsgpack.OPT_NON_STR_KEYS |
        ormsgpack.OPT_PASSTHROUGH_TUPLE |
        ormsgpack.OPT_PASSTHROUGH_BIG_INT |
        ormsgpack.OPT_PASSTHROUGH_SUBCLASS |
        ormsgpack.OPT_PASSTHROUGH_DATETIME
    )

    def dumps(self, obj):
        return ormsgpack.packb(obj, option=self.options)

    def loads(self, data):
        return ormsgpack.unpackb(data, option=ormsgpack.OPT_NON_STR_KEYS)
