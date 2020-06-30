# pylint: disable=unused-argument
import typing as _t
import json
from collections import OrderedDict

from django.conf import settings
from django.db import transaction
from django.http import Http404
from django.test import Client
from django.contrib.auth.models import AbstractUser
from rest_framework import permissions as rest_permissions, throttling, request as drf_request
from rest_framework.exceptions import ValidationError

from . import base, serializers, permissions, filters, decorators as deco, responses, models
from ..utils import Dict, import_class, deprecated


class LanguageSerializer(serializers.VSTSerializer):
    class Meta:
        model: _t.Type[models.Language] = models.Language
        fields: _t.Tuple = (
            'code',
            'name'
        )


class OneLanguageSerializer(serializers.VSTSerializer):
    translations: serializers.DataSerializer = serializers.DataSerializer(read_only=True)

    class Meta:
        model: _t.Type[models.Language] = models.Language
        fields: _t.Tuple = (
            'code',
            'name',
            'translations'
        )


class UserViewSet(base.ModelViewSet):
    '''
    API endpoint that allows users to be viewed or edited.
    '''
    # pylint: disable=invalid-name

    model: _t.Type[AbstractUser] = serializers.User
    serializer_class: _t.Type[serializers.User] = serializers.UserSerializer
    serializer_class_one: _t.Type[serializers.OneUserSerializer] = serializers.OneUserSerializer
    serializer_class_create: _t.Type[serializers.CreateUserSerializer] = serializers.CreateUserSerializer
    serializer_class_change_password: _t.Type[serializers.DataSerializer] = serializers.ChangePasswordSerializer
    filter_class = filters.UserFilter
    permission_classes = (permissions.SuperUserPermission,)

    def destroy(self, request: drf_request.Request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return responses.HTTP_409_CONFLICT("Could not remove youself.")
        return super().destroy(request, *args, **kwargs)

    @transaction.atomic
    def partial_update(self, request: drf_request.Request, *args, **kwargs):
        return self.update(request, partial=True)

    @transaction.atomic
    def update(self, request: drf_request.Request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return responses.HTTP_200_OK(serializer.data)

    @deco.action(["post"], detail=True, permission_classes=(rest_permissions.IsAuthenticated,))
    def change_password(self, request: drf_request.Request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object(), data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return responses.HTTP_201_CREATED(serializer.data)


class SettingsViewSet(base.ListNonModelViewSet):
    '''
    API endpoint thats returns application usefull settings.
    '''
    base_name = "settings"

    def _get_localization_settings(self):
        return {
            "LANGUAGE_CODE": settings.LANGUAGE_CODE,
            "LANGUAGES": dict(settings.LANGUAGES),
            "USE_I18N": settings.USE_I18N,
            "USE_L10N": settings.USE_L10N,
            "TIME_ZONE": settings.TIME_ZONE,
            "USE_TZ": settings.USE_TZ
        }

    def _get_system_settings(self):
        return {
            "PY": settings.PY_VER,
            "VSTUTILS_VERSION": settings.VSTUTILS_VERSION,
            f"{settings.ENV_NAME}_VERSION": settings.PROJECT_VERSION
        }

    @deco.action(methods=['get'], detail=False)
    def localization(self, request: drf_request.Request):
        '''
        Return localization settings.
        '''
        return responses.HTTP_200_OK(self._get_localization_settings())

    @deco.action(methods=['get'], detail=False)
    def system(self, request: drf_request.Request):
        '''
        Return system settings like interpreter or libs version.
        '''
        return responses.HTTP_200_OK(self._get_system_settings())


# TODO deprecated
class BulkViewSet(base.rvs.APIView):  # nocv
    '''
    API endpoint for transactional operations with API methods.
    Supports detail and list sub-actions.

    get: Return allowed_types and operations_types
    post: Return result of bulk-operations.
    put: Return result of bulk-operations without rollback.
    '''
    client_environ_keys_copy = [
        "SCRIPT_NAME",
        "SERVER_NAME",
        "SERVER_PORT",
        "SERVER_PROTOCOL",
        "SERVER_SOFTWARE",
        "REMOTE_ADDR",
        "HTTP_X_FORWARDED_PROTOCOL",
        "HTTP_HOST",
        "HTTP_USER_AGENT",
    ]
    default_version = settings.VST_API_VERSION
    api_url = settings.API_URL
    schema = None

    op_types = settings.BULK_OPERATION_TYPES
    type_to_bulk = {}
    session_cookie_name = settings.SESSION_COOKIE_NAME

    def set_allowed_types(self, request):
        self.api_version = request.version or self.default_version

        _allowed_types_default = {
            view: data.get('op_types', settings.BULK_OPERATION_TYPES.keys())
            for view, data in settings.API[self.api_version].items()
            if data.get('type', None) != 'view'
        }
        _allowed_types_typed = {
            name: _allowed_types_default[view]
            for name, view in self.type_to_bulk.items()
            if _allowed_types_default.get(view, False)
        }
        allowed_types = OrderedDict()
        allowed_types.update(_allowed_types_default)
        allowed_types.update(_allowed_types_typed)

        self.allowed_types = allowed_types

    def _check_type(self, op_type, item):
        allowed_types = self.allowed_types.get(item, None)
        if allowed_types is None:
            raise serializers.exceptions.NotFound()
        if isinstance(allowed_types, (list, tuple)) and op_type not in allowed_types:
            raise serializers.exceptions.UnsupportedMediaType(
                media_type=op_type
            )

    def _load_param(self, param):
        try:
            return json.loads(param)
        except:
            return param

    def _get_obj_with_extra(self, param):
        if isinstance(param, str):
            if '<<' in param and '>>' in param and not ('{' in param and '}' in param):
                param = param.replace('<<', '{').replace('>>', '}')
                param = param.format(*self.results)
            return self._load_param(param)
        return param

    def _json_dump(self, value, inner=False):
        return json.dumps(value) if not inner else value

    def _get_obj_with_extra_data(self, data, inner=False):
        if isinstance(data, (dict, OrderedDict)):
            return self._json_dump({
                k: self._get_obj_with_extra_data(v, True) for k, v in data.items()
            }, inner)
        elif isinstance(data, (list, tuple)):
            return self._json_dump([
                self._get_obj_with_extra_data(v, True) for v in data
            ], inner)
        elif isinstance(data, str):
            return self._get_obj_with_extra(data)
        return self._json_dump(data, inner)

    def get_url(self, item, pk=None, data_type=None, filter_set=None):
        url = ''
        if pk is not None:
            url += f"{self._get_obj_with_extra(pk)}/"
        if data_type is not None:
            if isinstance(data_type, (list, tuple)):
                data_type = '/'.join([str(i) for i in data_type])
            url += f"{self._get_obj_with_extra(data_type)}/" if data_type else ''
        if filter_set is not None:
            url += f"?{self._get_obj_with_extra(filter_set)}"
        return f'/{self.api_url}/{self.api_version}/{self.type_to_bulk.get(item, item)}/{url}'

    def get_method_type(self, op_type, operation):
        if op_type != 'mod':
            return self.op_types[op_type]
        return operation.get('method', self.op_types[op_type]).lower()

    def get_operation(self, operation, kwargs):
        op_type = operation['type']
        data = operation.get('data', {})
        if data:
            kwargs['data'] = self._get_obj_with_extra_data(data)
        url = self.get_url(
            operation['item'],
            operation.get('pk', None),
            operation.get('data_type', None),
            operation.get('filters', None),
        )
        method = getattr(self.client, self.get_method_type(op_type, operation))
        return method(url, secure=self.is_secure, **kwargs), url

    def create_response(self, status_code, data, operation, **kwargs):
        result = Dict(
            status=status_code, data=data,
            type=operation.get('type', None), item=operation.get('item', None),
            additional_info=kwargs
        )
        if result['type'] == 'mod':
            result['subitem'] = operation.get('data_type', None)
        return result

    def _get_rendered(self, res):
        data = getattr(res, 'data', {})
        if data:
            try:
                return Dict(data)
            except:  # nocv
                pass
        if res.status_code != 404 and getattr(res, "rendered_content", False):  # nocv
            return json.loads(res.rendered_content.decode())
        return Dict(dict(detail=str(res.content.decode('utf-8'))))

    def perform(self, operation):
        kwargs = dict(content_type="application/json")
        response, url = self.get_operation(operation, kwargs)
        return self.create_response(
            response.status_code,
            self._get_rendered(response),
            operation, url=url
        )

    @transaction.atomic()
    def operate_handler(self, operation, allow_fail=True):
        try:
            op_type = operation.get("type", 'mod')
            operation['type'] = op_type
            data_type = operation.get('data_type', None)
            item = operation.get("item", '__init__')
            if item == '__init__' and isinstance(data_type, (list, type)) and data_type:
                operation['item'] = data_type[0]
                operation['data_type'] = operation['data_type'][1:]
                operation.pop('pk', None)
            self._check_type(op_type, operation.get("item", None))
            result = self.perform(operation)
            if allow_fail and result['status'] >= 300:
                raise ValidationError(result['data'])
            self.put_result(result)
        except Exception as err:
            if allow_fail:
                raise
            response = base.exception_handler(err, None)
            kwargs = dict(error_type=err.__class__.__name__, message=str(err))
            kwargs.update({'results': self.results[:-1]} if isinstance(err, KeyError) else {})
            self.put_result(self.create_response(
                response.status_code,
                self._get_rendered(response),
                operation, **kwargs
            ))

    def original_environ_data(self, *args):
        # pylint: disable=protected-access
        get_environ = self.request._request.environ.get
        kwargs = dict()
        for env_var in tuple(self.client_environ_keys_copy) + args:
            value = get_environ(env_var, None)
            if value:
                kwargs[env_var] = str(value)
        return kwargs

    def _operates(self, operations, allow_fail):
        for operation in operations:
            self.operate_handler(operation, allow_fail)

    @deprecated
    def operate(self, request, allow_fail=True):
        # pylint: disable=protected-access
        self.is_secure = request._request.is_secure()
        operations = request.data
        self.client = Client(**self.original_environ_data())
        self.client.cookies[self.session_cookie_name] = request.session.session_key
        self._operates(operations, allow_fail)
        return responses.HTTP_200_OK(self.results)

    @transaction.atomic()
    def post(self, request, *args, **kwargs):
        return self.operate(request)

    def put(self, request, *args, **kwargs):
        return self.operate(request, allow_fail=False)

    @deprecated
    def get(self, request):
        response = {
            "allowed_types": self.allowed_types,
            "operations_types": self.op_types.keys(),
        }
        return responses.HTTP_200_OK(response)

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.set_allowed_types(request)
        self.results = []
        self.put_result = self.results.append


class HealthThrottle(throttling.AnonRateThrottle):
    THROTTLE_RATES = {
        'anon': settings.HEALTH_THROTTLE_RATE
    }


class HealthView(base.ListNonModelViewSet):
    permission_classes = (rest_permissions.AllowAny,)
    authentication_classes = ()
    throttle_classes = (HealthThrottle,)
    health_backend = import_class(settings.HEALTH_BACKEND_CLASS)()

    def list(self, request, *args, **kwargs):
        return responses.HTTP_200_OK(*self.health_backend.get())


class LangViewSet(base.ReadOnlyModelViewSet):
    schema = None
    model: _t.Type[models.Language] = models.Language
    serializer_class: _t.Type[LanguageSerializer] = LanguageSerializer
    serializer_class_one: _t.Type[OneLanguageSerializer] = OneLanguageSerializer
    permission_classes: _t.Tuple[object] = (rest_permissions.IsAuthenticatedOrReadOnly,)

    def get_object(self):
        try:
            return super().get_object()
        except Http404:
            # Perform the lookup filtering.
            lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field

            assert lookup_url_kwarg in self.kwargs, (
                    'Expected view %s to be called with a URL keyword argument '
                    'named "%s". Fix your URL conf, or set the `.lookup_field` '
                    'attribute on the view correctly.' %
                    (self.__class__.__name__, lookup_url_kwarg)
            )

            obj_kwargs = {
                self.lookup_field: self.kwargs[lookup_url_kwarg],
                'name': self.kwargs[lookup_url_kwarg],
            }
            return self.model(**obj_kwargs)
