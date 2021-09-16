Frontend Classes
===================================

Fields
--------------
.. js:autoclass:: FieldsResolver
   :members:

.. js:autoclass:: BaseField
   :members: prepareFieldForView, afterInstancesFetched, getInitialValue, toInner, toRepresent, validateValue, toDescriptor

.. js:autoclass:: AutocompleteField
   :members: mixins

.. js:autoclass:: BooleanField
   :members:

.. js:autoclass:: ChoicesField
   :members:


.. js:autoclass:: CrontabField
   :members:

.. js:autoclass:: DateField
   :members:

.. js:autoclass:: DateTimeField
   :members:

.. js:autoclass:: TimeIntervalField
   :members:

.. js:autoclass:: UptimeField
   :members:

.. js:autoclass:: DynamicField
   :members:

.. js:autoclass:: FileField
   :members:

.. js:autoclass:: BinaryFileField
   :members:

.. js:autoclass:: NamedBinaryFileField
   :members:

.. js:autoclass:: NamedBinaryImageField
   :members:

.. js:autoclass:: MultipleNamedBinFileField
   :members:

.. js:autoclass:: MultipleNamedBinaryImageField
   :members:

.. js:autoclass:: FKAutocompleteField
   :members:

.. js:autoclass:: FKField
   :members:

.. js:autoclass:: FKMultiAutocompleteField
   :members:

.. js:autoclass:: JSONField
   :members:

.. js:autoclass:: IntegerField
   :members:

.. js:autoclass:: PasswordField
   :members:

.. js:autoclass:: RelatedListField
   :members:

.. js:autoclass:: TextAreaField
   :members:

.. js:autoclass:: ColorField
   :members:

.. js:autoclass:: EmailField
   :members:



Views
-----
.. js:autoclass:: ViewConstructor.ViewConstructor
   :members:

.. js:autoclass:: View
   :members:

QuerySets
---------
.. js:autoclass:: QuerySet
   :members:

.. js:autoclass:: QuerySetsResolver
   :members:

Models
------
.. js:autoclass:: Model
   :members:

.. js:autoclass:: ModelsResolver
   :members:


App
---
.. js:autoclass:: BaseApp
   :members:

.. js:autoclass:: App
   :members:

ErrorHandler

.. js:autoclass:: PopUp
   :members:

.. js:autoclass:: ApiConnector
   :members:

.. js:autoclass:: RouterConstructor
   :members:

.. js:autoclass:: StoreConstructor
   :members:


LocalSettings is an abstraction, that is responsible for manipulating by settings saved to the `Local Storage <https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage>`_.
It is used for saving some user's local settings to the one property(object) of `Local Storage <https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage>`_.

For example:

.. sourcecode:: javascript

    window.localStorage.localSettings = {
        hideMenu: true,
        lang: "en",
        skin: "default"
    }



.. js:autoclass:: LocalSettings
   :members:
