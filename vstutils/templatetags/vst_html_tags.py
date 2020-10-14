import json

from django import template

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
