import typing as _t
from copy import deepcopy

import pyotp
from django.contrib.auth import get_user_model, update_session_auth_hash
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import AbstractUser
from django.db import transaction
from django.conf import settings
from django.utils.functional import SimpleLazyObject, cached_property
from django_filters import BooleanFilter, CharFilter
from rest_framework import serializers, exceptions, request as drf_request
from vstutils.api import fields, base, permissions, responses, decorators as deco
from vstutils.api.filters import DefaultIDFilter, name_filter, name_help
from vstutils.api.serializers import VSTSerializer, DataSerializer, BaseSerializer, update_declared_fields
from vstutils.api.models import TwoFactor, RecoveryCode, UserSettings
from vstutils.utils import raise_context_decorator_with_default, translate, lazy_translate as __

User: _t.Type[AbstractUser] = get_user_model()  # type: ignore[override]


class ChangePasswordPermission(permissions.IsAuthenticatedOpenApiRequest):  # type: ignore
    def has_object_permission(self, request: drf_request.Request, view: base.GenericViewSet, obj: User):  # type: ignore
        return (
            request.user.is_superuser or
            (
                isinstance(obj, request.user.__class__) and
                request.user.pk == obj.pk  # type: ignore
            )
        )


class UserSerializer(VSTSerializer):
    is_active = serializers.BooleanField(default=True)
    is_staff = serializers.BooleanField(default=False, read_only=True)
    email = serializers.EmailField(required=False)

    class UserExist(exceptions.ValidationError):
        status_code = 409

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'is_active',
            'is_staff',
            'email',
        )
        read_only_fields = ('is_superuser',)
        ref_name = 'User'

    def get_fields(self):
        serializer_fields = super().get_fields()
        request = self.context.get('request')
        if 'is_staff' in serializer_fields and request is not None and request.user.is_superuser:
            serializer_fields = deepcopy(serializer_fields)
            serializer_fields['is_staff'].read_only = False
        return serializer_fields

    @cached_property
    @raise_context_decorator_with_default(default=False)
    def is_staff_or_super(self):
        return self.context['request'].user.is_staff or self.context['request'].user.is_superuser

    def create(self, validated_data):
        """ Create user from validated data. """

        if not self.is_staff_or_super:
            raise exceptions.PermissionDenied  # nocv

        validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if not self.is_staff_or_super and instance.id != self.context['request'].user.id:
            # can't be tested because PATCH from non privileged user to other
            # user fails at self.get_object() in View
            raise exceptions.PermissionDenied  # nocv
        instance.username = validated_data.get('username', instance.username)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.email = validated_data.get('email', instance.email)
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.is_staff = validated_data.get('is_staff', instance.is_staff)
        instance.save()
        return instance


class OneUserSerializer(UserSerializer):
    class Meta:
        model = User
        fields: _t.Union[_t.List[_t.Text], _t.Tuple] = (
            'id',
            'username',
            'is_active',
            'is_staff',
            'first_name',
            'last_name',
            'email',
        )
        read_only_fields = (
            'is_superuser',
            'date_joined',
        )


class CreateUserSerializer(OneUserSerializer):
    password = fields.PasswordField(write_only=True)
    password2 = fields.PasswordField(write_only=True, label='Repeat password')

    class Meta(OneUserSerializer.Meta):
        fields = list(OneUserSerializer.Meta.fields) + ['password', 'password2']

    def run_validation(self, data=serializers.empty):
        validated_data = super().run_validation(data)
        if validated_data['password'] != validated_data.pop('password2', None):
            raise exceptions.ValidationError({
                "password": [translate('Passwords do not match.')],
            })
        return validated_data


class ChangePasswordSerializer(DataSerializer):
    old_password = fields.PasswordField(required=True)
    password = fields.PasswordField(required=True, label='New password')
    password2 = fields.PasswordField(required=True, label='Confirm new password')

    def update(self, instance, validated_data):
        if not instance.check_password(validated_data['old_password']):
            raise exceptions.AuthenticationFailed()
        if validated_data['password'] != validated_data['password2']:
            raise exceptions.ValidationError(
                translate("New passwords values are not equal.")
            )
        validate_password(validated_data['password'])
        instance.set_password(validated_data['password'])
        instance.save()
        return instance

    def to_representation(self, instance):
        return {
            'old_password': '***',
            'password': '***',
            'password2': '***'
        }


class TwoFASerializer(VSTSerializer):
    enabled = serializers.BooleanField(read_only=True)
    secret = serializers.CharField(write_only=True, default=None, allow_null=True)
    pin = serializers.CharField(write_only=True, required=False, label='Enter the six-digit code from the application')
    recovery = serializers.CharField(write_only=True, required=False)

    default_error_messages = {
        'invalid_pin': __('Invalid authentication code'),  # type: ignore
        'no_secret_provided': __('Secret string must be provided'),  # type: ignore
    }

    class Meta:
        model = TwoFactor
        fields = (
            'enabled',
            'secret',
            'pin',
            'recovery',
        )

    def verify_pin(self, secret, pin):
        if not secret:
            self.fail('no_secret_provided')
        if not pyotp.TOTP(secret).verify(pin):
            self.fail('invalid_pin')

    @transaction.atomic()
    def create(self, validated_data: dict):
        recovery_codes = validated_data.pop('recovery', '')
        self.verify_pin(validated_data.get('secret'), validated_data.pop('pin', ''))
        instance = super().create(validated_data)
        RecoveryCode.objects.bulk_create([
            RecoveryCode(key=code, tfa=instance)
            for code in tuple(filter(bool, recovery_codes.split(',')))[:15]
        ])
        return instance

    def update(self, instance, validated_data):
        instance.delete()
        instance.secret = None  # type: ignore
        return instance


class LanguageFromRequestDefault:
    requires_context = True

    def __call__(self, serializer_field):
        return serializer_field.context['request'].language.code


class MainSettingsSerializer(BaseSerializer):
    language = serializers.ChoiceField(choices=settings.LANGUAGES, default=LanguageFromRequestDefault())  # type: ignore
    dark_mode = serializers.BooleanField(default=False)

    class Meta:
        ref_name = '_MainSettings'


class UserSettingsSerializer(BaseSerializer):
    main = MainSettingsSerializer(default={})
    custom = serializers.JSONField(default={})

    class Meta:
        ref_name = '_UserSettings'


class UserFilter(DefaultIDFilter):
    is_active = BooleanFilter(help_text=__('Boolean value meaning status of user.'))
    first_name = CharFilter(help_text=__('Users first name.'))
    last_name = CharFilter(help_text=__('Users last name.'))
    email = CharFilter(help_text=__("Users e-mail value."))
    username__not = CharFilter(method=name_filter, help_text=name_help, label=__('Username not'))
    username = CharFilter(method=name_filter, help_text=name_help)

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'is_active',
            'first_name',
            'last_name',
            'email',
        )


class UserViewSet(base.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """
    # pylint: disable=invalid-name

    model: _t.Type[AbstractUser] = User
    serializer_class: _t.Type[UserSerializer] = update_declared_fields(UserSerializer)  # type: ignore
    serializer_class_one: _t.Type[OneUserSerializer] = update_declared_fields(OneUserSerializer)  # type: ignore
    serializer_class_create: _t.Type[CreateUserSerializer] = update_declared_fields(  # type: ignore
        CreateUserSerializer
    )
    serializer_class_change_password: _t.Type[DataSerializer] = ChangePasswordSerializer
    serializer_class_twofa: _t.Type[serializers.BaseSerializer] = update_declared_fields(  # type: ignore
        TwoFASerializer
    )
    serializer_class__settings: _t.Type[serializers.BaseSerializer] = UserSettingsSerializer
    filterset_class = UserFilter
    permission_classes = (permissions.SuperUserPermission,)
    optimize_get_by_values = False

    @property
    def search_fields(self):
        return tuple(
            filter(
                self.filterset_class.Meta.fields.__contains__,
                ('username', 'email', 'phone', 'first_name', 'last_name')
            )
        )

    def get_object(self) -> AbstractUser:
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        if self.kwargs.get(lookup_url_kwarg, None) == 'profile':
            self.kwargs[lookup_url_kwarg] = getattr(self.request.user, self.lookup_field)
        return super().get_object()

    def destroy(self, request: drf_request.Request, *args, **kwargs):
        user = self.get_object()
        if user == request.user and not settings.ENABLE_USER_SELF_REMOVE:
            return responses.HTTP_409_CONFLICT("Could not remove youself.")
        return super().destroy(request, *args, **kwargs)  # pylint: disable=no-member

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

    @deco.action(["post"], detail=True, permission_classes=(ChangePasswordPermission,))
    def change_password(self, request: drf_request.Request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        update_session_auth_hash(request, user)
        return responses.HTTP_201_CREATED(serializer.data)

    @deco.action(['get', 'put'], detail=True, permission_classes=(ChangePasswordPermission,))
    def twofa(self, request: drf_request.Request, *args, **kwargs):
        user: User = self.get_object()  # type: ignore
        instance = getattr(user, 'twofa', None)

        if request.method.upper() == 'PUT':  # type: ignore
            serializer = self.get_serializer(instance, data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(user=user)
            request.session['2fa'] = True
        else:
            serializer = self.get_serializer(
                instance or
                SimpleLazyObject(lambda: TwoFactor(user=user))
            )

        return responses.HTTP_200_OK(serializer.data)

    @deco.action(['get', 'put'], detail=True, permission_classes=(ChangePasswordPermission,))
    def _settings(self, request: drf_request.Request, *args, **kwargs):
        instance, _ = UserSettings.objects.get_or_create(
            user=self.get_object(),
            defaults=SimpleLazyObject(lambda: {'value': self.get_serializer({}).data})  # type: ignore
        )

        if request.method.upper() == 'PUT':  # type: ignore
            serializer = self.get_serializer(instance.value, data=request.data)
            serializer.is_valid(raise_exception=True)
            instance.value = serializer.save()
            instance.save()
        else:
            serializer = self.get_serializer(instance.value)

        return responses.HTTP_200_OK(serializer.data)
