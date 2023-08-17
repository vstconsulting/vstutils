import io
import uuid

from django.db import models
from django.http.response import FileResponse

from vstutils.api import fields, filters, actions
from vstutils.models import BModel, BaseModel
from vstutils.models import fields as model_fields
from vstutils.api.serializers import VSTSerializer, BaseSerializer
from vstutils.api.fields import (
    FkField,
    FkModelField,
    MaskedField,
    DeepFkField,
    PhoneField,
    RatingField,
    RelatedListField,
    CSVFileField,
    WYSIWYGField,
    CrontabField,
)
from django.utils import timezone
from rest_framework.fields import DecimalField, CharField


class UpdateAuthorSerializer(VSTSerializer):
    _view_field_name = 'id'
    _non_bulk_methods = '*'

    class Meta:
        __inject_from__ = 'list'


class RelatedPostSerializer(BaseSerializer):
    title = fields.CharField(default='Title', help_text='Some description')


class CheckNamedResponseSerializer(BaseSerializer):
    detail = fields.CharField(read_only=True)


def check_named_response(view, request, *args, **kwargs):
    serializer = view.get_serializer()
    assert isinstance(serializer, CheckNamedResponseSerializer), f"{serializer}"
    return {"detail": "OK"}


class AuthorProfileSerializer(BaseSerializer):
    referer = FkField(select='Author', allow_null=True)
    phone = PhoneField(allow_null=True, required=False)

    def update(self, instance, validated_data):
        result = super().update(instance, validated_data)
        result.save()
        return result


class PhoneBookSerializer(AuthorProfileSerializer):
    referer = FkField(select='Author', field_type=int)
    name = CharField(read_only=True)


def check_named_response_as_result_serializer(view, request, *args, **kwargs):
    serializer = view.get_serializer()
    assert isinstance(serializer, PhoneBookSerializer), f"{serializer}"
    return {"detail": "OK"}


class PropertyAuthorSerializer(BaseSerializer):
    phone = PhoneField(allow_null=True, required=False)


@actions.SimpleAction(serializer_class=PropertyAuthorSerializer, atomic=True)
def simple_property_action(self, request, *args, **kwargs):
    """
    Simple property description
    """
    return self.get_object()


@simple_property_action.setter
def simple_property_action(self, instance, request, serializer, *args, **kwargs):
    instance.save(update_fields=['phone'])


@simple_property_action.deleter
def simple_property_action(self, instance, request, *args, **kwargs):
    instance.phone = ''
    instance.save(update_fields=['phone'])


@actions.SimpleAction(
    serializer_class=PropertyAuthorSerializer,
    query_serializer=PropertyAuthorSerializer,
    title='Get query',
    icons='fas fa-pen',
)
def simple_property_action_with_query(self, request, query_data, *args, **kwargs):
    instance = self.get_object()
    if query_data.get('phone', instance.phone) == instance.phone:
        return {'phone': instance.phone}
    return {}


@actions.EmptyAction(methods=['get'], result_serializer_class=FileResponse)
def get_file(self, request, *args, **kwargs):
    return FileResponse(
        streaming_content=io.BytesIO(b'{}'),
        as_attachment=True,
        filename=f'{self.get_object().id}.json'
    )


class Author(BModel):
    _translate_model = 'Author'
    name = models.CharField(max_length=256)
    registerDate = models.DateTimeField(default=timezone.now)
    image = models.ImageField(null=True, blank=True)
    phone = models.CharField(max_length=16, null=True)
    masked = models.CharField(max_length=255, null=True)
    decimal = models.DecimalField(default='13.37', decimal_places=2, max_digits=5)
    referer = models.IntegerField(null=True)

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
            'decimal': DecimalField(default='13.37', decimal_places=2, max_digits=5),
        }
        _nested = {
            'post': {
                'allow_append': False,
                'model': 'test_proj.models.fields_testing.ExtraPost',
                'arg': 'id'
            }
        }
        _extra_view_attributes = {
            "empty_action": actions.EmptyAction(name='empty_action')(lambda v, r, *a, **k: None),
            "check_named_response": actions.Action(serializer_class=CheckNamedResponseSerializer)(check_named_response),
            "author_profile": actions.SimpleAction(
                name='author_profile',
                methods=["get", "put", "delete"],
                serializer_class=AuthorProfileSerializer
            )(),
            "check_named_response_as_result_serializer": actions.Action(
                serializer_class=PhoneBookSerializer,
                result_serializer_class=CheckNamedResponseSerializer
            )(check_named_response_as_result_serializer),
            "simple_property_action": simple_property_action,
            "simple_property_action_with_query": simple_property_action_with_query,
            "get_file": get_file,
            "phone_book": actions.SimpleAction(
                name='phone_book',
                methods=["get"],
                detail=False,
                is_list=True,
                serializer_class=PhoneBookSerializer
            )(),
        }


class Category(BModel):
    name = models.CharField(max_length=256)
    parent = models.ForeignKey('self', null=True, default=None, on_delete=models.CASCADE)

    deep_parent_field = 'parent'
    deep_parent_allow_append = True

    class Meta:
        default_related_name = 'categories'
        _list_fields = _detail_fields = ('id', 'name', 'parent')


class SomeDataCsvSerializer(BaseSerializer):
    some_data = CharField(max_length=300, required=True)


class Post(BModel):
    author = models.ForeignKey(Author, on_delete=models.CASCADE, null=True)
    title = models.CharField(max_length=255)
    text = models.TextField()
    rating = models.FloatField(default=0)
    fa_icon_rating = models.FloatField(default=0)
    category = models.ForeignKey(Category, null=True, on_delete=models.CASCADE)
    some_data = models.CharField(max_length=300, null=True, blank=True)

    class Meta:
        default_related_name = 'post'
        _list_fields = ['author', 'title']
        _detail_fields = ['author', 'title', 'text', 'rating', 'fa_icon_rating', 'category', 'some_data']
        _override_list_fields = {
            'author': FkModelField(select=Author, read_only=True)
        }
        _override_detail_fields = {
            'author': FkModelField(select=Author, read_only=True),
            'rating': RatingField(required=False, front_style='slider', min_value=0, max_value=10),
            'category': DeepFkField(select='test_proj.Category', allow_null=True, required=False, only_last_child=True),
            'some_data': CSVFileField(delimiter=';', items=SomeDataCsvSerializer(), min_column_width=300, max_length=1024, min_length=1),
            'text': WYSIWYGField(),
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


class ModelWithCrontabField(BModel):
    cron = models.CharField(max_length=64)

    class Meta:
        _list_fields = _detail_fields = ['cron']
        _override_detail_fields = _override_list_fields = {
            'cron': CrontabField()
        }


class ModelWithUuidPk(BaseModel):
    id = models.UUIDField(primary_key=True, db_index=True, default=uuid.uuid4)


class ModelWithUuidFK(BModel):
    fk = model_fields.FkModelField(ModelWithUuidPk, on_delete=models.CASCADE)
