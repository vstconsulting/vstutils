import json

from django import template, forms
from django.core.exceptions import NON_FIELD_ERRORS

from ..utils import translate as _

register = template.Library()


@register.inclusion_tag('vst_inclusion_tags/b64_img_from_json_string.html')
def img_from_json(json_string, **kwargs):
    media_type = kwargs.get('media_type', 'image/png')
    tag_classes = kwargs.get('tag_classes', '')
    content_attribute = kwargs.get('content_attribute', 'content')

    try:
        content = json.loads(json_string)[content_attribute]
    except Exception:
        content = ''
    return {
        'media_type': media_type,
        'tag_classes': tag_classes,
        'content': content
    }


def _handle_form_fields(form):
    for name, field in form.fields.items():
        errors = getattr(field, 'errors', form.errors.get(name, ''))
        field = form[name]
        label = field.label
        classes = []
        label_classes = []
        label_first = True
        if hasattr(field.field, 'get_bootstrap_label'):
            label = field.field.get_bootstrap_label(field)
        else:
            label = _(label)
        if isinstance(field.field, forms.BooleanField):
            classes.append('form-check')
            label_classes.append('form-check-label')
            label_first = False
        field.field.widget.attrs['class'] = 'form-control' + (field.field.widget.attrs.get('class', '') or '')
        yield (
            name,
            label,
            errors,
            field,
            ' '.join(classes),
            ' '.join(label_classes),
            label_first,
            not label_first,
        )


@register.inclusion_tag('vst_inclusion_tags/bootstrap_form.html')
def bootstrap_form(form: forms.Form, **kwargs):
    return {
        'fields': _handle_form_fields(form),
        'form': form,
        'form_errors': form.errors.get(NON_FIELD_ERRORS, '')
    }
