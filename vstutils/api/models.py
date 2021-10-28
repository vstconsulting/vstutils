import hashlib

import pyotp
from django.conf import settings
from django.db import models
from django.utils.module_loading import import_string as import_class
from django.utils.functional import cached_property

from ..models import BaseModel
from ..custom_model import ListModel, CharField


lib_names = []
for __attr_name in ['VST_PROJECT', 'VST_PROJECT_LIB_NAME']:
    __lib_name = getattr(settings, __attr_name)
    if __lib_name not in lib_names:
        lib_names.append(__lib_name)


class Language(ListModel):
    data = [
        {'code': code, 'name': name}
        for code, name in settings.LANGUAGES
    ]
    code = CharField(primary_key=True, max_length=5)
    name = CharField(max_length=128)

    @classmethod
    def get_etag_value(cls):
        hashable_str = '_'.join(c for c, _ in settings.LANGUAGES)
        if settings.ENABLE_CUSTOM_TRANSLATIONS:
            hashable_str += CustomTranslations.get_etag_value()
        return hashlib.md5(hashable_str.encode('utf-8')).hexdigest()

    def _get_translation_data(self, module_path_string, code):
        try:
            translation_data = import_class(module_path_string + '.translations.' + code + '.TRANSLATION')
            if not isinstance(translation_data, dict):
                raise Exception
            return translation_data.copy()
        except:
            return {}

    @cached_property
    def translations(self):
        code = self.code.replace('-', '_')
        translation_data = self._get_translation_data('vstutils', code)
        for attr_name in lib_names:
            translation_data.update(
                self._get_translation_data(attr_name, code)
            )
        if settings.ENABLE_CUSTOM_TRANSLATIONS:
            translation_data.update(
                CustomTranslations.objects.filter(code=code).values_list('original', 'translated')
            )
        return translation_data

    def translate(self, text):
        translated = self.translations.get(text, None)
        if translated is None:
            # place for additional translation methods
            return text
        return translated


class CustomTranslations(BaseModel):
    _cache_responses = True

    original = CharField(primary_key=True, max_length=380)
    translated = CharField(max_length=380)
    code = CharField(max_length=5)

    class Meta:
        default_related_name = 'custom_translations'
        indexes = [
            models.Index(fields=('original', 'translated', 'code'), name='%(app_label)s_translations')
        ]


class TwoFactor(BaseModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, primary_key=True)
    secret = models.CharField(max_length=256, blank=False, null=False)

    class Meta:
        default_related_name = 'twofa'
        indexes = [
            models.Index(fields=('user', 'secret'), name='%(app_label)s_tfa_fullidx')
        ]

    @property
    def enabled(self):
        return bool(self.secret)

    def verify(self, pin):
        if not pyotp.TOTP(self.secret).verify(pin):
            return self.recoverycode.filter(key=pin).delete()[0]
        return True


class RecoveryCode(BaseModel):
    id = models.AutoField(primary_key=True, max_length=100)
    key = models.CharField(max_length=256)
    tfa = models.ForeignKey(TwoFactor, on_delete=models.CASCADE)

    class Meta:
        default_related_name = 'recoverycode'
        indexes = [
            models.Index(fields=('id', 'key', 'tfa'), name='%(app_label)s_recov_fullidx')
        ]


class UserSettings(BaseModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    value = models.JSONField(default=dict)

    class Meta:
        default_related_name = '_settings'
