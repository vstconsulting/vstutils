import os
import time
import copy
from urllib.parse import urljoin

from authlib.jose import jwt, OctKey
from rest_framework import request as drf_request
from django.conf import settings
from django.utils.module_loading import import_string
from drf_yasg import generators, openapi
from drf_yasg.inspectors import field as field_insp
from vstutils.utils import raise_context_decorator_with_default

from .schema import get_nested_view_obj, _get_nested_view_and_subaction


def get_centrifugo_public_address(request: drf_request.Request):
    address = settings.CENTRIFUGO_PUBLIC_HOST
    if address.startswith('/'):
        address = request.build_absolute_uri(address)
    elif 'api' in address.rsplit('/', 2):
        address = address[:address.rfind('api')]
    return os.path.join(address.replace('http', 'ws', 1), 'connection/websocket')


def get_oauth2_security_definition(request: drf_request.Request):
    if settings.OAUTH_SERVER_URL:
        token_url = urljoin(
            settings.OAUTH_SERVER_URL,
            settings.OAUTH_SERVER_TOKEN_ENDPOINT_PATH or f'/{settings.API_URL}/oauth2/token/',
        )
    elif settings.OAUTH_SERVER_ENABLE:
        token_url = request.build_absolute_uri(f'/{settings.API_URL}/oauth2/token/')

    definition = {
        'type': 'oauth2',
        'flow': 'password',
        'tokenUrl': token_url,
        'scopes': {},
    }

    if settings.OAUTH_SERVER_SCHEMA_CLIENT_ID:
        definition['x-clientId'] = settings.OAUTH_SERVER_SCHEMA_CLIENT_ID

    return definition


class EndpointEnumerator(generators.EndpointEnumerator):
    api_url_prifix = f'^{settings.API_URL}/'

    def get_api_endpoints(self, *args, **kwargs):
        if 'prefix' in kwargs and (not kwargs['prefix'].startswith(self.api_url_prifix)):
            return []
        return super().get_api_endpoints(*args, **kwargs)


class VSTSchemaGenerator(generators.OpenAPISchemaGenerator):
    endpoint_enumerator_class = EndpointEnumerator

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not self.version:
            self.version = settings.VST_API_VERSION
        self.required_security_definitions = set()

    def _get_hooks(self):
        return map(
            raise_context_decorator_with_default(),
            filter(
                bool,
                map(
                    raise_context_decorator_with_default()(import_string),
                    getattr(settings, 'OPENAPI_HOOKS', ())
                )
            )
        )

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
                (f'A unique {type_info["type"]} value identifying '
                 f'instance of this {query_name} sublist.'),
        })
        return type_info

    def _get_manager_name(self, param, view_cls):
        name, _ = self._get_subname(param['name'])
        if not hasattr(view_cls, f'{name}_detail'):
            return None
        sub_view = getattr(view_cls, f'{name}_detail', None)
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
            return None
        return self._update_param_model(param, model, query_name=manager_name)

    def get_path_parameters(self, path, view_cls):
        parameters = super().get_path_parameters(path, view_cls)
        queryset = getattr(view_cls, 'queryset', None)
        for param in parameters:
            model, model_field = field_insp.get_queryset_field(queryset, param['name'])
            if self._update_param_model(param, model, model_field):
                continue
            elif self._update_param_view(param, model, view_cls):
                continue  # nocv
        return parameters

    def should_include_endpoint(self, path, method, view, public):
        nested_view, sub_action = _get_nested_view_and_subaction(view)
        if nested_view and sub_action:
            view = get_nested_view_obj(view, nested_view, sub_action, method)
        return super().should_include_endpoint(path, method, view, public)

    def get_operation(self, *args, **kwargs):
        operation = super().get_operation(*args, **kwargs)
        for secDef in operation.get('security') or []:
            self.required_security_definitions.add(tuple(secDef.keys())[0])
        return operation

    def get_paths(self, endpoints, components, request, public):
        # pylint: disable=too-many-locals
        if not endpoints:
            return openapi.Paths(paths={}), ''

        prefix = self.determine_path_prefix(list(endpoints.keys())) or ''
        assert '{' not in prefix, "base path cannot be templated in swagger 2.0"

        paths = {}
        for path, (view_cls, methods) in sorted(endpoints.items()):
            operations = {}
            extra_path_data = {}
            for method, view in methods:
                if not self.should_include_endpoint(path, method, view, public):
                    continue

                action_name = getattr(view, 'action', None)
                if action_name and (action_object := getattr(getattr(view, action_name, None), 'action', None)):
                    extra_path_data.update(action_object.get_extra_path_data(method))
                operation = self.get_operation(view, path, prefix, method, components, request)
                if operation is not None:
                    operations[method.lower()] = operation

            if operations:
                # since the common prefix is used as the API basePath, it must be stripped
                # from individual paths when writing them into the swagger document
                path_suffix = path[len(prefix):]
                if not path_suffix.startswith('/'):
                    # copied from original method
                    # may be unnecessary
                    path_suffix = '/' + path_suffix  # nocv
                path_item = self.get_path_item(path, view_cls, operations)
                if extra_path_data:
                    path_item.update(extra_path_data)
                paths[path_suffix] = path_item

        return self.get_paths_object(paths), prefix

    def get_operation_keys(self, subpath, method, view):
        keys = super().get_operation_keys(subpath, method, view)
        subpath_keys = list(filter(bool, subpath.split('/')))
        r_type, gist = keys[-1], keys[-2]
        if method.upper() == 'GET' and '_detail' in r_type:
            keys = keys[:-1] + ['_'.join(r_type.split('_')[:-1])] + ['get']
        if r_type == 'get' and subpath_keys[-1] == gist:
            if any(f for f in dir(view) if f.endswith('_'.join([gist, 'list']))):
                keys[-1] = 'list'
        return keys

    def get_schema(self, request: drf_request.Request = None, *args, **kwargs):  # type: ignore
        # pylint: disable=signature-differs
        if not getattr(request, 'version', ''):
            request.version = self.version
        result = super().get_schema(request, *args, **kwargs)

        # Security definitions
        if 'oauth2' in self.required_security_definitions:
            result['securityDefinitions']['oauth2'] = get_oauth2_security_definition(request)
        if 'session' in self.required_security_definitions:
            result['securityDefinitions']['session'] = {
                'type': 'apiKey',
                'name': settings.SESSION_COOKIE_NAME,
                'in': 'cookie',
            }
        if 'basic' in self.required_security_definitions:
            result['securityDefinitions']['basic'] = {
                'type': 'basic',
            }

        # Add to schema centrifugo params
        if request and getattr(request, 'accepted_media_type', None) == 'application/openapi+json':
            result['info']['x-user-id'] = request.user.pk
            if (notificator := getattr(request, 'notificator', None)) and request.user.is_authenticated:
                secret = notificator.get_openapi_secret()
                if secret and request.user.pk:
                    result['info']['x-centrifugo-token'] = jwt.encode(
                        header={'alg': 'HS256', 'typ': 'JWT'},
                        payload={
                            "sub": request.session.session_key,
                            "exp": int(time.time() + request.session.get_expiry_age()),
                            "info": {
                                'user_id': request.user.pk
                            }
                        },
                        key=OctKey.import_key(secret),
                    ).decode()
                    result['info']['x-centrifugo-address'] = get_centrifugo_public_address(request)

        # Run hooks for schema customisation
        for hook in self._get_hooks():
            result = copy.deepcopy(result)
            hook(request=request, schema=result)

        return result
