from copy import copy
from collections import OrderedDict
from django.conf import settings
from rest_framework import status
from drf_yasg.inspectors.base import FieldInspector, NotHandled
from drf_yasg import openapi, utils, generators
from drf_yasg.inspectors import (
    SwaggerAutoSchema, swagger_settings, field as field_insp, CoreAPICompatInspector
)
from . import fields, serializers

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


class VSTAutoSchema(SwaggerAutoSchema):
    field_inspectors = [
        CommaMultiSelectFieldInspector,
        FkFieldInspector, DependEnumFieldInspector,
        AutoCompletionFieldInspector, VSTFieldInspector,
    ] + swagger_settings.DEFAULT_FIELD_INSPECTORS
    filter_inspectors = [
        NestedFilterInspector
    ] + swagger_settings.DEFAULT_FILTER_INSPECTORS

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._sch = args[0].schema
        self._sch.view = args[0]

    def _get_nested_view_class(self, nested_view, view_action_func):
        # pylint: disable=protected-access
        if not hasattr(view_action_func, '_nested_name'):
            return nested_view

        nested_action_name = '_'.join(view_action_func._nested_name.split('_')[1:])

        if nested_view is None:  # nocv
            return nested_view

        nested_view_class = getattr(view_action_func, '_nested_view', None)
        view_action_func = getattr(nested_view_class, nested_action_name, None)

        if view_action_func is None:
            return nested_view

        return self._get_nested_view_class(nested_view_class, view_action_func)

    def __get_nested_view_obj(self, nested_view, view_action_func):
        # pylint: disable=protected-access
        # Get nested view recursively
        nested_view = self._get_nested_view_class(nested_view, view_action_func)
        # Get action suffix
        replace_pattern = view_action_func._nested_subname + '_'
        replace_index = self.view.action.index(replace_pattern) + len(replace_pattern)
        action_suffix = self.view.action[replace_index:]
        # Check detail or list action
        is_detail = action_suffix.endswith('detail')
        is_list = action_suffix.endswith('list')
        # Create view object
        method = self.method.lower()
        nested_view_obj = nested_view()
        nested_view_obj.request = self.view.request
        nested_view_obj.kwargs = self.view.kwargs
        nested_view_obj.lookup_field = self.view.lookup_field
        nested_view_obj.lookup_url_kwarg = self.view.lookup_url_kwarg
        nested_view_obj.format_kwarg = None
        # Check operation action
        if method == 'post' and is_list:
            nested_view_obj.action = 'create'
        elif method == 'get' and is_list:
            nested_view_obj.action = 'list'
        elif method == 'get' and is_detail:
            nested_view_obj.action = 'retrieve'
        elif method == 'put' and is_detail:
            nested_view_obj.action = 'update'
        elif method == 'patch' and is_detail:
            nested_view_obj.action = 'partial_update'
        elif method == 'delete' and is_detail:  # nocv
            nested_view_obj.action = 'destroy'
        else:
            nested_view_obj.action = action_suffix
            if hasattr(nested_view_obj, action_suffix):
                view = getattr(nested_view_obj, action_suffix)
                serializer_class = view.kwargs.get('serializer_class', None)
                if serializer_class:
                    nested_view_obj.serializer_class = serializer_class

        return nested_view_obj

    def get_operation_id(self, operation_keys=None):
        new_operation_keys = []
        for key in operation_keys or []:
            previous = None if not len(new_operation_keys) else new_operation_keys[-1]
            new_operation_keys.append(key.replace('{}_'.format(previous), ''))
        return super().get_operation_id(tuple(new_operation_keys))

    def get_response_schemas(self, response_serializers):
        responses = super().get_response_schemas(response_serializers)
        for response in responses:
            if not responses[response].description:
                responses[response].description = 'Action accepted.'
        error_serializer = utils.force_serializer_instance(serializers.ErrorSerializer)
        responses[status.HTTP_400_BAD_REQUEST] = openapi.Response(
            description='Validation error or some data error.',
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

    def __perform_with_nested(self, func_name, *args, **kwargs):
        # pylint: disable=protected-access
        sub_action = getattr(self.view, self.view.action, None)
        if hasattr(sub_action, '_nested_view'):
            schema = copy(self)
            schema.view = self.__get_nested_view_obj(sub_action._nested_view, sub_action)
            result = getattr(schema, func_name)(*args, **kwargs)
            if result:
                return result
        return getattr(super(), func_name)(*args, **kwargs)

    def get_view_serializer(self, *args, **kwargs):
        return self.__perform_with_nested('get_view_serializer', *args, **kwargs)

    def get_pagination_parameters(self, *args, **kwargs):
        return self.__perform_with_nested('get_pagination_parameters', *args, **kwargs)

    def get_paginated_response(self, *args, **kwargs):
        return self.__perform_with_nested('get_paginated_response', *args, **kwargs)

    def get_filter_parameters(self, *args, **kwargs):
        return self.__perform_with_nested('get_filter_parameters', *args, **kwargs)

    def get_responses(self, *args, **kwargs):
        return self.__perform_with_nested('get_responses', *args, **kwargs)


class EndpointEnumerator(generators.EndpointEnumerator):
    api_version = settings.VST_API_VERSION
    api_url = settings.VST_API_URL
    api_url_prifix = '^{}/'.format(api_url)

    def get_api_endpoints(self, *args, **kwargs):
        prefix = kwargs.get('prefix', '')
        namespace = kwargs.get('namespace', None)
        is_api_to_ignore = (
            self.api_url_prifix != prefix and
            prefix.startswith(self.api_url_prifix) and
            namespace != self.api_version
        )
        if is_api_to_ignore:
            return []
        return super().get_api_endpoints(*args, **kwargs)


class VSTSchemaGenerator(generators.OpenAPISchemaGenerator):
    endpoint_enumerator_class = EndpointEnumerator

    def __init__(self, *args, **kwargs):
        kwargs['version'] = settings.VST_API_VERSION
        super().__init__(*args, **kwargs)

    def _get_subname(self, name):
        names = name.split('_')
        return ['_'.join(names[0:-1]), names[-1]]

    def _get_model_type_info(self, name, model, model_field=None, query_name=None):
        if model_field:
            return None
        _query_name, field_name = self._get_subname(name)
        query_name = query_name or _query_name
        related_model = field_insp.get_related_model(model, query_name)
        related_field = field_insp.get_model_field(related_model, field_name)
        if related_field is None:
            return None
        type_info = field_insp.get_basic_type_info(related_field)
        if type_info is None:
            return None  # nocv
        type_info.update({
            'description':
                ('A unique {} value identifying '
                 'instance of this {} sublist.').format(type_info['type'], query_name),
        })
        return type_info

    def _get_manager_name(self, param, view_cls):
        name, _ = self._get_subname(param['name'])
        if not hasattr(view_cls, '{}_detail'.format(name)):
            return None
        sub_view = getattr(view_cls, '{}_detail'.format(name), None)
        return getattr(sub_view, '_nested_manager', None)

    def _update_param_model(self, param, model, model_field=None, **kw):
        type_info = self._get_model_type_info(param['name'], model, model_field, **kw)
        if type_info is None:
            return type_info
        param.update(type_info)
        return param

    def _update_param_view(self, param, model, view_cls):
        manager_name = self._get_manager_name(param, view_cls)
        if manager_name is None:
            return None  # nocv
        return self._update_param_model(param, model, query_name=manager_name)

    def get_path_parameters(self, path, view_cls):
        parameters = super().get_path_parameters(path, view_cls)
        queryset = getattr(view_cls, 'queryset', None)
        for param in parameters:
            model, model_field = field_insp.get_queryset_field(queryset, param['name'])
            if self._update_param_model(param, model, model_field):
                continue
            elif self._update_param_view(param, model, view_cls):
                continue
        return parameters

    def get_operation_keys(self, subpath, method, view):
        keys = super().get_operation_keys(subpath, method, view)
        subpath_keys = list(filter(bool, subpath.split('/')))
        r_type, gist = keys[-1], keys[-2]
        if method.upper() == 'GET' and '_detail' in r_type:
            keys = keys[:-1] + ['_'.join(r_type.split('_')[:-1])] + ['get']
        if r_type == 'get' and subpath_keys[-1] == gist:
            if any([f for f in dir(view) if f.endswith('_'.join([gist, 'list']))]):
                keys[-1] = 'list'
        return keys
