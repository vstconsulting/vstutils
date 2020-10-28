from django.conf import settings
from django.utils.module_loading import import_string as import_class

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

    def _get_translation_data(self, module_path_string, code):
        try:
            translation_data = import_class(module_path_string + '.translations.' + code + '.TRANSLATION')
            if not isinstance(translation_data, dict):
                raise Exception
            return translation_data.copy()
        except:
            return {}

    @property
    def translations(self):
        code = self.code.replace('-', '_')
        translation_data = self._get_translation_data('vstutils', code)
        for attr_name in lib_names:
            translation_data.update(
                self._get_translation_data(attr_name, code)
            )
        return translation_data
