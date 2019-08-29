from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm
from django import forms


UserModel = get_user_model()


class RegistrationForm(UserCreationForm):
    first_name = forms.CharField(max_length=30, required=False, help_text='Optional.')
    last_name = forms.CharField(max_length=30, required=False, help_text='Optional.')
    email = forms.EmailField(max_length=254, help_text='Required. Inform a valid email address.')

    class Meta(UserCreationForm.Meta):
        model = UserModel
        fields = ['username', 'first_name', 'last_name', 'email', 'password1', 'password2']
