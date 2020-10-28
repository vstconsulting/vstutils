import typing as _t

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.db import transaction
from django_filters import BooleanFilter, CharFilter
from rest_framework import serializers, exceptions, request as drf_request, permissions as rest_permissions
from vstutils.api import fields, base, permissions, responses, decorators as deco
from vstutils.api.filters import DefaultIDFilter, name_filter, name_help
from vstutils.api.serializers import VSTSerializer, DataSerializer

User = get_user_model()


class UserSerializer(VSTSerializer):
    is_active = serializers.BooleanField(default=True)
    is_staff = serializers.BooleanField(default=False)
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

    def create(self, data):
        """ Create user from validated data. """

        if not self.context['request'].user.is_staff:
            raise exceptions.PermissionDenied  # nocv
        valid_fields = [
            'username', 'password', 'is_active', 'is_staff',
            "email", "first_name", "last_name"
        ]
        creditals = {
            d: data[d] for d in valid_fields
            if data.get(d, None) is not None
        }
        raw_passwd = self.initial_data.get("raw_password", "False")
        user = super().create(creditals)
        if not raw_passwd == "True":
            user.set_password(creditals['password'])
            user.save()
        return user

    def is_valid(self, raise_exception=False):
        if self.instance is None:
            try:
                initial_data = self.initial_data
                User.objects.get(username=initial_data.get('username', None))
                raise self.UserExist({'username': ["Already exists."]})
            except User.DoesNotExist:
                pass
        return super().is_valid(raise_exception)

    def update(self, instance, validated_data):
        if not self.context['request'].user.is_staff and instance.id != self.context['request'].user.id:
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
    password = fields.VSTCharField(write_only=True)
    password2 = fields.VSTCharField(write_only=True, label='Repeat password')

    class Meta(OneUserSerializer.Meta):
        fields = list(OneUserSerializer.Meta.fields) + ['password', 'password2']

    def run_validation(self, data=serializers.empty):
        validated_data = super().run_validation(data)
        if validated_data['password'] != validated_data.pop('password2', None):
            raise exceptions.ValidationError('Passwords do not match.')
        return validated_data


class ChangePasswordSerializer(DataSerializer):
    old_password = serializers.CharField(required=True)
    password = serializers.CharField(required=True, label='New password')
    password2 = serializers.CharField(required=True, label='Confirm new password')

    def update(self, instance, validated_data):
        if not instance.check_password(validated_data['old_password']):
            raise exceptions.PermissionDenied('Password is not correct.')
        if validated_data['password'] != validated_data['password2']:
            raise exceptions.ValidationError("New passwords' values are not equal.")
        instance.set_password(validated_data['password'])
        instance.save()
        return instance

    def to_representation(self, value):
        return {
            'old_password': '***',
            'password': '***',
            'password2': '***'
        }


class UserFilter(DefaultIDFilter):
    is_active = BooleanFilter(help_text='Boolean value meaning status of user.')
    first_name = CharFilter(help_text='Users first name.')
    last_name = CharFilter(help_text='Users last name.')
    email = CharFilter(help_text="Users e-mail value.")
    username__not = CharFilter(method=name_filter, help_text=name_help)
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
    '''
    API endpoint that allows users to be viewed or edited.
    '''
    # pylint: disable=invalid-name

    model: _t.Type[AbstractUser] = User
    serializer_class: _t.Type[UserSerializer] = UserSerializer
    serializer_class_one: _t.Type[OneUserSerializer] = OneUserSerializer
    serializer_class_create: _t.Type[CreateUserSerializer] = CreateUserSerializer
    serializer_class_change_password: _t.Type[DataSerializer] = ChangePasswordSerializer
    filterset_class = UserFilter
    permission_classes = (permissions.SuperUserPermission,)

    def destroy(self, request: drf_request.Request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
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

    @deco.action(["post"], detail=True, permission_classes=(rest_permissions.IsAuthenticated,))
    def change_password(self, request: drf_request.Request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object(), data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return responses.HTTP_201_CREATED(serializer.data)
