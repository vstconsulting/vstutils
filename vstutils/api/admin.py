import orjson
from django.contrib import admin
from django.utils.html import format_html
from django.conf import settings
from django import forms

from . import models


class _BaseViewAdmin(admin.ModelAdmin):

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(models.TwoFactor)
class TwoFactorAdmin(_BaseViewAdmin):
    fields = list_display = ('pk', 'user')

    def user(self, instance):
        return getattr(instance.user, 'email', str(instance.user))

    def has_delete_permission(self, request, obj=None):
        return obj is not None and (not obj.user.is_superuser or obj.pk == request.user.pk)


@admin.register(models.Language)
class LanguageAdmin(_BaseViewAdmin):
    list_display = ('code', 'name')
    fields = list_display + ('translations',)

    def translations(self, instance):
        return format_html(
            '<pre>{}</pre>',
            orjson.dumps(instance.translations, option=orjson.OPT_INDENT_2).decode('utf-8')
        )


class CustomTranslationsForm(forms.ModelForm):
    code = forms.ChoiceField(choices=settings.LANGUAGES)


if settings.ENABLE_CUSTOM_TRANSLATIONS:
    @admin.register(models.CustomTranslations)
    class CustomTranslationsAdmin(admin.ModelAdmin):
        list_display = ('original', 'code', 'translated')
        form = CustomTranslationsForm
