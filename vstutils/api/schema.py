from collections import OrderedDict
from drf_yasg.inspectors.base import FieldInspector, NotHandled
from drf_yasg.inspectors import SwaggerAutoSchema, swagger_settings
from drf_yasg import openapi
from . import fields

# Extra types

# Extra formats
FORMAT_FILE = openapi.TYPE_FILE
FORMAT_SECRET_FILE = 'secretfile'
FORMAT_AUTOCOMPLETE = 'autocomplete'

# Base types
basic_type_info = OrderedDict()
basic_type_info[fields.FileInStringField] = dict(
    type=openapi.TYPE_STRING, format=FORMAT_FILE
)
basic_type_info[fields.SecretFileInString] = dict(
    type=openapi.TYPE_STRING, format=FORMAT_SECRET_FILE
)
basic_type_info[fields.AutoCompletionField] = dict(
    type=openapi.TYPE_STRING, format=FORMAT_AUTOCOMPLETE
)


class VSTFieldInspector(FieldInspector):
    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        # pylint: disable=invalid-name,unused-variable
        type_info = basic_type_info.get(field.__class__, None)
        if type_info is None:
            return NotHandled

        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )
        kwargs = dict(**type_info)
        if type_info.get('format', None) == FORMAT_AUTOCOMPLETE:
            kwargs['enum'] = openapi.SchemaRef(
                self.components.with_scope(openapi.SCHEMA_DEFINITIONS),
                field.autocomplete, ignore_unresolved=True
            )

        return SwaggerType(**kwargs)


class VSTAutoSchema(SwaggerAutoSchema):
    field_inspectors = [
        VSTFieldInspector,
    ] + swagger_settings.DEFAULT_FIELD_INSPECTORS

    def get_operation_id(self, operation_keys):
        new_operation_keys = []
        for key in operation_keys:
            previous = None if not len(new_operation_keys) else new_operation_keys[-1]
            new_operation_keys.append(key.replace('{}_'.format(previous), ''))
        return super(VSTAutoSchema, self).get_operation_id(tuple(new_operation_keys))
