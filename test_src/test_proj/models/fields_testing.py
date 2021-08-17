from django.db import models

from vstutils.models import BModel
from vstutils.api.serializers import VSTSerializer
from vstutils.api.fields import FkModelField, RelatedListField, RatingField
from django.utils import timezone


class UpdateAuthorSerializer(VSTSerializer):
    _view_field_name = 'id'
    _non_bulk_methods = '*'

    class Meta:
        __inject_from__ = 'list'


class Author(BModel):
    _translate_model = 'Author'
    name = models.CharField(max_length=256)
    registerDate = models.DateTimeField(default=timezone.now)
    image = models.ImageField(null=True, blank=True)

    class Meta:
        _permission_classes = ('rest_framework.permissions.AllowAny', )
        _override_permission_classes = True
        default_related_name = 'author'
        _non_bulk_methods = ('post',)
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
            'posts': RelatedListField(fields=['title'], related_name='post', view_type='table')
        }
        _nested = {
            'post': {
                'allow_append': False,
                'model': 'test_proj.models.fields_testing.ExtraPost',
                'arg': 'id'
            }
        }


class Post(BModel):
    author = models.ForeignKey(Author, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    text = models.TextField()
    rating = models.FloatField(default=0)
    fa_icon_rating = models.FloatField(default=0)

    class Meta:
        default_related_name = 'post'
        _list_fields = ['author', 'title']
        _detail_fields = ['author', 'title', 'text', 'rating', 'fa_icon_rating']
        _override_list_fields = _override_detail_fields = {
            'author': FkModelField(select=Author, read_only=True)
        }
        _override_detail_fields = {
            'author': FkModelField(select=Author, read_only=True),
            'rating': RatingField(required=False, front_style='slider', min_value=0, max_value=10)
        }


class ExtraPost(Post):

    class Meta(Post.OriginalMeta):
        proxy = True
        # Now it is not required:
        #
        # default_related_name = 'post'
        # _list_fields = ['author', 'title']
        # _detail_fields = ['author', 'title', 'text']
        _override_list_fields = {
            'author': FkModelField(select='test_proj.Author', read_only=True)
        }
        _override_detail_fields = {
            'rating': RatingField(required=False, front_style='slider', min_value=0, max_value=10, color='red'),
            'fa_icon_rating': RatingField(required=False, front_style='fa_icon', fa_class='fas fa-cat'),
            **_override_list_fields
        }
        _filterset_fields = None
        _serializer_class_name = 'ExtraPost'
