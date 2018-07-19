from collections import OrderedDict
from rest_framework import status
from drf_yasg.inspectors.base import FieldInspector, NotHandled
from drf_yasg.inspectors import SwaggerAutoSchema, swagger_settings
from drf_yasg import openapi, utils
from . import fields, serializers

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

    def get_response_schemas(self, response_serializers):
        responses = super(VSTAutoSchema, self).get_response_schemas(response_serializers)
        error_serializer = utils.force_serializer_instance(serializers.ErrorSerializer)
        responses[status.HTTP_400_BAD_REQUEST] = openapi.Response(
            description='Validation error or some data error',
            schema=self.serializer_to_schema(error_serializer),
        )
        responses[status.HTTP_404_NOT_FOUND] = openapi.Response(
            description='Not found error.',
            schema=self.serializer_to_schema(error_serializer),
        )
        responses[status.HTTP_403_FORBIDDEN] = openapi.Response(
            description='Permission denied error.',
            schema=self.serializer_to_schema(error_serializer),
        )
        responses[status.HTTP_401_UNAUTHORIZED] = openapi.Response(
            description='Unauthorized access error.',
            schema=self.serializer_to_schema(error_serializer),
        )
        return responses
