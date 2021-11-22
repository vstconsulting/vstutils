from django.db import models

import vstutils.api.models
from vstutils.api import fields, filters
from vstutils.models import BModel
from vstutils.api.serializers import VSTSerializer, BaseSerializer
from vstutils.api.fields import (
    FkModelField,
    MaskedField,
    DeepFkField,
    PhoneField,
    RatingField,
    RelatedListField,
)
from django.utils import timezone
from rest_framework.fields import DecimalField


class UpdateAuthorSerializer(VSTSerializer):
    _view_field_name = 'id'
    _non_bulk_methods = '*'

    class Meta:
        __inject_from__ = 'list'


class RelatedPostSerializer(BaseSerializer):
    title = fields.CharField(default='Title', help_text='Some description')


class Author(BModel):
    _translate_model = 'Author'
    name = models.CharField(max_length=256)
    registerDate = models.DateTimeField(default=timezone.now)
    image = models.ImageField(null=True, blank=True)
    phone = models.CharField(max_length=16, null=True)
    masked = models.CharField(max_length=255, null=True)
    decimal = models.DecimalField(default='13.37', decimal_places=2, max_digits=5)

    class Meta:
        _permission_classes = ('rest_framework.permissions.AllowAny', )
        _override_permission_classes = True
        default_related_name = 'author'
        _non_bulk_methods = ('post',)
        _list_fields = ['name', 'hidden']
        _detail_fields = ['name', 'registerDate', 'posts', 'phone', 'masked', 'decimal']
        _extra_serializer_classes = {
            'serializer_class_update': UpdateAuthorSerializer,
            'serializer_class_partial_update': UpdateAuthorSerializer,
        }
        _properties_groups = {
            "Main": ["id", "name"]
        }
        _override_detail_fields = {
            'posts': RelatedListField(
                fields=['title'],
                related_name='post',
                view_type='table',
                serializer_class=RelatedPostSerializer
            ),
            'phone': PhoneField(allow_null=True, required=False),
            'masked': MaskedField(allow_null=True, required=False, mask={'mask': '000-000'}),
            'decimal': DecimalField(default='13.37', decimal_places=2, max_digits=5)
        }
        _nested = {
            'post': {
                'allow_append': False,
                'model': 'test_proj.models.fields_testing.ExtraPost',
                'arg': 'id'
            }
        }


class Category(BModel):
    name = models.CharField(max_length=256)
    parent = models.ForeignKey('self', null=True, default=None, on_delete=models.CASCADE)

    deep_parent_field = 'parent'
    deep_parent_allow_append = True

    class Meta:
        default_related_name = 'categories'
        _list_fields = _detail_fields = ('id', 'name', 'parent')


class Post(BModel):
    author = models.ForeignKey(Author, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    text = models.TextField()
    rating = models.FloatField(default=0)
    fa_icon_rating = models.FloatField(default=0)
    category = models.ForeignKey(Category, null=True, on_delete=models.CASCADE)

    class Meta:
        default_related_name = 'post'
        _list_fields = ['author', 'title']
        _detail_fields = ['author', 'title', 'text', 'rating', 'fa_icon_rating', 'category']
        _override_list_fields = {
            'author': FkModelField(select=Author, read_only=True)
        }
        _override_detail_fields = {
            'author': FkModelField(select=Author, read_only=True),
            'rating': RatingField(required=False, front_style='slider', min_value=0, max_value=10),
            'category': DeepFkField(select='test_proj.Category', allow_null=True, required=False, only_last_child=True),
        }
        _filterset_fields = {
            '__authors': filters.CharFilter(method=filters.extra_filter, field_name='author'),
            'author': None,
            'author__not': filters.CharFilter(method=filters.FkFilterHandler()),
            'title': None,
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


class ChangedPkField(BModel):
    id = models.TextField(primary_key=False, blank=True, null=True)
    reg_number = models.CharField(primary_key=True, max_length=10)
    name = models.CharField(max_length=10, null=True, blank=True)

    class Meta:
        _list_fields = _detail_fields = ['reg_number', 'name']


class ModelWithChangedFk(BModel):
    name = models.CharField(max_length=10)
    relation = models.ForeignKey(ChangedPkField, on_delete=models.CASCADE,)

    class Meta:
        _list_fields = _detail_fields = ['name', 'relation']
        _override_detail_fields = _override_list_fields = {
            'relation': FkModelField(select=ChangedPkField, autocomplete_property='reg_number')
        }
