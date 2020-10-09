from rest_framework.metadata import SimpleMetadata

from . import fields, serializers


class VSTMetadata(SimpleMetadata):
    label_lookup = SimpleMetadata.label_lookup
    origin_mapping = SimpleMetadata.label_lookup.mapping
    mapping_fields = {
        fields.FileInStringField: 'file',
        fields.SecretFileInString: 'secretfile',
        fields.AutoCompletionField: 'autocomplete',
        serializers.JsonObjectSerializer: 'json',
        fields.DependEnumField: 'dynamic',
        fields.HtmlField: 'html',
    }
    label_lookup.mapping.update(mapping_fields)
