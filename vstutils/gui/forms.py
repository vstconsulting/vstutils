from django.contrib.auth import get_user_model, logout
from django.contrib.auth.forms import UserCreationForm
from django.conf import settings
from django import forms
from django.forms.utils import ErrorDict
from django.test import override_settings
from django.urls import reverse
from django.core.cache import cache
from django.core.exceptions import SuspiciousOperation
from django.contrib.auth.hashers import make_password, check_password
from django.utils.html import strip_tags
from django.utils.safestring import mark_safe


from ..utils import SecurePickling, send_template_email, translate as _, lazy_translate as __

UserModel = get_user_model()
secure_pickle = SecurePickling()

override_setting_decorator = override_settings(PASSWORD_HASHERS=settings.REGISTRATION_HASHERS)
hash_data = override_setting_decorator(make_password)
check_data = override_setting_decorator(check_password)


class AgreementWidget(forms.widgets.CheckboxInput):
    template_name = 'widgets/agreement_widget.html'

    def __init__(self, *args, **kwargs):
        kwargs['attrs'] = attrs = kwargs.get('attrs', {}) or {}
        attrs['class'] = 'form-check-input'
        super().__init__(*args, **kwargs)


class AgreementField(forms.BooleanField):
    widget = AgreementWidget

    def __init__(self,
                 before_link_text: str = '',
                 after_link_text: str = '',
                 url: str = None,
                 *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.url_name = url
        self.before_link_text = before_link_text
        self.after_link_text = after_link_text

    def get_bootstrap_label(self, field):
        return mark_safe(  # nosec
            f'{_(self.before_link_text)}'
            f'<a href="#" onclick=open{field.name}Modal("{reverse(self.url_name)}")>'
            f'{_(self.label)}'
            f'</a>{_(self.after_link_text)}'
        )


class RegistrationForm(UserCreationForm):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        for field in self.fields.values():
            if field.help_text:
                field.widget.attrs['title'] = strip_tags(field.help_text)

    error_messages = {
        'password_mismatch': __("The two password fields didn't match."),
    }

    first_name = forms.CharField(label=__('First name'), max_length=30, required=False, help_text='Optional.')
    last_name = forms.CharField(label=__('Last name'), max_length=30, required=False, help_text='Optional.')
    email = forms.EmailField(
        label=__('Email'),
        max_length=254,
        help_text=__('Required. Inform a valid email address.')  # type: ignore
    )
    if settings.SEND_CONFIRMATION_EMAIL:
        uid = forms.CharField(max_length=256, required=False)
        email.help_text = __('A confirmation will be sent to your e-mail')  # type: ignore
    if settings.ENABLE_AGREEMENT_TERMS:
        agreement = AgreementField(
            before_link_text='I accept the ',
            after_link_text='terms of agreement',
            url='terms',
            required=False,
        )
    if settings.ENABLE_CONSENT_TO_PROCESSING:
        consent_to_processing = AgreementField(
            before_link_text='I agree with ',
            after_link_text='the personal data processing policy',
            url='terms',
            required=False
        )

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
        return self.request.build_absolute_uri(f'{reverse("user_registration")}?uid={uid}')

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
                _('Invalid registration email send.')
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
                try:
                    self.cleaned_data.update(secure_pickle.loads(cache.get(uid)))
                    self._errors = ErrorDict()
                except TypeError:  # nocv
                    self._errors = ErrorDict()

    def _post_clean(self):
        super()._post_clean()
        if settings.SEND_CONFIRMATION_EMAIL and 'uid' in self._errors:
            for err in tuple(self._errors.keys()):
                if err != 'uid':
                    del self._errors[err]

    def clean(self):
        super().clean()
        if settings.ENABLE_AGREEMENT_TERMS:
            agreement = self.cleaned_data.get('agreement', None)
            if not agreement:
                self.add_error(
                    'agreement',
                    _('To continue, need to accept the terms agreement.')
                )
        if settings.ENABLE_CONSENT_TO_PROCESSING:
            consent_to_processing = self.cleaned_data.get('consent_to_processing', None)
            if not consent_to_processing:
                self.add_error(
                    'consent_to_processing',
                    _('To continue, need to agree to the personal data processing policy.')
                )
        if settings.SEND_CONFIRMATION_EMAIL:
            uid = self.cleaned_data.get('uid', False)
            if uid and not cache.get(uid, False):
                self._errors = ErrorDict()
                self.add_error('uid', _('Confirmation link is invalid or expired, please register again'))


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
