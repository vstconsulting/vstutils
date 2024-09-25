from copy import deepcopy
from typing import Dict, Type, Text, Any, Union, Set
from collections import OrderedDict

from django.http import FileResponse
from drf_yasg.inspectors.base import FieldInspector, FilterInspector, NotHandled
from drf_yasg.inspectors.field import ReferencingSerializerInspector, decimal_field_type, find_limits
from drf_yasg.inspectors.query import DrfAPICompatInspector, force_real_str  # type: ignore
from drf_yasg import openapi
from rest_framework.fields import Field, JSONField, DecimalField, ListField, empty
from rest_framework.serializers import Serializer, ListSerializer

from .. import fields, serializers, validators, base as api_base
from ...models.base import get_first_match_name
from ...utils import raise_context_decorator_with_default

# Extra types

# Extra formats
FORMAT_FILE = openapi.TYPE_FILE
FORMAT_SECRET_FILE = 'secretfile'  # nosec
FORMAT_BIN_FILE = 'binfile'
FORMAT_CSV_FILE = 'csvfile'
FORMAT_NAMED_BIN_FILE = 'namedbinfile'
FORMAT_NAMED_BIN_IMAGE = 'namedbinimage'
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
FORMAT_PHONE = 'phone'
FORMAT_MASKED = 'masked'
FORMAT_DEEP_FK = 'deep_fk'
FORMAT_WYSIWYG = 'wysiwyg'
FORMAT_CRONTAB = 'crontab'
FORMAT_QRCODE = 'qrcode'
FORMAT_BARCODE128 = 'barcode128'
FORMAT_CHECKBOX = 'checkbox'
FORMAT_PLUSMINUS = 'plusminus'

X_OPTIONS = 'x-options'


# Base types
basic_type_info: Dict[Type[Field], Dict[Text, Any]] = OrderedDict()

basic_type_info[fields.HtmlField] = {
    'type': openapi.TYPE_STRING,
    'format': FORMAT_HTML
}
basic_type_info[serializers.JsonObjectSerializer] = {
    'type': openapi.TYPE_OBJECT,
    'additionalProperties': True,
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
basic_type_info[fields.PhoneField] = {
    'type': openapi.TYPE_STRING,
    'format': FORMAT_PHONE,
}
basic_type_info[fields.WYSIWYGField] = {
    'type': openapi.TYPE_STRING,
    'format': FORMAT_WYSIWYG,
}
basic_type_info[fields.CrontabField] = {
    'type': openapi.TYPE_STRING,
    'format': FORMAT_CRONTAB,
}
basic_type_info[fields.QrCodeField] = {
    'type': openapi.TYPE_STRING,
    'format': FORMAT_QRCODE,
}
basic_type_info[fields.Barcode128Field] = {
    'type': openapi.TYPE_STRING,
    'format': FORMAT_BARCODE128,
}
basic_type_info[fields.CheckboxBooleanField] = {
    'type': openapi.TYPE_BOOLEAN,
    'format': FORMAT_CHECKBOX,
}
basic_type_info[fields.PlusMinusIntegerField] = {
    'type': openapi.TYPE_INTEGER,
    'format': FORMAT_PLUSMINUS,
}


@raise_context_decorator_with_default(verbose=False, default=None)
def get_fk_component_field_type(field, components):
    return components.get(
        field.select_model, openapi.SCHEMA_DEFINITIONS
    )['properties'][field.autocomplete_property]['type']


def field_have_redirect(field, **kwargs):
    if not getattr(field, 'redirect', False):
        return kwargs

    if kwargs.get(X_OPTIONS, None) is None:
        kwargs[X_OPTIONS] = {}
    operation_name = getattr(field, 'operation_name', None)
    if operation_name is None:
        operation_name = field.field_name
        splitted_operation_name = operation_name.split('_')
        if len(tuple(filter(bool, splitted_operation_name))) > 1:
            operation_name = '_'.join(splitted_operation_name[:-1])
    kwargs[X_OPTIONS]['redirect'] = {
        'operation_name': operation_name,
        'depend_field': getattr(field, 'depend_field', None),
        'concat_field_name': getattr(field, 'concat_field_name', False),
    }

    return kwargs


# Some fields must be ignored from limits because actual data they represent doesn't
# match field type they extend. For example when field extends CharField but actually
# represent object or array.
IGNORED_LIMITS = (
    # Actually object or array
    fields.NamedBinaryFileInJsonField,
    # Can be any type
    fields.DynamicJsonTypeField,
)


def field_extra_handler(field, **kwargs):
    kwargs = field_have_redirect(field, **kwargs)
    if kwargs['type'] in (openapi.TYPE_ARRAY, openapi.TYPE_OBJECT):
        kwargs['title'] = force_real_str(field.label) if field.label else None

    if not isinstance(field, IGNORED_LIMITS):
        # Get limits from field e.g min_length, minimum
        kwargs.update(find_limits(field))

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
        return SwaggerType(**field_extra_handler(field, **deepcopy(type_info)))


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
            kwargs[X_OPTIONS] = {
                'model': openapi.SchemaRef(
                    self.components.with_scope(openapi.SCHEMA_DEFINITIONS),
                    field.autocomplete, ignore_unresolved=True
                ),
                'value_field': field.autocomplete_property,
                'view_field': field.autocomplete_represent,
                'usePrefetch': field.use_prefetch,
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
        options = {'field': field.field}

        if isinstance(field, fields.DependFromFkField):
            field_format = FORMAT_DYN_FK
            options['field_attribute'] = field.field_attribute
        else:
            field_format = FORMAT_DYN
            if field.source_view:
                options['source_view'] = field.source_view
            options['choices'] = field.choices

        options['types'] = {}
        for name, field_type in field.types.items():
            if isinstance(field_type, Field):
                field_type = self.probe_field_inspectors(field_type, swagger_object_type, False)
            options['types'][name] = field_type

        kwargs = {
            'type': openapi.TYPE_STRING,
            'format': field_format,
            X_OPTIONS: options
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

        field_format = FORMAT_FK
        in_ = kw.get('in_')
        options = {
            'model': openapi.SchemaRef(
                self.components.with_scope(openapi.SCHEMA_DEFINITIONS),
                field.select_model, ignore_unresolved=True
            ),
            'value_field': field.autocomplete_property,
            'view_field': field.autocomplete_represent,
            'usePrefetch': field.use_prefetch if in_ != 'query' else False,
            'makeLink': field.make_link if in_ != 'query' else False,
            'dependence': field.dependence,
            'filters': field.filters,
        }

        if isinstance(field, fields.DeepFkField):
            field_format = FORMAT_DEEP_FK
            options = {
                **options,
                'only_last_child': field.only_last_child,
                'parent_field_name': field.parent_field_name,
            }
            del options['dependence']

        field_type = openapi.TYPE_STRING
        if field.field_type.__name__ == '<lambda>':
            field_type = get_fk_component_field_type(field, self.components)
            if field_type is None:
                if field.autocomplete_property in {'id', 'pk'}:
                    field_type = openapi.TYPE_INTEGER
                else:
                    field_type = openapi.TYPE_STRING
        elif field.field_type is int:
            field_type = openapi.TYPE_INTEGER

        kwargs = {
            'type': field_type,
            'format': field_format,
            X_OPTIONS: options,
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
            'type': 'array',
            'x-collectionFormat': 'csv',
            X_OPTIONS: {
                'viewSeparator': field.select_separator,
            },
            'items': {
                "type": openapi.TYPE_INTEGER,
                "format": FORMAT_FK,
                X_OPTIONS: {
                    'model': openapi.SchemaRef(
                        self.components.with_scope(openapi.SCHEMA_DEFINITIONS),
                        field.select_model,
                        ignore_unresolved=True,
                    ),
                    "value_field": field.select_property,
                    "view_field": field.select_represent,
                    'usePrefetch': field.use_prefetch,
                    'makeLink': field.make_link,
                    'dependence': field.dependence,
                },
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
        serializer_schema = VSTReferencingSerializerInspector(
            self.view,
            self.path,
            self.method,
            self.components,
            self.request,
            self.field_inspectors
        ).field_to_swagger_object(field.serializer_class(), swagger_object_type, False, **kw)

        kwargs = {
            'type': openapi.TYPE_ARRAY,
            'x-format': field.view_type,
            'items': serializer_schema,
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
            X_OPTIONS: {
                'step': field.step,
                'style': field.front_style,
                'color': field.color,
                'fa_class': field.fa_class
            }
        }
        return SwaggerType(**field_extra_handler(field, **kwargs))


class NamedBinaryImageInJsonFieldInspector(FieldInspector):
    default_schema_data: Dict[str, Union[str, Dict[str, openapi.Schema], int]] = {
        'type': openapi.TYPE_OBJECT,
        'x-format': FORMAT_NAMED_BIN_FILE,
        'properties': {
            k: openapi.Schema(
                type=openapi.TYPE_STRING,
                default=v,
                x_nullable=v is None,
            )
            for k, v in fields.DEFAULT_NAMED_FILE_DATA.items()
        },
    }

    default_multiple_schema_data = {
        'type': openapi.TYPE_ARRAY,
        'items': openapi.Items(**default_schema_data),  # type: ignore
    }

    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        # pylint: disable=unused-variable,invalid-name,too-many-nested-blocks,too-many-branches
        if isinstance(field, fields.MultipleNamedBinaryFileInJsonField):
            kwargs = deepcopy(self.default_multiple_schema_data)
            items = kwargs['items']
        elif isinstance(field, fields.NamedBinaryFileInJsonField):
            kwargs = items = deepcopy(self.default_schema_data)
            if field.file:
                store_size = kwargs['properties']['name']
            else:
                store_size = kwargs

            if field.max_length:
                store_size['maxLength'] = field.max_length
            if field.min_length:
                store_size['minLength'] = field.min_length  # nocv
        else:
            return NotHandled

        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )

        if isinstance(field, (fields.NamedBinaryImageInJsonField, fields.MultipleNamedBinaryImageInJsonField)):
            items['x-format'] = FORMAT_NAMED_BIN_IMAGE
            if field.background_fill_color:
                if 'x-options' not in items:
                    items['x-options'] = {}
                items['x-options']['backgroundFillColor'] = field.background_fill_color

        if field.max_content_size:
            items['properties']['content']['maxLength'] = field.max_content_size
        if field.min_content_size:
            items['properties']['content']['minLength'] = field.min_content_size

        x_validators: Dict[str, Union[Set, int, str]]
        x_validators = items['x-validators'] = {
            'extensions': set()
        }
        for validator in filter(lambda x: isinstance(x, validators.FileMediaTypeValidator), field.validators):
            if isinstance(validator, validators.ImageBaseSizeValidator) and items['x-format'] == FORMAT_NAMED_BIN_IMAGE:
                for orientation in validator.orientation:
                    for size_type, default_size in (('min', 1), ('max', float('inf'))):
                        size_name = f'{size_type}_{orientation}'
                        img_size = getattr(validator, size_name, default_size)
                        if size_name in x_validators:
                            if size_type == 'min' and x_validators[size_name] > img_size:
                                continue
                            elif size_type == 'max' and x_validators[size_name] < img_size:
                                continue
                        x_validators[size_name] = img_size
            if x_validators['extensions']:
                x_validators['extensions'] = x_validators['extensions'].intersection(validator.extensions)
            else:
                x_validators['extensions'] = set(validator.extensions)

        x_validators['extensions'] = sorted(x_validators['extensions'])
        if not x_validators['extensions']:
            del x_validators['extensions']

        return SwaggerType(**field_extra_handler(field, **kwargs))


class MaskedFieldInspector(FieldInspector):
    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        # pylint: disable=unused-variable,invalid-name
        if not isinstance(field, fields.MaskedField):
            return NotHandled

        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )
        kwargs = {
            'type': openapi.TYPE_STRING,
            'format': FORMAT_MASKED,
            X_OPTIONS: {
                'mask': field.mask,
            }
        }
        return SwaggerType(**field_extra_handler(field, **kwargs))


class FileInStringInspector(FieldInspector):
    format_by_field = {
        fields.SecretFileInString: FORMAT_SECRET_FILE,
        fields.BinFileInStringField: FORMAT_BIN_FILE,
    }

    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        if not isinstance(field, fields.FileInStringField) or isinstance(field, fields.CSVFileField):
            return NotHandled
        # pylint: disable=unused-variable,invalid-name
        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )

        kwargs = {
            'type': openapi.TYPE_STRING,
            'format': next((
                format
                for field_type, format in self.format_by_field.items()
                if isinstance(field, field_type)
            ), FORMAT_FILE),
            X_OPTIONS: {
                'media_types': tuple(set(field.media_types)),
            }
        }

        if field.max_length:
            kwargs['maxLength'] = field.max_length
        if field.min_length:
            kwargs['minLength'] = field.min_length

        return SwaggerType(**field_extra_handler(field, **kwargs))


class CSVFileFieldInspector(FieldInspector):
    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        if not isinstance(field, fields.CSVFileField):
            return NotHandled
        # pylint: disable=unused-variable,invalid-name
        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )

        kwargs = {
            'type': openapi.TYPE_STRING,
            'format': FORMAT_CSV_FILE,
            X_OPTIONS: {
                'media_types': tuple(set(field.media_types)),
                'parserConfig': {
                    js_name: field.parser_config[py_name]
                    for py_name, js_name in field.parser_options.items()
                    if py_name in field.parser_config
                },
                'minColumnWidth': field.min_column_width,
                'items': self.probe_field_inspectors(field.items, swagger_object_type, False)
            }
        }

        if field.max_length:
            kwargs['maxLength'] = field.max_length
        if field.min_length:
            kwargs['minLength'] = field.min_length

        return SwaggerType(**field_extra_handler(field, **kwargs))


class DecimalFieldInspector(FieldInspector):
    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        # pylint: disable=unused-variable,invalid-name
        if not isinstance(field, DecimalField):
            return NotHandled

        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )
        if field.max_digits is None:
            mask = rf'/^-?\d+(\.\d{{0,{field.decimal_places}}})?$/'
        else:
            mask = rf'/^-?\d{{0,{field.max_digits - field.decimal_places}}}(\.\d{{0,{field.decimal_places}}})?$/'
        kwargs = {
            'type': decimal_field_type(field),
            'format': FORMAT_MASKED,
            X_OPTIONS: {
                'mask': mask
            }
        }

        if field.default != empty:
            kwargs['default'] = str(field.default)

        if not field.allow_null and kwargs['type'] == 'string':
            kwargs['minLength'] = 1

        return SwaggerType(**field_extra_handler(field, **kwargs))


class SerializedFilterBackendsInspector(FilterInspector):
    def get_filter_parameters(self, filter_backend):
        if getattr(filter_backend, 'serializer_class', None) is None or \
                getattr(filter_backend, 'no_schema_serializer', False):
            return NotHandled
        # pylint: disable=protected-access
        return self.request._schema.serializer_to_parameters(
            serializer=filter_backend.serializer_class(),
            in_=openapi.IN_QUERY
        )


class NestedFilterInspector(DrfAPICompatInspector):
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


class ListInspector(ReferencingSerializerInspector):
    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kwargs):
        if not isinstance(field, (ListSerializer, ListField)):
            return NotHandled

        SwaggerType, ChildSwaggerType = self._get_partial_types(  # pylint: disable=invalid-name
            field,
            swagger_object_type,
            use_references,
            **kwargs,
        )

        child_schema = self.probe_field_inspectors(field.child, ChildSwaggerType, use_references)
        limits = find_limits(field) or {}
        title = force_real_str(field.label) if field.label else None

        return SwaggerType(
            type=openapi.TYPE_ARRAY,
            items=child_schema,
            title=title,
            **limits
        )


class VSTReferencingSerializerInspector(ReferencingSerializerInspector):
    def handle_schema(
        self,
        field: Serializer,
        schema: openapi.SwaggerDict,
        use_references: bool = True,
    ):  # pylint: disable=too-many-locals,too-many-branches
        if use_references:
            ref_name = self.get_serializer_ref_name(field)
            definitions = self.components.with_scope(openapi.SCHEMA_DEFINITIONS)
            schema = definitions[ref_name]

        if getattr(schema, '_handled', False):
            return

        schema_properties = tuple(schema['properties'].keys())
        serializer_class = schema._NP_serializer  # pylint: disable=protected-access

        non_bulk_methods = getattr(serializer_class, '_non_bulk_methods', None)
        schema_properties_groups = OrderedDict(
            getattr(serializer_class, '_schema_properties_groups', None) or {'': schema_properties}
        )
        translate_model = getattr(serializer_class, '_translate_model', None)

        view_field_name = getattr(serializer_class, '_view_field_name', None)

        if view_field_name is None and schema_properties:
            view_field_name = get_first_match_name(schema_properties, schema_properties[0])

        if schema_properties_groups:
            not_handled = set(schema_properties) - set(_get_handled_props(schema_properties_groups))

            if not_handled:
                schema_properties_groups[''] = [
                    prop
                    for prop in schema_properties
                    if prop in not_handled
                ]
        schema['x-properties-groups'] = schema_properties_groups
        schema['x-view-field-name'] = view_field_name

        if non_bulk_methods:
            schema['x-non-bulk-methods'] = non_bulk_methods

        if translate_model:
            schema['x-translate-model'] = translate_model

        if hide_not_required := getattr(serializer_class, '_hide_not_required', None):
            schema['x-hide-not-required'] = bool(hide_not_required)

        if display_mode := getattr(serializer_class, '_display_mode', None):
            schema['x-display-mode'] = display_mode

        if display_mode_list := getattr(serializer_class, '_display_mode_list', None):
            schema['x-display-mode-list'] = display_mode_list

        if initial_frontend_values := getattr(serializer_class, '_initial_frontend_values', None):
            schema['x-initial-values'] = initial_frontend_values

        if hidden_on_frontend := getattr(serializer_class, '_hidden_on_frontend', None):
            schema['x-hidden-fields'] = hidden_on_frontend

        schema._handled = True  # pylint: disable=protected-access

        # TODO: return it when swagger become openapi 3.0.1
        # if isinstance(field, ModelSerializer) \
        #         and hasattr(field, 'Meta') \
        #         and hasattr(field.Meta, 'model') \
        #         and field.Meta.model._meta.pk.name in schema_properties:
        #     schema.setdefault('required', [])
        #     schema['required'].insert(0, field.Meta.model._meta.pk.name)

    def field_to_swagger_object(self, field: Any, swagger_object_type: Any, use_references: Any, **kwargs: Any):
        if isinstance(field, FileResponse):
            return openapi.Schema(type='file')

        result = super().field_to_swagger_object(field, swagger_object_type, use_references, **kwargs)

        if result != NotHandled:
            self.handle_schema(field, result, use_references)

        return result


class PydanticSerializerInspector(ReferencingSerializerInspector):
    def field_to_swagger_object(self, field: Any, swagger_object_type: Any, use_references: Any, **kwargs: Any):
        if isinstance(field, api_base.ProxyPydanticSerializer):
            return openapi.Schema(**field.schema_model.model_json_schema())
        return NotHandled
