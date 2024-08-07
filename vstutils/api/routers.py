# pylint: disable=no-member,redefined-outer-name,unused-argument
from django.urls.conf import include, re_path, path
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.utils.module_loading import import_string
from rest_framework import routers, permissions, versioning

from . import responses


class _AbstractRouter(routers.DefaultRouter):

    def __init__(self, *args, **kwargs):
        self.custom_urls = []
        self.permission_classes = kwargs.pop("perms", None)
        super().__init__(*args, **kwargs)

    def get_method_map(self, viewset, method_map):
        bound_methods = {}
        for method, action in method_map.items():
            if getattr(viewset, action, None) is not None:
                bound_methods[method] = action
        return bound_methods

    def _get_api_root_dict(self):
        return {
            reg[0]: self.routes[0].name.format(basename=reg[2])
            for reg in self.registry
        }

    def _get_custom_lists(self):
        return self.custom_urls

    def _get_views_custom_list(self, view_request, registers):
        routers_list = {}
        fpath = view_request.get_full_path().split("?")
        absolute_uri = view_request.build_absolute_uri(fpath[0])
        for prefix, _, name in self._get_custom_lists():
            path = ''.join([
                absolute_uri, prefix, f'?{fpath[1]}' if len(fpath) > 1 else ""
            ])
            routers_list[name] = path
        routers_list.update(registers.data)
        return routers_list

    def get_default_basename(self, viewset):
        base_name = getattr(viewset, 'base_name', None)
        if base_name is not None:
            return base_name
        queryset = getattr(viewset, 'queryset', None)
        model = getattr(viewset, 'model', None)
        if queryset is None:  # nocv
            assert model is not None, \
                '`base_name` argument not specified, and could ' \
                'not automatically determine the name from the viewset, as ' \
                'it does not have a `.queryset` or `.model` attribute.'
            return model._meta.object_name.lower()
        # can't be tested because this initialization takes place before any
        # test code can be run
        return super().get_default_basename(viewset)

    def register_view(self, prefix, view, name=None):
        if getattr(view, 'as_view', None):
            name = name or view().get_view_name().lower()
            self.custom_urls.append((prefix, view, name))
            return
        name = name or view.get_view_name().lower()
        self.custom_urls.append((prefix, view, name))

    def _unreg(self, prefix, objects_list):
        del self._urls
        index = 0
        for reg_prefix, _, _ in objects_list:
            if reg_prefix == prefix:
                del objects_list[index]
                break
            index += 1  # nocv
        return objects_list

    def unregister_view(self, prefix):
        self.custom_urls = self._unreg(prefix, self.custom_urls)  # nocv

    def unregister(self, prefix):
        self.registry = self._unreg(prefix, self.registry)

    def generate(self, views_list):
        for prefix, options in views_list.items():
            if 'view' in options:
                view = import_string(options['view'])
            elif 'model' in options:
                view = import_string(options['model']).generated_view

            args = [prefix, view]
            if 'name' in options:
                args.append(options['name'])
            elif getattr(view, 'base_name', None) is None:
                args.append(prefix)

            view_type = options.get('type', 'viewset')
            if view_type == 'viewset':
                self.register(*args)
            elif view_type == 'view':  # nocv
                self.register_view(*args)
            else:  # nocv
                raise ImproperlyConfigured(f'Unknown type of view for "{prefix}" with options: {options}')


class APIRouter(_AbstractRouter):
    default_root_view_name = 'v1'

    def __init__(self, *args, **kwargs):
        self.router_version_name = kwargs.pop('version', self.default_root_view_name)
        self.root_view_name = self.router_version_name
        super().__init__(*args, **kwargs)
        self.__register_openapi()

    def __register_openapi(self):
        schema_view = import_string(settings.OPENAPI_VIEW_CLASS)
        cache_timeout = settings.SCHEMA_CACHE_TIMEOUT
        swagger_kwargs = {'cache_timeout': 0 if settings.DEBUG or settings.TESTS_RUN else cache_timeout}
        self.register_view(
            '_openapi',
            schema_view.with_ui('swagger', **swagger_kwargs),
            name='_openapi'
        )

    def get_api_root_view(self, *args, **kwargs):

        class API(self.APIRootView):
            root_view_name = self.router_version_name
            if self.permission_classes:
                permission_classes = self.permission_classes
            custom_urls = self.custom_urls

            class versioning_class(versioning.BaseVersioning):
                # pylint: disable=invalid-name,no-self-argument

                def determine_version(self_ver, request, *args, **kwargs):
                    return self.router_version_name

            def get_view_name(self): return self.root_view_name

            def get(self_inner, request, *args, **kwargs):
                # pylint: disable=no-self-argument,protected-access
                data = self._get_views_custom_list(
                    request, super(API, self_inner).get(request, *args, **kwargs)
                )
                return responses.HTTP_200_OK(data)

        return API.as_view(api_root_dict=self._get_api_root_dict())

    def get_urls(self):
        urls = super().get_urls()
        for prefix, view, _ in self.custom_urls:
            # pylint: disable=cell-var-from-loop
            view = getattr(view, 'as_view', lambda: view)()
            urls.append(re_path(f"^{prefix}/$", view))
        return urls

    def generate(self, views_list):
        if r'_lang' not in views_list:
            views_list['_lang'] = {
                'view': 'vstutils.api.views.LangViewSet'
            }

        if r'user' not in views_list:
            views_list[r'user'] = {
                'view': 'vstutils.api.auth.UserViewSet'
            }

        super().generate(views_list)


class MainRouter(_AbstractRouter):
    routers = []

    def _get_custom_lists(self):
        return super()._get_custom_lists() + self.routers

    def get_api_root_view(self, *args, **kwargs):

        class API(self.APIRootView):
            if self.permission_classes:
                permission_classes = self.permission_classes
            routers = self.routers
            custom_urls = self.custom_urls
            versioning_class = None
            view_name = f'{settings.PROJECT_GUI_NAME} REST API'

            def get_view_name(self): return 'REST API'

            def get(self_inner, request, *args, **kwargs):
                # pylint: disable=no-self-argument,protected-access
                links = self._get_views_custom_list(
                    request, super(API, self_inner).get(request, *args, **kwargs)
                )
                data = {
                    'description': self_inner.view_name,
                    'current_version': links[settings.VST_API_VERSION],
                    'available_versions': {
                        name: value
                        for name, value in links.items()
                        if name in settings.API
                    }
                }
                for link, link_value in links.items():
                    if link not in data['available_versions']:
                        data[link] = link_value
                return responses.HTTP_200_OK(data)

        return API.as_view(api_root_dict=self._get_api_root_dict())

    def register_router(self, prefix, router, name=None):
        name = name or getattr(router, 'router_version_name', router.root_view_name)
        self.routers.append((prefix, router, name))

    def unregister_router(self, prefix):
        self.routers = self._unreg(prefix, self.routers)  # nocv

    def get_urls(self):
        urls = super().get_urls()
        for prefix, router, name in self.routers:
            urls.append(path(
                prefix,
                include(
                    (router.urls, settings.VST_PROJECT),
                    namespace=getattr(router, 'router_version_name', name)
                )
            ))
        for prefix, view, name in self.custom_urls:
            # can't be tested because this initialization takes place before
            # any test code can be run
            # pylint: disable=cell-var-from-loop
            view = getattr(view, 'as_view', lambda: view)()
            urls.append(re_path(f"^{prefix}/$", view, name=name))
        return urls

    def generate_routers(self, api):
        for version, views_list in api.items():
            router = APIRouter(perms=(permissions.IsAuthenticated,), version=version)
            router.generate(views_list)
            self.register_router(version+'/', router)

        # Register view for new bulk requests
        self.register_view(
            r'endpoint',
            import_string(settings.ENDPOINT_VIEW_CLASS),
            'endpoint'
        )
