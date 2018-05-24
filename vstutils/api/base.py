import sys
import logging
import traceback
from collections import namedtuple
import six
from django.conf import settings
from django.core import exceptions as djexcs
from django.http.response import Http404
from django.db.models.query import QuerySet
from rest_framework.reverse import reverse
from rest_framework import viewsets, views as rest_views, exceptions, status
from rest_framework.response import Response as RestResponse
from rest_framework.decorators import action

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
        return RestResponse({"detail": errors},
                            status=status.HTTP_400_BAD_REQUEST)
    elif not isinstance(exc, default_exc) and isinstance(exc, Exception):
        return RestResponse({'detail': str(sys.exc_info()[1]),
                             'error_type': sys.exc_info()[0].__name__},
                            status=status.HTTP_400_BAD_REQUEST)

    default_response = rest_views.exception_handler(exc, context)

    if isinstance(exc, exceptions.NotAuthenticated):  # nocv
        default_response["X-Anonymous"] = "true"

    return default_response


class Response(_ResponseClass):

    def _asdict(self):
        data = super(Response, self)._asdict()
        data["status"] = data.get("status", 200)
        if isinstance(data["data"], (six.string_types, six.text_type)):
            data["data"] = dict(detail=self.data)
        return data

    @property
    def resp(self):
        return RestResponse(**self._asdict())

    @property
    def resp_dict(self):  # nocv
        return self._asdict()


class QuerySetMixin(rest_views.APIView):
    queryset = None
    model = None

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
        if self.queryset is None:
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


class GenericViewSet(QuerySetMixin, viewsets.GenericViewSet):
    serializer_class_one = None
    model = None

    def get_serializer_class(self):
        if self.kwargs.get("pk", False) or self.action in ["create"] or \
                int(self.request.query_params.get("detail", u"0")):
            if self.serializer_class_one is not None:
                return self.serializer_class_one
        return super(GenericViewSet, self).get_serializer_class()

    def filter_route_queryset(self, queryset, filter_classes=None):  # nocv
        if filter_classes is not None:
            if not isinstance(filter_classes, (list, tuple)):
                filter_classes = [filter_classes]
            for filter_class in list(filter_classes):
                queryset = filter_class(self.request.query_params,
                                        queryset=queryset,
                                        request=self.request).qs
        return queryset

    def get_paginated_route_response(self, queryset, serializer_class,
                                     filter_classes=None, **kwargs):  # nocv
        queryset = self.filter_route_queryset(queryset, filter_classes)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = serializer_class(page, many=True, **kwargs)
            return self.get_paginated_response(serializer.data)

        serializer = serializer_class(queryset, many=True, **kwargs)
        return RestResponse(serializer.data)

    @action(methods=["post"], detail=False)
    def filter(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        queryset = queryset.filter(**request.data.get("filter", {}))
        queryset = queryset.exclude(**request.data.get("exclude", {}))

        return self.get_paginated_route_response(
            queryset=queryset,
            serializer_class=self.get_serializer_class(),
            context=self.get_serializer_context()
        )


class ModelViewSetSet(GenericViewSet, viewsets.ModelViewSet):
    pass


class NonModelsViewSet(GenericViewSet):
    base_name = None

    def get_queryset(self):
        return QuerySet()  # nocv


class ListNonModelViewSet(NonModelsViewSet,
                          viewsets.mixins.ListModelMixin):
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
        return Response(routes, 200).resp


class ReadOnlyModelViewSet(GenericViewSet,
                           viewsets.ReadOnlyModelViewSet):
    pass


class HistoryModelViewSet(GenericViewSet,
                          viewsets.ReadOnlyModelViewSet,
                          viewsets.mixins.DestroyModelMixin):
    pass
