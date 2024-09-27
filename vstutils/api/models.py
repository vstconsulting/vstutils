import hashlib
from itertools import chain

import pyotp
from django.apps import apps
from django.conf import settings
from django.db import models
from django.utils.module_loading import import_string
from django.utils.functional import cached_property

from ..models import BaseModel, Manager, BQuerySet
from ..models.custom_model import ListModel, CharField


lib_names = []
for __attr_name in ['VST_PROJECT', 'VST_PROJECT_LIB_NAME']:
    __lib_name = getattr(settings, __attr_name)
    if __lib_name not in lib_names:
        lib_names.append(__lib_name)


class Language(ListModel):
    objects: Manager.from_queryset(BQuerySet)
    data = [
        {'code': code, 'name': name}
        for code, name in settings.LANGUAGES
    ]
    code = CharField(primary_key=True, max_length=5)
    name = CharField(max_length=128)

    @classmethod
    def get_etag_value(cls, pk=None):
        hashable_str = '_'.join(c for c, _ in settings.LANGUAGES) + (f'_{pk}' if pk is not None else '')
        return hashlib.blake2s(hashable_str.encode('utf-8'), digest_size=4).hexdigest()  # nosec

    def _get_translation_data(self, module_path_string, code, for_server=False):
        data = {}
        for dict_name in filter(bool, ['TRANSLATION'] + ['SERVER_TRANSLATION' if for_server else None]):
            try:
                translation_data = import_string(module_path_string + '.translations.' + code + f'.{dict_name}')
                if not isinstance(translation_data, dict):
                    continue
                data.update(translation_data.copy())
            except:
                pass
        return data

    def get_translations(self, for_server=False):
        code = self.code.replace('-', '_')
        translation_data = self._get_translation_data('vstutils', code, for_server)
        apps_translations = (
            a.name
            for a in apps.get_app_configs()
            if getattr(a, 'contribute_translations', False)
        )
        for attr_name in chain(apps_translations, lib_names):
            translation_data.update(
                self._get_translation_data(attr_name, code, for_server)
            )
        return translation_data

    @cached_property
    def translations(self):
        return self.get_translations(for_server=False)

    @cached_property
    def server_translations(self):
        return self.get_translations(for_server=True)

    def translate(self, text: str) -> str:
        translated = self.server_translations.get(text, None)
        if translated is None:
            # place for additional translation methods
            return text
        return translated


class TwoFactor(BaseModel):
    objects: Manager.from_queryset(BQuerySet)
    recoverycode: Manager["RecoveryCode"]
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='twofa'
    )
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
    objects: Manager.from_queryset(BQuerySet)
    id = models.AutoField(primary_key=True, max_length=100)
    key = models.CharField(max_length=256)
    tfa = models.ForeignKey(TwoFactor, on_delete=models.CASCADE, related_name='recoverycode')

    class Meta:
        default_related_name = 'recoverycode'
        indexes = [
            models.Index(fields=('id', 'key', 'tfa'), name='%(app_label)s_recov_fullidx')
        ]


class UserSettings(BaseModel):
    objects: Manager.from_queryset(BQuerySet)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='_settings')
    value = models.JSONField(default=dict)

    class Meta:
        default_related_name = '_settings'
