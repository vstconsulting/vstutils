import contextlib
import typing as _t
from copy import copy
from warnings import warn

from django.http import FileResponse
from rest_framework import status, serializers, views, authentication, permissions
from drf_yasg.inspectors.view import SwaggerAutoSchema
from drf_yasg.app_settings import swagger_settings
from drf_yasg.openapi import Schema, Response, Operation, Parameter, IN_HEADER, TYPE_STRING

from ... import utils
from ...models.base import get_proxy_labels
from ..decorators import NestedWithAppendMixin
from ..base import detail_actions, main_actions, CachableHeadMixin
from ...oauth2.authentication import JWTBearerTokenAuthentication
from . import inspectors as vst_inspectors

if _t.TYPE_CHECKING:
    View = _t.Type[views.APIView]


def _get_nested_view_and_subaction(view, default=None):
    action = getattr(view, 'action', None)
    if not action:
        return None, None
    sub_action = getattr(view, action, None)
    return getattr(sub_action, '_nested_view', default), sub_action


def _get_nested_view_class(nested_view, view_action_func):
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

    return _get_nested_view_class(nested_view_class, view_action_func)


def get_nested_view_obj(view, nested_view: 'View', view_action_func, method):
    # pylint: disable=protected-access
    # Get nested view recursively
    nested_view: 'View' = utils.get_if_lazy(_get_nested_view_class(nested_view, view_action_func))
    # Get action suffix
    replace_pattern = view_action_func._nested_subname + '-'
    replace_index = view_action_func.url_name.index(replace_pattern) + len(replace_pattern)
    action_suffix = view.action[replace_index:]
    # Check detail or list action
    is_detail = action_suffix.endswith('detail')
    is_list = action_suffix.endswith('list')
    # Create view object
    method = method.lower()
    nested_view_obj = nested_view()
    nested_view_obj.request = view.request
    nested_view_obj.kwargs = view.kwargs
    nested_view_obj.lookup_field = view.lookup_field
    nested_view_obj.lookup_url_kwarg = view.lookup_url_kwarg
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
        new_view = getattr(nested_view_obj, action_suffix, None)
        if new_view is not None:
            serializer_class = new_view.kwargs.get('serializer_class', None)
            if serializer_class:
                nested_view_obj.serializer_class = serializer_class

    return nested_view_obj


class ExtendedSwaggerAutoSchema(SwaggerAutoSchema):
    def get_query_parameters(self):
        result = super().get_query_parameters()
        if isinstance(self.view, CachableHeadMixin):
            if self.method == 'GET':
                result += [
                    Parameter(
                        name='If-None-Match',
                        in_=IN_HEADER,
                        required=False,
                        type=TYPE_STRING,
                    )
                ]

            elif self.view.should_check_action(self.method):
                result += [
                    Parameter(
                        name='If-Match',
                        in_=IN_HEADER,
                        required=False,
                        type=TYPE_STRING,
                    )
                ]

        return result

    def get_response_schemas(self, response_serializers):
        responses = super().get_response_schemas(response_serializers)
        if isinstance(self.view, CachableHeadMixin) and self.view.is_main_action:
            for response in responses:
                if response.startswith('2') or response == 'default':
                    responses[response]['headers'] = responses[response].get('headers', {})
                    responses[response]['headers'].setdefault(
                        'Etag', Schema(type=TYPE_STRING)
                    )
            if self.method == 'GET' and (st := str(self.view.NotModifiedException.status_code)) not in responses:
                responses[st] = Response(description="Not Modified")
            elif self.view.should_check_action(self.method):
                responses[str(self.view.PreconditionFailedException.status_code)] = Response(
                    description="Precondition Failed"
                )
        return responses

    def get_default_response_serializer(self):
        result = None
        if self.view.action not in main_actions:
            with contextlib.suppress(AttributeError):
                action = getattr(self.view, self.view.action).action
                if action.result_serializer_class:
                    if issubclass(action.result_serializer_class, serializers.BaseSerializer):
                        result = action.result_serializer_class(many=action.is_list)
                    elif issubclass(action.result_serializer_class, FileResponse):
                        result = Schema(type='file')
        return result or super().get_default_response_serializer()

    def get_security(self):
        result = super().get_security()

        result = result or []
        if (pm := self._sch.view.get_permissions()) and any(not isinstance(p, permissions.AllowAny) for p in pm):
            for auth_class in self._sch.view.get_authenticators():
                if isinstance(auth_class, JWTBearerTokenAuthentication):
                    # TODO: provide scopes usage
                    result.append({"oauth2": []})
                elif isinstance(auth_class, authentication.SessionAuthentication):
                    result.append({"session": []})
                elif isinstance(auth_class, authentication.BasicAuthentication):
                    result.append({"basic": []})

        return result


class VSTAutoSchema(ExtendedSwaggerAutoSchema):
    field_inspectors = [
        vst_inspectors.CommaMultiSelectFieldInspector,
        vst_inspectors.FkFieldInspector,
        vst_inspectors.DynamicJsonTypeFieldInspector,
        vst_inspectors.AutoCompletionFieldInspector,
        vst_inspectors.VSTFieldInspector,
        vst_inspectors.PydanticSerializerInspector,
        vst_inspectors.ListInspector,
        vst_inspectors.RouterLinkFieldInspector,
        vst_inspectors.VSTReferencingSerializerInspector,
        vst_inspectors.RelatedListFieldInspector,
        vst_inspectors.RatingFieldInspector,
        vst_inspectors.NamedBinaryImageInJsonFieldInspector,
        vst_inspectors.MaskedFieldInspector,
        vst_inspectors.DecimalFieldInspector,
        vst_inspectors.CSVFileFieldInspector,
        vst_inspectors.FileInStringInspector,
    ] + swagger_settings.DEFAULT_FIELD_INSPECTORS

    filter_inspectors = [
        vst_inspectors.NestedFilterInspector,
        vst_inspectors.SerializedFilterBackendsInspector,
    ] + swagger_settings.DEFAULT_FILTER_INSPECTORS

    default_status_messages: dict = {
        s[1]: ' '.join(s[2:])
        for s in (j.split('_') for j in filter(lambda x: x.startswith("HTTP_"), dir(status)))
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._sch = args[0].schema
        self._sch.view = args[0]
        self.request._schema = self

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

    def __perform_with_nested(self, func_name, *args, **kwargs):
        # pylint: disable=protected-access
        nested_view, sub_action = _get_nested_view_and_subaction(self.view)
        if nested_view and sub_action:
            schema = copy(self)
            try:
                schema.view = get_nested_view_obj(self.view, nested_view, sub_action, self.method)
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
            subscribe_view = _get_nested_view_and_subaction(self.view, self.view)[0]
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

        for param in params_to_override:
            if param in self.overrides and self.overrides[param] is not None:
                result[param] = self.overrides[param]

        if self.method.lower() == 'get' and not result.get('x-list'):
            if value := (
                getattr(self.view, "detail_operations_availability_field_name", None) or
                self.overrides.get("x-detail-operations-availability-field-name")
            ):
                result["x-detail-operations-availability-field-name"] = value

        return result
