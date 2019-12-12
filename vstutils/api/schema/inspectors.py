from collections import OrderedDict
from drf_yasg.inspectors.base import FieldInspector, NotHandled
from drf_yasg import openapi
from drf_yasg.inspectors import CoreAPICompatInspector
from .. import fields, serializers


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
FORMAT_MULTISELECT = 'multiselect'
FORMAT_HTML = 'html'
FORMAT_JSON = 'json'
FORMAT_TEXTAREA = 'textarea'
FORMAT_DYN = 'dynamic'
FORMAT_FK = 'fk'
FORMAT_UPTIME = 'uptime'


# Base types
basic_type_info = OrderedDict()
basic_type_info[fields.FileInStringField] = dict(
    type=openapi.TYPE_STRING, format=FORMAT_FILE
)
basic_type_info[fields.SecretFileInString] = dict(
    type=openapi.TYPE_STRING, format=FORMAT_SECRET_FILE
)
basic_type_info[fields.BinFileInStringField] = dict(
    type=openapi.TYPE_STRING, format=FORMAT_BIN_FILE
)
basic_type_info[fields.NamedBinaryFileInJsonField] = dict(
    type=openapi.TYPE_STRING, format=FORMAT_NAMED_BIN_FILE
)
basic_type_info[fields.NamedBinaryImageInJsonField] = dict(
    type=openapi.TYPE_STRING, format=FORMAT_NAMED_BIN_IMAGE
)
basic_type_info[fields.MultipleNamedBinaryFileInJsonField] = dict(
    type=openapi.TYPE_STRING, format=FORMAT_MULTIPLE_NAMED_BIN_FILE
)
basic_type_info[fields.MultipleNamedBinaryImageInJsonField] = dict(
    type=openapi.TYPE_STRING, format=FORMAT_MULTIPLE_NAMED_BIN_IMAGE
)
basic_type_info[fields.HtmlField] = dict(
    type=openapi.TYPE_STRING, format=FORMAT_HTML
)
basic_type_info[serializers.JsonObjectSerializer] = dict(
    type=openapi.TYPE_OBJECT, format=FORMAT_JSON
)
basic_type_info[fields.TextareaField] = dict(
    type=openapi.TYPE_STRING, format=FORMAT_TEXTAREA
)
basic_type_info[fields.UptimeField] = dict(
    type=openapi.TYPE_INTEGER, format=FORMAT_UPTIME
)
basic_type_info[fields.RedirectIntegerField] = dict(
    type=openapi.TYPE_INTEGER
)
basic_type_info[fields.RedirectCharField] = dict(
    type=openapi.TYPE_STRING
)


def field_have_redirect(field, **kwargs):
    if not getattr(field, 'redirect', False):
        return kwargs

    if kwargs.get('additionalProperties', None) is None:
        kwargs['additionalProperties'] = dict()
    kwargs['additionalProperties']['redirect'] = True

    return kwargs


def field_extra_handler(field, **kwargs):
    kwargs = field_have_redirect(field, **kwargs)
    return kwargs


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
        # pylint: disable=unused-variable,invalid-name
        if not isinstance(field, fields.AutoCompletionField):
            return NotHandled

        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )
        kwargs = dict(type=openapi.TYPE_STRING, format=FORMAT_AUTOCOMPLETE)
        if isinstance(field.autocomplete, (list, tuple)):
            kwargs['enum'] = list(field.autocomplete)
        else:
            prop = dict(
                model=openapi.SchemaRef(
                    self.components.with_scope(openapi.SCHEMA_DEFINITIONS),
                    field.autocomplete, ignore_unresolved=True
                ),
                value_field=field.autocomplete_property,
                view_field=field.autocomplete_represent
            )
            kwargs['additionalProperties'] = prop

        return SwaggerType(**field_extra_handler(field, **kwargs))


class DependEnumFieldInspector(FieldInspector):
    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        # pylint: disable=unused-variable,invalid-name
        if not isinstance(field, fields.DependEnumField):
            return NotHandled

        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )
        kwargs = dict(type=openapi.TYPE_STRING, format=FORMAT_DYN)
        kwargs['additionalProperties'] = dict(
            field=field.field, choices=field.choices, types=field.types
        )

        return SwaggerType(**field_extra_handler(field, **kwargs))


class FkFieldInspector(FieldInspector):  # nocv
    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        # pylint: disable=unused-variable,invalid-name
        if not isinstance(field, fields.FkField):
            return NotHandled

        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )
        kwargs = dict(type=openapi.TYPE_INTEGER, format=FORMAT_FK)
        kwargs['additionalProperties'] = dict(
            model=openapi.SchemaRef(
                self.components.with_scope(openapi.SCHEMA_DEFINITIONS),
                field.select_model, ignore_unresolved=True
            ),
            value_field=field.autocomplete_property,
            view_field=field.autocomplete_represent
        )

        return SwaggerType(**field_extra_handler(field, **kwargs))


class CommaMultiSelectFieldInspector(FieldInspector):
    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        # pylint: disable=unused-variable,invalid-name
        if not isinstance(field, fields.CommaMultiSelect):
            return NotHandled

        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )
        kwargs = dict(type=openapi.TYPE_STRING, format=FORMAT_MULTISELECT)
        kwargs['additionalProperties'] = dict(
            model=openapi.SchemaRef(
                self.components.with_scope(openapi.SCHEMA_DEFINITIONS),
                field.select_model, ignore_unresolved=True
            ),
            value_field=field.select_property,
            view_field=field.select_represent,
            view_separator=field.select_separator
        )

        return SwaggerType(**field_extra_handler(field, **kwargs))


class NestedFilterInspector(CoreAPICompatInspector):
    def get_filter_parameters(self, filter_backend):  # nocv
        subaction_list_actions = [
            '{}_list'.format(name)
            for name in getattr(self.view, '_nested_args', {}).keys()
        ]
        if self.view.action not in subaction_list_actions:
            return NotHandled
        if self.method != 'GET':
            return NotHandled
        nested_view = getattr(self.view, self.view.action, None)
        nested_view_filter_class = getattr(nested_view, '_nested_filter_class', None)
        filter_class = getattr(self.view, 'filter_class', None)
        self.view.filter_class = nested_view_filter_class
        result = super().get_filter_parameters(filter_backend)
        self.view.filter_class = filter_class
        return result
