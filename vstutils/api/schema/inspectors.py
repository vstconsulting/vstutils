from typing import Dict, Type, Text, Any
from collections import OrderedDict

from django.http import FileResponse
from drf_yasg.inspectors.base import FieldInspector, NotHandled
from drf_yasg.inspectors.field import ReferencingSerializerInspector
from drf_yasg import openapi
from drf_yasg.inspectors.query import CoreAPICompatInspector
from rest_framework.fields import Field, JSONField

from .. import fields, serializers, validators
from ...models.base import get_first_match_name


# Extra types

# Extra formats
FORMAT_FILE = openapi.TYPE_FILE
FORMAT_SECRET_FILE = 'secretfile'
FORMAT_BIN_FILE = 'binfile'
FORMAT_NAMED_BIN_FILE = 'namedbinfile'
FORMAT_NAMED_BIN_IMAGE = 'namedbinimage'
FORMAT_MULTIPLE_NAMED_BIN_FILE = 'multiplenamedbinfile'
FORMAT_MULTIPLE_NAMED_BIN_IMAGE = 'multiplenamedbinimage'
FORMAT_AUTOCOMPLETE = 'autocomplete'
FORMAT_FK_AUTOCOMPLETE = 'fk_autocomplete'
FORMAT_MULTISELECT = 'multiselect'
FORMAT_HTML = 'html'
FORMAT_JSON = 'json'
FORMAT_TEXTAREA = 'textarea'
FORMAT_DYN = 'dynamic'
FORMAT_DYN_FK = 'dynamic_fk'
FORMAT_FK = 'fk'
FORMAT_UPTIME = 'uptime'
FORMAT_RELATED_LIST = 'related_list'
FORMAT_RATING = 'rating'


# Base types
basic_type_info: Dict[Type[Field], Dict[Text, Any]] = OrderedDict()
basic_type_info[fields.FileInStringField] = {
    'type': openapi.TYPE_STRING,
    'format': FORMAT_FILE
}
basic_type_info[fields.SecretFileInString] = {
    'type': openapi.TYPE_STRING,
    'format': FORMAT_SECRET_FILE
}
basic_type_info[fields.BinFileInStringField] = {
    'type': openapi.TYPE_STRING,
    'format': FORMAT_BIN_FILE
}
basic_type_info[fields.NamedBinaryFileInJsonField] = {
    'type': openapi.TYPE_STRING,
    'format': FORMAT_NAMED_BIN_FILE
}
basic_type_info[fields.MultipleNamedBinaryFileInJsonField] = {
    'type': openapi.TYPE_STRING,
    'format': FORMAT_MULTIPLE_NAMED_BIN_FILE
}
basic_type_info[fields.HtmlField] = {
    'type': openapi.TYPE_STRING,
    'format': FORMAT_HTML
}
basic_type_info[serializers.JsonObjectSerializer] = {
    'type': openapi.TYPE_OBJECT,
    'format': FORMAT_JSON
}
basic_type_info[JSONField] = {
    'type': openapi.TYPE_STRING,
    'format': FORMAT_JSON
}
basic_type_info[fields.TextareaField] = {
    'type': openapi.TYPE_STRING,
    'format': FORMAT_TEXTAREA
}
basic_type_info[fields.UptimeField] = {
    'type': openapi.TYPE_INTEGER,
    'format': FORMAT_UPTIME
}
basic_type_info[fields.RedirectIntegerField] = {
    'type': openapi.TYPE_INTEGER
}
basic_type_info[fields.RedirectCharField] = {
    'type': openapi.TYPE_STRING
}
basic_type_info[fields.PasswordField] = {
    'type': openapi.TYPE_STRING,
    'format': openapi.FORMAT_PASSWORD
}


def field_have_redirect(field, **kwargs):
    if not getattr(field, 'redirect', False):
        return kwargs

    if kwargs.get('additionalProperties', None) is None:
        kwargs['additionalProperties'] = {}
    kwargs['additionalProperties']['redirect'] = True

    return kwargs


def field_extra_handler(field, **kwargs):
    kwargs = field_have_redirect(field, **kwargs)
    return kwargs


def _get_handled_props(group_mapping):
    for group_name, props in (group_mapping or {}).items():
        if group_name == '':
            continue
        yield from props


class VSTFieldInspector(FieldInspector):
    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        # pylint: disable=invalid-name,unused-variable
        type_info = basic_type_info.get(field.__class__, None)
        if type_info is None:
            return NotHandled

        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )
        return SwaggerType(**field_extra_handler(field, **type_info))


class AutoCompletionFieldInspector(FieldInspector):
    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        # pylint: disable=invalid-name
        if not isinstance(field, fields.AutoCompletionField):
            return NotHandled

        SwaggerType, _ = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )
        kwargs = {
            'type': openapi.TYPE_STRING,
            'format': FORMAT_AUTOCOMPLETE
        }
        if isinstance(field.autocomplete, (list, tuple)):
            kwargs['enum'] = list(field.autocomplete)
        else:
            kwargs['format'] = FORMAT_FK_AUTOCOMPLETE
            kwargs['additionalProperties'] = {
                'model': openapi.SchemaRef(
                    self.components.with_scope(openapi.SCHEMA_DEFINITIONS),
                    field.autocomplete, ignore_unresolved=True
                ),
                'value_field': field.autocomplete_property,
                'view_field': field.autocomplete_represent
            }

        return SwaggerType(**field_extra_handler(field, **kwargs))


class DynamicJsonTypeFieldInspector(FieldInspector):
    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        # pylint: disable=unused-variable,invalid-name
        if not isinstance(field, fields.DynamicJsonTypeField):
            return NotHandled

        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )
        additionalProperties = {'field': field.field}

        if isinstance(field, fields.DependFromFkField):
            field_format = FORMAT_DYN_FK
            additionalProperties['field_attribute'] = field.field_attribute

        else:
            field_format = FORMAT_DYN
            additionalProperties['choices'] = field.choices
            additionalProperties['types'] = field.types

        kwargs = {
            'type': openapi.TYPE_STRING,
            'format': field_format,
            'additionalProperties': additionalProperties
        }

        return SwaggerType(**field_extra_handler(field, **kwargs))


class FkFieldInspector(FieldInspector):
    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        # pylint: disable=unused-variable,invalid-name
        if not isinstance(field, fields.FkField):
            return NotHandled

        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )
        kwargs = {
            'type': openapi.TYPE_INTEGER,
            'format': FORMAT_FK,
            'additionalProperties': {
                'model': openapi.SchemaRef(
                    self.components.with_scope(openapi.SCHEMA_DEFINITIONS),
                    field.select_model, ignore_unresolved=True
                ),
                'value_field': field.autocomplete_property,
                'view_field': field.autocomplete_represent,
                'usePrefetch': field.use_prefetch,
                'makeLink': field.make_link,
                'dependence': field.dependence,
            }
        }

        return SwaggerType(**field_extra_handler(field, **kwargs))


class CommaMultiSelectFieldInspector(FieldInspector):
    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        # pylint: disable=unused-variable,invalid-name
        if not isinstance(field, fields.CommaMultiSelect):
            return NotHandled

        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )
        kwargs = {
            'type': openapi.TYPE_STRING,
            'format': FORMAT_MULTISELECT,
            'additionalProperties': {
                'model': openapi.SchemaRef(
                    self.components.with_scope(openapi.SCHEMA_DEFINITIONS),
                    field.select_model, ignore_unresolved=True
                ),
                'value_field': field.select_property,
                'view_field': field.select_represent,
                'view_separator': field.select_separator,
                'usePrefetch': field.use_prefetch,
                'makeLink': field.make_link,
                'dependence': field.dependence,
            }
        }

        return SwaggerType(**field_extra_handler(field, **kwargs))


class RelatedListFieldInspector(FieldInspector):
    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        # pylint: disable=unused-variable,invalid-name
        if not isinstance(field, fields.RelatedListField):
            return NotHandled

        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )
        kwargs = {
            'type': openapi.TYPE_STRING,
            'format': FORMAT_RELATED_LIST,
            'additionalProperties': {
                'fields': field.fields,
                'viewType': field.view_type,
            }
        }

        return SwaggerType(**field_extra_handler(field, **kwargs))


class RatingFieldInspector(FieldInspector):
    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        # pylint: disable=unused-variable,invalid-name
        if not isinstance(field, fields.RatingField):
            return NotHandled

        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )
        kwargs = {
            'type': openapi.TYPE_NUMBER,
            'format': FORMAT_RATING,
            'additionalProperties': {
                'min_value': field.min_value,
                'max_value': field.max_value,
                'step': field.step,
                'style': field.front_style,
                'color': field.color,
                'fa_class': field.fa_class
            }
        }
        return SwaggerType(**field_extra_handler(field, **kwargs))


class NamedBinaryImageInJsonFieldInspector(FieldInspector):
    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        # pylint: disable=unused-variable,invalid-name
        if isinstance(field, fields.NamedBinaryImageInJsonField):
            img_format = FORMAT_NAMED_BIN_IMAGE
        elif isinstance(field, fields.MultipleNamedBinaryImageInJsonField):
            img_format = FORMAT_MULTIPLE_NAMED_BIN_IMAGE
        else:
            return NotHandled

        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )
        kwargs = {
            'type': openapi.TYPE_STRING,
            'format': img_format,
            'additionalProperties': {},
        }
        for validator in field.validators:
            if isinstance(validator, validators.ImageResolutionValidator):
                kwargs['additionalProperties'].update(
                    {
                        'min_width': validator.min_width,
                        'max_width': validator.max_width,
                        'min_height': validator.min_height,
                        'max_height': validator.max_height,
                        'extensions': validator.extensions
                    }
                )

        return SwaggerType(**field_extra_handler(field, **kwargs))


class NestedFilterInspector(CoreAPICompatInspector):
    def get_filter_parameters(self, filter_backend):  # nocv
        subaction_list_actions = [
            f'{name}_list'
            for name in getattr(self.view, '_nested_args', {}).keys()
        ]
        if self.view.action not in subaction_list_actions:
            return NotHandled
        if self.method != 'GET':
            return NotHandled
        nested_view = getattr(self.view, self.view.action, None)
        nested_view_filter_class = getattr(nested_view, '_nested_filter_class', None)
        filter_class = getattr(self.view, 'filterset_class', getattr(self.view, 'filter_class', None))
        self.view.filter_class = nested_view_filter_class
        result = super().get_filter_parameters(filter_backend)
        self.view.filter_class = filter_class
        return result


class VSTReferencingSerializerInspector(ReferencingSerializerInspector):
    def field_to_swagger_object(self, field: Any, swagger_object_type: Any, use_references: Any, **kwargs: Any):
        if isinstance(field, FileResponse):
            schema = openapi.Schema(type='file')
            return schema

        result = super().field_to_swagger_object(field, swagger_object_type, use_references, **kwargs)

        if result != NotHandled:
            schema = self.components.with_scope(openapi.SCHEMA_DEFINITIONS)[self.get_serializer_ref_name(field)]
            schema_properties = tuple(schema['properties'].keys())
            serializer_class = schema._NP_serializer  # pylint: disable=protected-access

            non_bulk_methods = getattr(serializer_class, '_non_bulk_methods', None)
            schema_properties_groups = OrderedDict(
                getattr(serializer_class, '_schema_properties_groups', None) or {'': schema_properties}
            )
            view_field_name = getattr(serializer_class, '_view_field_name', None)
            if view_field_name is None and schema_properties:
                view_field_name = get_first_match_name(schema_properties, schema_properties[0])

            if schema_properties_groups:
                not_handled = set(schema['properties']) - set(_get_handled_props(schema_properties_groups))
                if not_handled:
                    schema_properties_groups[''] = [
                        prop
                        for prop in schema['properties']
                        if prop in not_handled
                    ]
            schema['x-properties-groups'] = schema_properties_groups
            schema['x-view-field-name'] = view_field_name
            if non_bulk_methods:
                schema['x-non-bulk-methods'] = non_bulk_methods
        return result
