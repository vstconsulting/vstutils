# pylint: disable=unused-argument
import typing as _t

from django.conf import settings
from django.http import Http404
from rest_framework import (
    permissions as rest_permissions,
    throttling,
    request as drf_request,
    serializers as drf_serializers
)

from . import base, serializers, decorators as deco, responses, models
from .decorators import subaction
from ..utils import import_class


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


class TranslationSerializer(serializers.VSTSerializer):
    """
    Serializer for API Endpoint that translates given phrase using dictionaries from vstutils/translations
    """
    original = drf_serializers.CharField()
    translated = drf_serializers.CharField(read_only=True)

    class Meta:
        model: _t.Type[models.Language] = models.Language
        fields: _t.Tuple = (
            'original',
            'translated'
        )

    def update(self, instance: models.Language, validated_data):
        original = validated_data['original']
        instance.original = original
        instance.translated = instance.translate(original)
        return instance


class SettingsViewSet(base.ListNonModelViewSet):
    """
    API endpoint that returns application settings.
    """
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
        """
        Return localization settings.
        """
        return responses.HTTP_200_OK(self._get_localization_settings())

    @deco.action(methods=['get'], detail=False)
    def system(self, request: drf_request.Request):
        """
        Return system settings like interpreter or libs version.
        """
        return responses.HTTP_200_OK(self._get_system_settings())


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


class LangViewSet(base.CachableHeadMixin, base.ReadOnlyModelViewSet):
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

    @subaction(
        methods=['post'],
        detail=True,
        serializer_class=TranslationSerializer,
    )
    def translate(self, request, pk=None):
        """
        detail action method for translating given phrases using dictionaries.
        """
        serializer = self.get_serializer(self.get_object(), data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return responses.HTTP_201_CREATED(serializer.data)
