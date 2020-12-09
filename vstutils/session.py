import yaml


class YamlSessionSerializer:
    """
    Simple wrapper around json and yaml to be used in signing.dumps and
    signing.loads.
    """

    def dumps(self, obj):
        return yaml.dump(obj, Dumper=getattr(yaml, 'CSafeDumper', yaml.SafeDumper)).encode('latin-1')

    def loads(self, data):
        return yaml.load(data.decode('latin-1'), Loader=getattr(yaml, 'CSafeLoader', yaml.SafeLoader))
