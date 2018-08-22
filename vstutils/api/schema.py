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
FORMAT_TEXTAREA = 'textarea'

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
basic_type_info[fields.HtmlField] = dict(
    type=openapi.TYPE_STRING, format=FORMAT_HTML
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
        kwargs = dict(**type_info)
        if type_info.get('format', None) == FORMAT_AUTOCOMPLETE:
            kwargs['additionalProperties'] = openapi.SchemaRef(
                self.components.with_scope(openapi.SCHEMA_DEFINITIONS),
                field.autocomplete + '/properties/id', ignore_unresolved=True
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
        VSTFieldInspector,
    ] + swagger_settings.DEFAULT_FIELD_INSPECTORS
    filter_inspectors = [
        NestedFilterInspector
    ] + swagger_settings.DEFAULT_FILTER_INSPECTORS

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
        if keys[-1] == 'get' and subpath_keys[-1] == keys[-2]:
            if getattr(view, '_'.join([keys[-2], 'list']), None) is not None:
                keys = keys[0:-1] + ['list']
        return keys
