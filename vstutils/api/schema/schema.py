import typing as _t
from copy import copy
from warnings import warn

from django.http import FileResponse
from rest_framework import status
from drf_yasg.inspectors.view import SwaggerAutoSchema
from drf_yasg.app_settings import swagger_settings
from drf_yasg.openapi import Operation

from ... import utils
from ...models.base import get_proxy_labels
from ..decorators import NestedWithAppendMixin
from ..base import detail_actions
from . import inspectors as vst_inspectors


class VSTAutoSchema(SwaggerAutoSchema):
    paginator_inspectors = [
        vst_inspectors.ArrayFilterQueryInspector,
    ] + swagger_settings.DEFAULT_PAGINATOR_INSPECTORS
    field_inspectors = [
        vst_inspectors.CommaMultiSelectFieldInspector,
        vst_inspectors.FkFieldInspector,
        vst_inspectors.DynamicJsonTypeFieldInspector,
        vst_inspectors.AutoCompletionFieldInspector,
        vst_inspectors.VSTFieldInspector,
        vst_inspectors.VSTReferencingSerializerInspector,
        vst_inspectors.RelatedListFieldInspector,
        vst_inspectors.RatingFieldInspector,
        vst_inspectors.RelatedListFieldInspector,
        vst_inspectors.NamedBinaryImageInJsonFieldInspector,
        vst_inspectors.MaskedFieldInspector,
        vst_inspectors.DecimalFieldInspector,
        vst_inspectors.CSVFileFieldInspector,
        vst_inspectors.FileInStringInspector,
    ] + swagger_settings.DEFAULT_FIELD_INSPECTORS

    filter_inspectors = [
        vst_inspectors.NestedFilterInspector,
        vst_inspectors.SerializedFilterBackendsInspector,
        vst_inspectors.ArrayFilterQueryInspector,
    ] + swagger_settings.DEFAULT_FILTER_INSPECTORS

    default_status_messages: dict = {
        s[1]: ' '.join(s[2:])
        for s in map(lambda j: j.split('_'), filter(lambda x: x.startswith("HTTP_"), dir(status)))
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._sch = args[0].schema
        self._sch.view = args[0]
        self.request._schema = self

    def _get_nested_view_class(self, nested_view, view_action_func):
        # pylint: disable=protected-access
        if not hasattr(view_action_func, '_nested_name'):
            return nested_view

        nested_action_name = '_'.join(view_action_func._nested_name.split('_')[1:])

        if nested_view is None:
            return nested_view  # nocv

        if hasattr(view_action_func, '_nested_view'):
            nested_view_class = view_action_func._nested_view
            view_action_func = getattr(nested_view_class, nested_action_name, None)
        else:  # nocv
            nested_view_class = None
            view_action_func = None

        if view_action_func is None:
            return nested_view

        return self._get_nested_view_class(nested_view_class, view_action_func)

    def __get_nested_view_obj(self, nested_view, view_action_func):
        # pylint: disable=protected-access
        # Get nested view recursively
        nested_view = utils.get_if_lazy(self._get_nested_view_class(nested_view, view_action_func))
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
        nested_view_obj.format_kwarg = None
        nested_view_obj._nested_wrapped_view = getattr(view_action_func, '_nested_wrapped_view', None)
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
            view = getattr(nested_view_obj, action_suffix, None)
            if view is not None:
                serializer_class = view.kwargs.get('serializer_class', None)
                if serializer_class:
                    nested_view_obj.serializer_class = serializer_class

        return nested_view_obj

    def get_operation_id(self, operation_keys=None):
        new_operation_keys: _t.List[str] = []
        append_new_operation_keys = new_operation_keys.append

        for key in operation_keys or []:
            append_new_operation_keys(key.replace(f'{None if not new_operation_keys else new_operation_keys[-1]}_', ''))

        return super().get_operation_id(tuple(new_operation_keys))

    def get_response_schemas(self, response_serializers):
        responses = super().get_response_schemas(response_serializers)
        for response_code, response in responses.items():
            if not response.description:
                response.description = self.default_status_messages.get(response_code, 'Action accepted.')
        return responses

    def __get_nested_view_and_subaction(self, default=None):
        sub_action = getattr(self.view, self.view.action, None)
        return getattr(sub_action, '_nested_view', default), sub_action

    def __perform_with_nested(self, func_name, *args, **kwargs):
        # pylint: disable=protected-access
        nested_view, sub_action = self.__get_nested_view_and_subaction()
        if nested_view and sub_action:
            schema = copy(self)
            try:
                schema.view = self.__get_nested_view_obj(nested_view, sub_action)
                result = getattr(schema, func_name)(*args, **kwargs)
                if result:
                    return result
            except Exception as err:  # nocv
                warn(
                    f"Error in parse '{self.view.action}'."
                    f" Using default inspection. Err: {err}"
                )
        return getattr(super(), func_name)(*args, **kwargs)

    def get_view_serializer(self, *args, **kwargs):
        return self.__perform_with_nested('get_view_serializer', *args, **kwargs)

    def get_query_serializer(self, *args, **kwargs):
        return self.__perform_with_nested('get_query_serializer', *args, **kwargs)

    def get_pagination_parameters(self, *args, **kwargs):
        return self.__perform_with_nested('get_pagination_parameters', *args, **kwargs)

    def get_paginated_response(self, *args, **kwargs):
        return self.__perform_with_nested('get_paginated_response', *args, **kwargs)

    def get_filter_parameters(self, *args, **kwargs):
        return self.__perform_with_nested('get_filter_parameters', *args, **kwargs)

    def get_responses(self, *args, **kwargs):
        return self.__perform_with_nested('get_responses', *args, **kwargs)

    def get_produces(self):
        serializer = self.get_view_serializer()
        if isinstance(serializer, FileResponse):
            produces = getattr(self.view, f'produces_for_{self.view.action}', []) + ['application/octet-stream']
        else:
            produces = []
        return produces + super().get_produces()

    def is_list_view(self):
        if 'x-list' in self.overrides:
            return self.overrides['x-list']

        action = getattr(self.view, 'action', '')
        method = getattr(self.view, action, None) or self.method
        detail = getattr(method, 'detail', None)
        suffix = getattr(self.view, 'suffix', None)
        if action not in detail_actions + ('destroy',) and not detail and suffix == 'Instance':
            return False
        return self.__perform_with_nested('is_list_view')

    def get_operation(self, operation_keys=None):
        result: Operation = self.__perform_with_nested('get_operation', operation_keys)
        _nested_wrapped_view = getattr(self.view, '_nested_wrapped_view', None)
        if result['operationId'].endswith('_add') and _nested_wrapped_view:
            # pylint: disable=protected-access
            result['x-allow-append'] = issubclass(_nested_wrapped_view, NestedWithAppendMixin)

        if getattr(self.view, 'hidden', None) or self.overrides.get('x-hidden'):
            result['x-hidden'] = True

        params_to_override = ('x-title', 'x-icons')
        if self.method.lower() == 'get':
            subscribe_view = self.__get_nested_view_and_subaction(self.view)[0]
            queryset = getattr(subscribe_view, 'queryset', None)
            if queryset is not None:
                # pylint: disable=protected-access
                subscribe_labels = [queryset.model._meta.label, *get_proxy_labels(queryset.model)]
                subscribe_labels += list(getattr(queryset.model, '_extra_subscribe_labels', []))
                result['x-subscribe-labels'] = subscribe_labels
            deep_nested_subview = getattr(subscribe_view, 'deep_nested_subview', None)
            if deep_nested_subview:
                result['x-deep-nested-view'] = deep_nested_subview
            result['x-list'] = self.is_list_view()
        else:
            params_to_override = params_to_override + ('x-multiaction', 'x-require-confirmation')

        for param in set(params_to_override):
            if param in self.overrides and self.overrides[param] is not None:
                result[param] = self.overrides[param]

        return result
