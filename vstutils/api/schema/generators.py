from rest_framework import request as drf_request
from django.conf import settings
from drf_yasg2 import generators
from drf_yasg2.inspectors import field as field_insp


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
                continue
        return parameters

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
            request.version = self.version  # type: ignore
        result = super().get_schema(request, *args, **kwargs)
        if request:
            result['info']['x-user-id'] = request.user.id
        return result
