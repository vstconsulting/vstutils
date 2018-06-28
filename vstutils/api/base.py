import sys
import logging
import traceback
from collections import namedtuple
import six
from django.conf import settings
from django.core import exceptions as djexcs
from django.http.response import Http404
from django.db.models.query import QuerySet
from django.db import transaction
from rest_framework.reverse import reverse
from rest_framework import viewsets as vsets, views as rvs, exceptions, status
from rest_framework.response import Response as RestResponse
from rest_framework.decorators import action
from ..exceptions import VSTUtilsException
from ..utils import classproperty

_ResponseClass = namedtuple("ResponseData", [
    "data", "status"
])


logger = logging.getLogger(settings.VST_PROJECT)


def exception_handler(exc, context):
    logger.info(traceback.format_exc())
    default_exc = (exceptions.APIException, djexcs.PermissionDenied)
    if isinstance(exc, djexcs.PermissionDenied):  # pragma: no cover
        return RestResponse({"detail": str(exc)},
                            status=status.HTTP_403_FORBIDDEN)
    elif isinstance(exc, Http404):
        return RestResponse({"detail": getattr(exc, 'msg', str(exc))},
                            status=status.HTTP_404_NOT_FOUND)
    elif isinstance(exc, djexcs.ValidationError):  # nocv
        if hasattr(exc, 'error_dict'):
            errors = dict(exc)
        elif hasattr(exc, 'error_list'):
            errors = {'other_errors': list(exc)}
        else:
            errors = {'other_errors': str(exc)}
        return RestResponse({"detail": errors}, status=status.HTTP_400_BAD_REQUEST)
    elif isinstance(exc, VSTUtilsException):  # nocv
        return RestResponse(
            {"detail": exc.msg, 'error_type': sys.exc_info()[0].__name__},
            status=exc.status
        )
    elif not isinstance(exc, default_exc) and isinstance(exc, Exception):
        return RestResponse({'detail': str(sys.exc_info()[1]),
                             'error_type': sys.exc_info()[0].__name__},
                            status=status.HTTP_400_BAD_REQUEST)

    default_response = rvs.exception_handler(exc, context)

    if isinstance(exc, exceptions.NotAuthenticated):  # nocv
        default_response["X-Anonymous"] = "true"

    return default_response


class Response(_ResponseClass):

    def _asdict(self):
        data = super(Response, self)._asdict()
        data["status"] = data.get("status", status.HTTP_200_OK)
        if isinstance(data["data"], (six.string_types, six.text_type)):
            data["data"] = dict(detail=self.data)
        return data

    @property
    def resp(self):
        return RestResponse(**self._asdict())

    @property
    def resp_dict(self):  # nocv
        return self._asdict()


def __get_nested_path(name, arg=None):
    path = name
    if not arg:
        return path
    path += '/?(?P<'
    path += arg
    path += '>[0-9]*)/?'
    return path


def nested_action(name, arg=None, methods=None, manager_name=None, *args, **kwargs):
    methods = methods or ['get', 'post', 'put', 'patch', 'delete']
    path = __get_nested_path(name, arg)
    allow_append = bool(kwargs.pop('allow_append', False))

    def decorator(func):
        def wrapper(view, request, *args, **kwargs):
            view.nested_name = name
            view.nested_parent_object = view.get_object()
            view.nested_allow_append = allow_append
            view.nested_arg = arg
            view.nested_id = kwargs.get(view.nested_arg, None)
            view.nested_manager = getattr(
                view.nested_parent_object, manager_name or name, None
            )
            return func(view, request, *args)

        wrapper.__name__ = func.__name__
        kwargs['methods'] = methods
        kwargs['detail'] = True
        kwargs['url_path'] = path
        kwargs['url_name'] = name
        return action(*args, **kwargs)(wrapper)

    return decorator


class QuerySetMixin(rvs.APIView):
    _queryset = None
    model = None

    @classproperty
    def queryset(self):
        # pylint: disable=method-hidden
        if self._queryset is not None:
            return getattr(self._queryset, 'cleared', self._queryset.all)()
        qs = self.model.objects.all()
        return getattr(qs, 'cleared', qs.all)()

    @queryset.setter
    def queryset(self, value):
        self._queryset = value

    def _base_get_queryset(self):
        assert self.queryset is not None, (
            "'%s' should either include a `queryset` attribute, "
            "or override the `get_queryset()` method."
            % self.__class__.__name__
        )

        queryset = self.queryset
        if isinstance(queryset, QuerySet):
            # Ensure queryset is re-evaluated on each request.
            queryset = queryset.all()
        return queryset

    def get_extra_queryset(self):
        return self.queryset

    def get_queryset(self):
        if self.queryset is None:  # nocv
            assert self.model is not None, (
                "'%s' should either include a `queryset` or `model` attribute,"
                " or override the `get_queryset()` method."
                % self.__class__.__name__
            )
            qs = self.model.objects.all()
            self.queryset = getattr(qs, 'cleared', qs.all)()
        if self.kwargs.get("pk", None) is None:
            self.queryset = self.get_extra_queryset()
        return self._base_get_queryset()


class GenericViewSet(QuerySetMixin, vsets.GenericViewSet):
    # lookup_field = 'id'
    serializer_class_one = None
    model = None

    def get_serializer_class(self):
        if self.request and (
                self.kwargs.get("pk", False) or self.action in ["create"] or
                int(self.request.query_params.get("detail", u"0"))
        ):
            if self.serializer_class_one is not None:
                return self.serializer_class_one
        return super(GenericViewSet, self).get_serializer_class()

    def get_route_object(self, queryset, id):
        find_kwargs = {getattr(self, 'nested_arg', 'id'): id}
        try:
            return queryset.all().get(**find_kwargs)
        except djexcs.ObjectDoesNotExist:
            raise exceptions.NotFound()

    def filter_route_queryset(self, queryset, filter_classes=None):
        if filter_classes is not None:
            if not isinstance(filter_classes, (list, tuple)):
                filter_classes = [filter_classes]
            for filter_class in list(filter_classes):
                queryset = filter_class(
                    self.request.query_params, queryset=queryset, request=self.request
                ).qs
        return queryset

    def get_route_serializer(self, serializer_class, *args, **kwargs):
        kwargs['context'] = kwargs.get('context', self.get_serializer_context())
        return serializer_class(*args, **kwargs)

    def get_paginated_route_response(self, queryset, serializer_class,
                                     filter_classes=None, **kwargs):
        queryset = self.filter_route_queryset(queryset.all(), filter_classes)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = serializer_class(page, many=True, **kwargs)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_route_serializer(queryset, many=True, **kwargs)
        return RestResponse(serializer.data)

    def get_route_instance(self, instance, serializer_class):
        serializer = self.get_route_serializer(serializer_class, instance)
        return Response(serializer.data, status.HTTP_200_OK).resp

    def _add_or_create_nested(self, queryset, data):
        if not self.nested_allow_append:
            return queryset.create(**data)
        try:
            obj = queryset.model.objects.get(**data)
        except djexcs.ObjectDoesNotExist:
            obj = queryset.create(**data)
        queryset.add(obj)
        return obj

    @transaction.atomic()
    def create_route_instance(self, queryset, request, serializer_class):
        serializer = self.get_route_serializer(serializer_class, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer = self.get_route_serializer(
            serializer_class,
            self._add_or_create_nested(queryset, serializer.validated_data)
        )
        return Response(serializer.data, status.HTTP_201_CREATED).resp

    @transaction.atomic()
    def update_route_instance(self, instance, request, serializer_class, partial=None):
        serializer = self.get_route_serializer(
            serializer_class, instance, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if getattr(instance, '_prefetched_objects_cache', None):
            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the prefetch cache on the instance.
            instance._prefetched_objects_cache = {}

        return Response(serializer.data, status.HTTP_200_OK).resp

    @transaction.atomic()
    def delete_route_instance(self, manager, instance):
        if self.nested_allow_append:
            manager.remove(instance)
        else:
            instance.delete()
        return RestResponse(status=status.HTTP_204_NO_CONTENT)

    def nested_allow_check(self):
        '''
        Just raise or pass
        :return:
        '''
        pass

    def dispatch_route_instance(self, serializer_class, filter_classes, request, **kw):
        self.nested_allow_check()
        obj_id = kw.get(getattr(self, 'nested_arg', 'id'), None)
        obj_id = obj_id or getattr(self, 'nested_id', obj_id)
        manager = kw.get('manager', None) or getattr(self, 'nested_manager', None)
        method = request.method.lower()
        if isinstance(serializer_class, (list, tuple)):
            serializer_class_list = serializer_class[0]
            serializer_class_one = serializer_class[-1]
        else:
            serializer_class_list = serializer_class
            serializer_class_one = serializer_class

        if method == 'post':
            return self.create_route_instance(manager, request, serializer_class_list)
        elif method == 'get' and not obj_id:
            return self.get_paginated_route_response(
                manager, serializer_class_list, filter_classes
            )
        elif method == 'get' and obj_id:
            return self.get_route_instance(
                self.get_route_object(manager, obj_id), serializer_class_one
            )
        elif method == 'put' and obj_id:
            return self.update_route_instance(
                self.get_route_object(manager, obj_id), request, serializer_class_one
            )
        elif method == 'patch' and obj_id:
            return self.update_route_instance(
                self.get_route_object(manager, obj_id), request, serializer_class_one, 1
            )
        elif method == 'delete' and obj_id:
            return self.delete_route_instance(
                manager, self.get_route_object(manager, obj_id)
            )

        raise exceptions.NotFound()

    @action(methods=["post"], detail=False)
    def filter(self, request):
        '''
        Return django-queryset filtered list. [experimental]
        '''
        queryset = self.filter_queryset(self.get_queryset())
        queryset = queryset.filter(**request.data.get("filter", {}))
        queryset = queryset.exclude(**request.data.get("exclude", {}))

        return self.get_paginated_route_response(
            queryset=queryset,
            serializer_class=self.get_serializer_class()
        )


class ModelViewSetSet(GenericViewSet, vsets.ModelViewSet):
    '''
    API endpoint thats operates models objects.
    '''

    # lookup_field = 'id'

    def create(self, request, *args, **kwargs):
        '''
        API endpoint to create instance.
        '''

        return super(ModelViewSetSet, self).create(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        '''
        API endpoint to represent instance detailed data.
        '''

        return super(ModelViewSetSet, self).retrieve(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):  # nocv
        '''
        API endpoint to update all instance fields.
        '''

        return super(ModelViewSetSet, self).update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):  # nocv
        '''
        API endpoint to update part of all instance fields.
        '''

        return super(ModelViewSetSet, self).partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        '''
        API endpoint to instance.
        '''

        return super(ModelViewSetSet, self).destroy(request, *args, **kwargs)


class NonModelsViewSet(GenericViewSet):
    base_name = None

    def get_queryset(self):
        return QuerySet()  # nocv


class ListNonModelViewSet(NonModelsViewSet, vsets.mixins.ListModelMixin):
    '''
    API endpoint that returns list of submethods.

    list:
    Returns json with view submethods name and link.
    '''
    # pylint: disable=abstract-method
    schema = None

    @property
    def methods(self):
        this_class_dict = ListNonModelViewSet.__dict__
        obj_class_dict = self.__class__.__dict__
        new_methods = list()
        for name, attr in obj_class_dict.items():
            detail = getattr(attr, 'detail', True)
            if name not in this_class_dict and not detail:
                new_methods.append(name.replace('_', "-"))
        return new_methods

    def list(self, request, *args, **kwargs):
        routes = {
            method: reverse("{}-{}".format(self.base_name, method),
                            request=request)
            for method in self.methods
        }
        return Response(routes, status.HTTP_200_OK).resp


class ReadOnlyModelViewSet(GenericViewSet, vsets.ReadOnlyModelViewSet):
    '''
    API endpoint with list of model objects for read only operations.

    list:
    Return list of all objects.
    '''


class HistoryModelViewSet(ReadOnlyModelViewSet, vsets.mixins.DestroyModelMixin):
    '''
    API endpoint with list of historical model objects for read and remove operations.

    destroy:
    Remove object from DB.

    list:
    Return list of all objects.
    '''
