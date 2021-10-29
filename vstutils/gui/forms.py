from django.contrib.auth import get_user_model, logout
from django.contrib.auth.forms import UserCreationForm
from django.conf import settings
from django import forms
from django.forms.utils import ErrorDict
from django.test import override_settings
from django.core.cache import cache
from django.core.exceptions import SuspiciousOperation
from django.contrib.auth.hashers import make_password, check_password

from ..utils import SecurePickling, send_template_email, translate, lazy_translate

UserModel = get_user_model()
secure_pickle = SecurePickling()

override_setting_decorator = override_settings(PASSWORD_HASHERS=settings.REGISTRATION_HASHERS)
hash_data = override_setting_decorator(make_password)
check_data = override_setting_decorator(check_password)


class RegistrationForm(UserCreationForm):
    error_messages = {
        'password_mismatch': lazy_translate("The two password fields didn't match."),
    }

    first_name = forms.CharField(max_length=30, required=False, help_text='Optional.')
    last_name = forms.CharField(max_length=30, required=False, help_text='Optional.')
    email = forms.EmailField(max_length=254, help_text='Required. Inform a valid email address.')
    if settings.SEND_CONFIRMATION_EMAIL:
        uid = forms.CharField(max_length=256, required=False)
    if settings.ENABLE_AGREEMENT_TERMS:
        agreement = forms.BooleanField(required=False)

    class Meta(UserCreationForm.Meta):
        model = UserModel
        fields = [
            'username',
            'first_name',
            'last_name',
            'email',
            'password1',
            'password2',
        ]

    def build_confirmation_url(self, uid):
        # pylint: disable=no-member
        return self.request.build_absolute_uri(f'?uid={uid}')

    def get_email_context(self):
        return {}

    def register_with_confirmation(self, commit):
        cache_key = self.cleaned_data.get('uid', None)

        if cache_key in (None, ''):
            cache_key = hash_data(self.cleaned_data['email'])
            self.cleaned_data['uid'] = cache_key

            secured_data = secure_pickle.dumps(self.cleaned_data)
            cache.set(cache_key, secured_data)
            context_data = self.get_email_context()
            context_data['action_url'] = self.build_confirmation_url(cache_key)
            if context_data.get('application_name', None) is None:
                context_data['application_name'] = settings.PROJECT_GUI_NAME

            send_template_email(
                subject='Registration Confirmation.',
                template_name='registration/confirm_email.html',
                email=self.cleaned_data['email'],
                context_data=context_data
            )
            return super().save(commit=False)

        if not check_data(self.cleaned_data['email'], cache_key):
            raise SuspiciousOperation(
                translate('Invalid registration email send.')
            )

        return super().save(commit)

    def save(self, commit=True):
        if settings.SEND_CONFIRMATION_EMAIL:
            return self.register_with_confirmation(commit)
        return super(RegistrationForm, self).save(commit)

    def _clean_fields(self):
        super()._clean_fields()
        if settings.SEND_CONFIRMATION_EMAIL:
            uid = self.cleaned_data.get('uid', None)
            if self.errors and uid not in (None, ''):
                self.cleaned_data.update(secure_pickle.loads(cache.get(uid)))
                self._errors = ErrorDict()

    # method clean is not needed?
    def clean(self):
        super().clean()
        if settings.ENABLE_AGREEMENT_TERMS:
            agreement = self.cleaned_data.get('agreement', None)
            if not agreement:
                self.add_error(
                    'agreement',
                    translate('To continue, need to accept the terms agreement.')
                )


class TwoFaForm(forms.Form):
    pin = forms.CharField(required=True)

    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super(TwoFaForm, self).__init__(*args, **kwargs)

    def clean(self):
        pin = self.cleaned_data.get('pin')

        if self.request.user.twofa.verify(pin):
            self.request.session['2fa'] = True
        else:
            self.add_error('pin', 'Invalid authentication code')
            attempts = self.request.session.get('2fa_attempts', 0) + 1
            if attempts >= settings.MAX_TFA_ATTEMPTS:
                logout(self.request)
            else:
                self.request.session['2fa_attempts'] = attempts

        return super().clean()

    def get_user(self):
        return self.request.user
