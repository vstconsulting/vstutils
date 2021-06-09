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
        return yaml.dump(obj, Dumper=Dumper).encode('latin-1')

    def loads(self, data):
        return yaml.load(data.decode('latin-1'), Loader=Loader)  # nosec
