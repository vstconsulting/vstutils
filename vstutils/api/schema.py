from collections import OrderedDict
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
FORMAT_AUTOCOMPLETE = 'autocomplete'
FORMAT_HTML = 'html'
FORMAT_JSON = 'json'
FORMAT_TEXTAREA = 'textarea'
FORMAT_DYN = 'dynamic'
FORMAT_SELECT2 = 'select2'


# Base types
basic_type_info = OrderedDict()
basic_type_info[fields.FileInStringField] = dict(
    type=openapi.TYPE_STRING, format=FORMAT_FILE
)
basic_type_info[fields.SecretFileInString] = dict(
    type=openapi.TYPE_STRING, format=FORMAT_SECRET_FILE
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


class VSTFieldInspector(FieldInspector):
    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        # pylint: disable=invalid-name,unused-variable
        type_info = basic_type_info.get(field.__class__, None)
        if type_info is None:
            return NotHandled

        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )
        return SwaggerType(**type_info)


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

        return SwaggerType(**kwargs)


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

        return SwaggerType(**kwargs)


class Select2FieldInspector(FieldInspector):  # nocv
    def field_to_swagger_object(self, field, swagger_object_type, use_references, **kw):
        # pylint: disable=unused-variable,invalid-name
        if not isinstance(field, fields.Select2Field):
            return NotHandled

        SwaggerType, ChildSwaggerType = self._get_partial_types(
            field, swagger_object_type, use_references, **kw
        )
        kwargs = dict(type=openapi.TYPE_INTEGER, format=FORMAT_SELECT2)
        kwargs['additionalProperties'] = dict(
            model = openapi.SchemaRef(
                self.components.with_scope(openapi.SCHEMA_DEFINITIONS),
                field.select_model, ignore_unresolved=True
            ),
            value_field = field.autocomplete_property,
            view_field = field.autocomplete_represent
        )

        return SwaggerType(**kwargs)


class NestedFilterInspector(CoreAPICompatInspector):
    def get_filter_parameters(self, filter_backend):
        subaction_list_actions = [
            '{}_list'.format(name)
            for name in getattr(self.view, '_nested_args', {}).keys()
        ]
        if self.view.action not in subaction_list_actions:
            return NotHandled
        if self.method != 'GET':
            return NotHandled  # nocv
        nested_view = getattr(self.view, self.view.action, None)
        nested_view_filter_class = getattr(nested_view, '_nested_filter_class', None)
        filter_class = getattr(self.view, 'filter_class', None)
        self.view.filter_class = nested_view_filter_class
        result = super(NestedFilterInspector, self).get_filter_parameters(filter_backend)
        self.view.filter_class = filter_class
        return result


class VSTAutoSchema(SwaggerAutoSchema):
    field_inspectors = [
                           Select2FieldInspector, DependEnumFieldInspector,
                           AutoCompletionFieldInspector, VSTFieldInspector,
                       ] + swagger_settings.DEFAULT_FIELD_INSPECTORS
    filter_inspectors = [
                            NestedFilterInspector
                        ] + swagger_settings.DEFAULT_FILTER_INSPECTORS

    def __init__(self, *args, **kwargs):
        super(VSTAutoSchema, self).__init__(*args, **kwargs)
        self._sch = args[0].schema
        self._sch.view = args[0]

    def __get_nested_serializer(self, nested_view):
        action_suffix = self.view.action.split('_')[-1]
        is_detail = action_suffix == 'detail'
        is_list = action_suffix == 'list'
        method = self.method.lower()
        nested_view_obj = nested_view()
        nested_view_obj.request = self.view.request
        nested_view_obj.kwargs = self.view.kwargs
        nested_view_obj.format_kwarg = None
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
        else:  # nocv
            nested_view_obj.action = action_suffix

        return nested_view_obj.get_serializer()

    def get_view_serializer(self):
        if hasattr(self.view, 'get_serializer'):
            view_action_func = getattr(self.view, self.view.action, None)
            nested_view = getattr(view_action_func, '_nested_view', None)
            if nested_view:
                return self.__get_nested_serializer(nested_view)
        return super(VSTAutoSchema, self).get_view_serializer()

    def get_operation_id(self, operation_keys):
        new_operation_keys = []
        for key in operation_keys:
            previous = None if not len(new_operation_keys) else new_operation_keys[-1]
            new_operation_keys.append(key.replace('{}_'.format(previous), ''))
        return super(VSTAutoSchema, self).get_operation_id(tuple(new_operation_keys))

    def get_response_schemas(self, response_serializers):
        responses = super(VSTAutoSchema, self).get_response_schemas(response_serializers)
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


class VSTSchemaGenerator(generators.OpenAPISchemaGenerator):
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
        sub_view = getattr(view_cls, '{}_detail'.format(name), None)
        if sub_view is None:
            return None
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
        parameters = super(VSTSchemaGenerator, self).get_path_parameters(path, view_cls)
        queryset = getattr(view_cls, 'queryset', None)
        for param in parameters:
            model, model_field = field_insp.get_queryset_field(queryset, param['name'])
            if self._update_param_model(param, model, model_field):
                continue
            elif self._update_param_view(param, model, view_cls):
                continue
        return parameters

    def get_operation_keys(self, subpath, method, view):
        keys = super(VSTSchemaGenerator, self).get_operation_keys(subpath, method, view)
        subpath_keys = [item for item in subpath.split('/') if item]
        if method.upper() == 'GET' and '_detail' in keys[-1]:
            keys = keys[:-1] + ['_'.join(keys[-1].split('_')[:-1])] + ['get']
        if keys[-1] == 'get' and subpath_keys[-1] == keys[-2]:
            if getattr(view, '_'.join([keys[-2], 'list']), None) is not None:
                keys = keys[0:-1] + ['list']
        return keys
