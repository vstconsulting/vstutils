from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.test import override_settings
from vstutils.utils import SecurePickling

secure_pickle = SecurePickling()

override_setting_decorator = override_settings(PASSWORD_HASHERS=settings.REGISTRATION_HASHERS)
hash_data = override_setting_decorator(make_password)
check_data = override_setting_decorator(check_password)
