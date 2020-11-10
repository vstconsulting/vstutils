from django.db import models
from vstutils.models import BModel
from vstutils.api.fields import FkModelField
from django.utils import timezone


class Author(BModel):
    name = models.CharField(max_length=256)
    registerDate = models.DateTimeField(default=timezone.now)

    class Meta:
        default_related_name = 'author'
        _list_field = ['name']
        _detail_fields = ['name', 'registerDate']
        _nested = {
            'post': {
                'allow_append': False,
                'model': 'test_proj.models.fields_testing.ExtraPost',
            }
        }


class Post(BModel):
    author = models.ForeignKey(Author, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    text = models.TextField()

    class Meta:
        default_related_name = 'post'
        _list_fields = ['author', 'title']
        _detail_fields = ['author', 'title', 'text']
        _override_list_fields = _override_detail_fields = {
            'author': FkModelField(select=Author, read_only=True)
        }


class ExtraPost(Post):

    class Meta:
        proxy = True
        default_related_name = 'post'
        _list_fields = ['author', 'title']
        _detail_fields = ['author', 'title', 'text']
        _override_list_fields = _override_detail_fields = {
            'author': FkModelField(select='test_proj.Author', read_only=True)
        }
