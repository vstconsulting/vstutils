import orjson
from django.core.files import File
from django.core.files.images import ImageFile
from django.db.models import TextField, ForeignKey, FileField, ImageField, Field
from django.db.models.fields.files import FileDescriptor, FieldFile
from django.db.models.query_utils import DeferredAttribute
from vstutils.utils import raise_context_decorator_with_default

"""
These model fields used in :class:`vstutils.api.serializers.VstSerializer`
to form model_field_class: serializer_field_class mapping
"""


class MultipleFieldFile(FieldFile):
    """
    Subclasses :class:`django.db.models.fields.files.FieldFile`. Provides :meth:`MultipleFieldFile.save`
    and :meth:`MultipleFieldFile.delete` to manipulate the underlying file, as well as update the
    associated model instance.
    """
    def __init__(self, instance, field, name):
        super(MultipleFieldFile, self).__init__(instance, field, name)
        self._old_name = self.name

    def _set_attr_value(self):
        """
        Set new value of file to object attr.
        """
        setattr(
            self.instance,
            self.field.attname,
            [
                self.name if file.name == self._old_name else file
                for file in getattr(self.instance, self.field.attname)
            ]
        )

    def _clear_attr_value(self):
        """
        Pop None values from file list.
        """
        setattr(
            self.instance,
            self.field.attname,
            [
                file
                for file in getattr(self.instance, self.field.attname) if file.name != self.name
            ]
        )

    def save(self, name, content, save=True):
        """
        Save changes in file to storage and to object attr.
        """
        self._old_name = self.name
        name = self.field.generate_filename(self.instance, name)
        self.name = self.storage.save(name, content, max_length=self.field.max_length)
        self._set_attr_value()
        self._committed = True

        if save:
            self.instance.save()

    def delete(self, save=True):
        """
        Delete file from storage and from object attr.
        """
        if not self:
            return  # nocv

        if hasattr(self, '_file'):
            self.close()
            del self.file

        self.storage.delete(self.name)

        self._clear_attr_value()
        self._committed = False

        if save:
            self.instance.save()


class MultipleFileDescriptor(FileDescriptor):
    """
    Subclasses :class:`django.db.models.fields.files.FileDescriptor` to handle list of files.
    Return a list of :class:`MultipleFieldFile` when accessed so you can write code like:

    .. sourcecode:: python

        from myapp.models import MyModel
        instance = MyModel.objects.get(pk=1)
        instance.files[0].size
    """
    def get_file(self, file, instance):
        """
        Always return valid attr_class object.For details on logic see
        :meth:`django.db.models.fields.files.FileDescriptor.__get__`.
        """
        if isinstance(file, str) or file is None:
            attr = self.field.attr_class(instance, self.field, file)
            file = attr

        elif isinstance(file, File) and not isinstance(file, MultipleFieldFile):
            file_copy = self.field.attr_class(instance, self.field, file.name)
            file_copy.file = file
            file_copy._committed = False  # pylint: disable=W0212 protected-access
            file = file_copy

        elif isinstance(file, MultipleFieldFile) and not hasattr(file, 'field'):  # nocv
            file.instance = instance
            file.field = self.field
            file.storage = self.field.storage

        elif isinstance(file, MultipleFieldFile) and instance is not file.instance:
            file.instance = instance

        return file

    def __get__(self, instance, cls=None):
        """
        Return list of MultipleFieldFile at all times.
        """
        if instance is None:
            return self  # nocv

        instance.__dict__[self.field.attname] = [
            self.get_file(file, instance)
            for file in DeferredAttribute.__get__(self, instance, cls) or []
        ]

        return instance.__dict__[self.field.attname]


class MultipleFileMixin:
    """
    Mixin suited to use with :class:`django.db.models.fields.files.FieldFile` to transform it to
    a Field with list of files.
    """
    def pre_save(self, model_instance, add):
        """
        Call .save() method on every file in list
        """
        files = getattr(model_instance, self.attname)
        for file in files:
            if file and not file._committed:  # pylint: disable=W0212 protected-access
                file.save(file.name, file.file, save=False)
        return files

    def get_prep_value(self, value):
        """
        Prepare value for database insertion
        """
        value = Field.get_prep_value(self, value)
        if value is None:
            return value

        return orjson.dumps(list(map(str, value)))

    @raise_context_decorator_with_default(default=[])
    def from_db_value(self, value, expression, connection):
        """
        Transform db value to an internal value
        """
        if value:
            return orjson.loads(value)
        return value  # nocv


class MultipleFileField(MultipleFileMixin, FileField):
    """
    Subclasses :class:`django.db.models.fields.files.FileField`.
    Field for storing a list of Storage-kept files. All args passed to FileField.
    """
    attr_class = MultipleFieldFile
    descriptor_class = MultipleFileDescriptor
    description = "List of Files"


class MultipleImageFieldFile(ImageFile, MultipleFieldFile):
    """
    Subclasses :class:`MultipleFieldFile` and :class:`ImageFile mixin`,
    handles deleting _dimensions_cache when file is deleted.
    """
    def delete(self, save=True):
        if hasattr(self, '_dimensions_cache'):
            del self._dimensions_cache
        super().delete(save)


class MultipleImageField(MultipleFileMixin, ImageField):
    """
    Field for storing a list of storage-kept images. All args are passed to
    :class:`django.db.models.fields.files.ImageField`, except height_field and width_field,
    they are not currently implemented.
    """
    attr_class = MultipleImageFieldFile
    descriptor_class = MultipleFileDescriptor
    description = "List of Images"

    def update_dimension_fields(self, instance, force=False, *args, **kwargs):
        pass


class NamedBinaryFileInJSONField(TextField):
    """
    Extends :class:`django.db.models.TextField`. Use this field in :class:`vstutils.models.BModel` to get
    `vstutils.api.NamedBinaryFileInJSONField` in serializer.
    """


class NamedBinaryImageInJSONField(TextField):
    """
    Extends :class:`django.db.models.TextField`. Use this field in :class:`vstutils.models.BModel` to get
    `vstutils.api.NamedBinaryImageInJSONField` in serializer.
    """


class MultipleNamedBinaryFileInJSONField(TextField):
    """
    Extends :class:`django.db.models.TextField`. Use this field in :class:`vstutils.models.BModel` to get
    `vstutils.api.MultipleNamedBinaryFileInJSONField` in serializer.
    """


class MultipleNamedBinaryImageInJSONField(TextField):
    """
    Extends :class:`django.db.models.TextField`. Use this field in :class:`vstutils.models.BModel` to get
    `vstutils.api.MultipleNamedBinaryImageInJSONField in serializer`.
    """


class FkModelField(ForeignKey):
    """
    Extends :class:`django.db.models.ForeignKey`. Use this field in :class:`vstutils.models.BModel` to get
    `vstutils.api.FkModelField in serializer`. To set Foreign Key relation set `to` argument to string path to model
    or to Model Class as in :class:`django.db.models.ForeignKey`
    """
