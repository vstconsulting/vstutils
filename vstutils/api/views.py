# pylint: disable=unused-argument
from collections import OrderedDict
import json
import six
from django.conf import settings
from django.test import Client
from django.db import transaction
from . import base, serializers, permissions, filters


class UserViewSet(base.ModelViewSetSet):
    '''
    API endpoint that allows users to be viewed or edited.
    '''

    model = serializers.User
    serializer_class = serializers.UserSerializer
    serializer_class_one = serializers.OneUserSerializer
    filter_class = filters.UserFilter
    permission_classes = (permissions.SuperUserPermission,)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return base.Response("Could not remove youself.", 409).resp
        else:
            return super(UserViewSet, self).destroy(request, *args, **kwargs)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        return self.update(request, partial=True)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance,
                                         data=request.data,
                                         partial=partial)
        if not serializer.is_valid(raise_exception=False):
            raise Exception("Invalid data was sended.")
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return base.Response(serializer.data, 200).resp


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
            "{}_VERSION".format(settings.ENV_NAME): settings.PROJECT_VERSION
        }

    @base.action(methods=['get'], detail=False)
    def localization(self, request):
        '''
        Return localization settings.
        '''
        return base.Response(self._get_localization_settings(), 200).resp

    @base.action(methods=['get'], detail=False)
    def system(self, request):
        '''
        Return system settings like interpreter or libs version.
        '''
        return base.Response(self._get_system_settings(), 200).resp


class BulkViewSet(base.rvs.APIView):
    '''
    API endpoint for transactional operations with API methods.
    Supports detail and list sub-actions.

    get: Return allowed_types and operations_types
    post: Return result of bulk-operations.
    '''
    api_version = settings.VST_API_VERSION
    schema = None

    op_types = settings.BULK_OPERATION_TYPES
    type_to_bulk = {}

    @property
    def allowed_types(self):
        _allowed_types_default = {
            view: data.get('op_types', settings.BULK_OPERATION_TYPES.keys())
            for view, data in settings.API[settings.VST_API_VERSION].items()
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
        return allowed_types

    def _check_type(self, op_type, item):
        allowed_types = self.allowed_types.get(item, [])
        if op_type not in allowed_types:
            raise serializers.exceptions.UnsupportedMediaType(
                media_type=op_type
            )

    def _get_obj_with_extra(self, param):
        if isinstance(param, (six.text_type, six.string_types)):
            param = param.replace('<', '{').replace('>', '}')
            return param.format(*self.results)
        return param

    def _get_obj_with_extra_data(self, data):
        if isinstance(data, (dict, OrderedDict)):
            return json.dumps({k: self._get_obj_with_extra(v) for k,v in data.items()})
        elif isinstance(data, (list, tuple)):  # nocv
            return json.dumps([self._get_obj_with_extra(v) for v in data])
        elif isinstance(data, (six.string_types, six.text_type)):  # nocv
            return self._get_obj_with_extra(data)
        return json.dumps(data)  # nocv

    def get_url(self, item, pk=None, data_type=None, filter_set=None):
        url = ''
        if pk is not None:
            url += "{}/".format(self._get_obj_with_extra(pk))
        if data_type is not None:
            url += "{}/".format(self._get_obj_with_extra(data_type))
        if filter_set is not None:
            url += "?{}".format(self._get_obj_with_extra(filter_set))
        return "/{}/{}/{}/{}".format(
            settings.API_URL, self.api_version, self.type_to_bulk.get(item, item), url
        )

    def get_method_type(self, op_type, operation):
        if op_type != 'mod':
            return self.op_types[op_type]
        else:
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
        return method(url, **kwargs)

    def perform(self, operation):
        kwargs = dict()
        kwargs["content_type"] = "application/json"
        response = self.get_operation(operation, kwargs)
        if response.status_code != 404 and getattr(response, "rendered_content", False):
            data = json.loads(response.rendered_content.decode())
        else:
            data = dict(detail=str(response.content.decode('utf-8')))
        result = OrderedDict(
            status=response.status_code, data=data,
            type=operation['type'], item=operation['item']
        )
        if result['type'] == 'mod':
            result['subitem'] = operation.get('data_type', None)
        return result

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        operations = request.data
        self.results = []
        self.client = Client()
        self.client.force_login(request.user)
        for operation in operations:
            op_type = operation.get("type")
            self._check_type(op_type, operation.get("item", None))
            self.results.append(self.perform(operation))
        return base.Response(self.results, 200).resp

    def get(self, request):
        response = {
            "allowed_types": self.allowed_types,
            "operations_types": self.op_types.keys(),
        }
        return base.Response(response, 200).resp
