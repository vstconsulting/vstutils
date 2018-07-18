# pylint: disable=no-member,unused-argument
from __future__ import unicode_literals

from django.contrib.auth.models import User
from rest_framework import serializers, exceptions


class BaseSerializer(serializers.Serializer):
    # pylint: disable=abstract-method
    pass


class VSTSerializer(serializers.ModelSerializer):
    # pylint: disable=abstract-method
    pass


class UserSerializer(VSTSerializer):
    is_active = serializers.BooleanField(default=True)
    is_staff = serializers.BooleanField(default=False)

    class UserExist(exceptions.ValidationError):
        status_code = 409

    class Meta:
        model = User
        fields = ('id',
                  'username',
                  'is_active',
                  'is_staff',
                  'url',)
        read_only_fields = ('is_superuser',)

    def create(self, data):
        if not self.context['request'].user.is_staff:
            raise exceptions.PermissionDenied  # nocv
        valid_fields = ['username', 'password', 'is_active', 'is_staff',
                        "email", "first_name", "last_name"]
        creditals = {d: data[d] for d in valid_fields
                     if data.get(d, None) is not None}
        raw_passwd = self.initial_data.get("raw_password", "False")
        user = super(UserSerializer, self).create(creditals)
        if not raw_passwd == "True":
            user.set_password(creditals['password'])
            user.save()
        return user

    def is_valid(self, raise_exception=False):
        if self.instance is None:
            try:
                User.objects.get(username=self.initial_data.get('username', None))
                raise self.UserExist({'username': ["Already exists."]})
            except User.DoesNotExist:
                pass
        return super(UserSerializer, self).is_valid(raise_exception)

    def update(self, instance, validated_data):
        if not self.context['request'].user.is_staff and \
                        instance.id != self.context['request'].user.id:
            # can't be tested because PATCH from non privileged user to other
            # user fails at self.get_object() in View
            raise exceptions.PermissionDenied  # nocv
        instance.username = validated_data.get('username',
                                               instance.username)
        instance.is_active = validated_data.get('is_active',
                                                instance.is_active)
        instance.email = validated_data.get('email',
                                            instance.email)
        instance.first_name = validated_data.get('first_name',
                                                 instance.first_name)
        instance.last_name = validated_data.get('last_name',
                                                instance.last_name)
        instance.is_staff = validated_data.get('is_staff',
                                               instance.is_staff)
        if validated_data.get('password', False):
            instance.set_password(validated_data.get('password', None))
        instance.save()
        return instance


class OneUserSerializer(UserSerializer):
    password = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(required=False)

    class Meta:
        model = User
        fields = ('id',
                  'username',
                  'password',
                  'is_active',
                  'is_staff',
                  'first_name',
                  'last_name',
                  'email',
                  'url',)
        read_only_fields = ('is_superuser',
                            'date_joined',)
