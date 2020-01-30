from copy import copy
from warnings import warn
from rest_framework import status
from drf_yasg.inspectors import SwaggerAutoSchema, swagger_settings
from drf_yasg import openapi, utils

from .. import serializers
from .inspectors import (
    CommaMultiSelectFieldInspector,
    FkFieldInspector,
    DependEnumFieldInspector,
    AutoCompletionFieldInspector,
    VSTFieldInspector,
    NestedFilterInspector
)


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

        if nested_view is None:
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
        elif method == 'delete' and is_detail:
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
            new_operation_keys.append(key.replace(f'{previous}_', ''))
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
            try:
                schema.view = self.__get_nested_view_obj(sub_action._nested_view, sub_action)
                result = getattr(schema, func_name)(*args, **kwargs)
                if result:
                    return result
            except Exception as err:
                warn(
                    f"Error in parse '{self.view.action}'."
                    f" Using default inspection. Err: {err}"
                )
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
