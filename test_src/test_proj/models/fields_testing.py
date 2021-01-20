from django.db import models
from vstutils.models import BModel
from vstutils.api.serializers import VSTSerializer
from vstutils.api.fields import FkModelField, RelatedListField
from django.utils import timezone


class UpdateAuthorSerializer(VSTSerializer):
    class Meta:
        __inject_from__ = 'list'


class Author(BModel):
    name = models.CharField(max_length=256)
    registerDate = models.DateTimeField(default=timezone.now)

    class Meta:
        default_related_name = 'author'
        _list_fields = ['name', 'hidden']
        _detail_fields = ['name', 'registerDate', 'posts']
        _extra_serializer_classes = {
            'serializer_class_update': UpdateAuthorSerializer,
            'serializer_class_partial_update': UpdateAuthorSerializer,
        }
        _properties_groups = {
            "Main": ["id", "name"]
        }
        _override_detail_fields = {
            'posts': RelatedListField(fields=['title'], related_name='post')
        }
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

    class Meta(Post.OriginalMeta):
        proxy = True
        # Now it is not required:
        #
        # default_related_name = 'post'
        # _list_fields = ['author', 'title']
        # _detail_fields = ['author', 'title', 'text']
        _override_list_fields = _override_detail_fields = {
            'author': FkModelField(select='test_proj.Author', read_only=True)
        }
