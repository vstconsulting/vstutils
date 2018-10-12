.. _terms:

Terms and description
=======================

``Entity`` -

``Model`` - object that contain information for draw object

``Path`` - single element from OpenAPI paths, that used for operate with entity data

``GUI Schema`` - schema that generated based on API schema

``OpenAPI Schema`` - schema in format `Swagger 2.0 <https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md>`_

Fields of gui schema
========================

List of fields, gui schema object can have not all of this fields.

actions
"""""""""""""""""
Type: ``Associative array``

Description: ``Associative array`` that contains pair ``action_name``:``action_object``.
``action_object`` structure based on gui schema.


bulk_name
"""""""""""""""""
Type: ``String``

Description: Name for bulk requests. Name took from :ref:`name` field of :ref:`GUI schema<terms>`


buttons
"""""""""""""""""
Type: ``array``

Description: Array contains button objects


canAdd
"""""""""""""""""
Type: ``Boolean``

Description: Flag show, that can this :ref:`entity<terms>` append to parent :ref:`entity<terms>`


canCreate
"""""""""""""""""
Type: ``Boolean``

Description: Flag show, that can this :ref:`entity<terms>` create new :ref:`entity<terms>`

canDelete
"""""""""""""""""
Type: ``Boolean``

Description: Flag show, that can this :ref:`entity<terms>` be deleted

canEdit
"""""""""""""""""
Type: ``Boolean``

Description: Flag show, that can this :ref:`entity<terms>` be edited

canRemove
"""""""""""""""""
Type: ``Boolean``

Description: Flag show, that can this :ref:`entity<terms>` be remove from parent :ref:`entity<terms>`

extension_class_name
""""""""""""""""""""""""""""
Type: ``Array``

Description: array of ``entities_names`` that used to inheritance

hide_non_required
""""""""""""""""""""""""""""
Type: ``Integer``

Description: Amount of fields that would not be collapsed, all field after this number,
would be try to collapse

isEmptyAction
""""""""""""""""""""""""""""
Type: ``Boolean``

Description: Property that show, must process response or not

level
""""""""""""""""""""""""""""
Type: ``Integer``

Description: Nested level of element

links
"""""""""""""""""""""""""""
Type: ``Associative array``

Description: ``Array`` contains pair ``nested_entity_name``:``nested_entity``

list
""""""""""""""""""""""""""""
Type: ``:ref:`entity<terms>```

Description: :ref:`entity<terms>` that contains list of this :ref:`entity<terms>`

list_path
"""""""""""""""""""""""""""""
Type: ``String``

Description: API path tha equal 'list :ref:`entity<terms>`'


method
""""""""""""""""""""""""""""
Type: 'Associative array'

Description: Array contains pair ``method_name``:``method_value``

    ``Method_name`` - Name of request. Values: ['`delete`', '`get`', '`new`',
    '`patch`', '`post`', '`put`'].

    ``Method_value`` - :ref:`Schema` of answer that return our request,
    it need for render response page.
    List of values: ['`list`', '`post`', '`page`', '`edit`', '`exec`', ''].

multi_actions
""""""""""""""""""""""""""""
Type: ``Associative array``

Description: Contains pair ``action_name`` with ``action_object`` or ``action_function``

    ``action_name`` - name of :ref:`entity<terms>`

    ``action_object`` - link to :ref:`entity<terms>`

    ``action_function`` - ``string`` that contains name of function from JavaScript sources.

.. _name:

name
"""""""""""""""""""""
Type: ``String``

Description: Name of :ref:`entity<terms>`

name_field
""""""""""""""""""""""""
Type: ``String``

Description: Field that contains name of :ref:`entity<terms>`

.. _page entity:

page
"""""""""""""""""""""""""""
Type: ``Object``

Description: Contains :ref:`entity<terms>` with detail data

page_path
""""""""""""""""""""""""""
Type: ``String``

Description: API path to :ref:`page entity`

parent
"""""""""""""""""""""""""
Type: ``Object``

Description: Link to parent :ref:`entity<terms>`

parent_path
"""""""""""""""""""""""""
Type: ``String``

Description: Contains API path to parent :ref:`entity<terms>`

path
""""""""""""""""""
Type: ``String``

Description: API path of current :ref:`entity<terms>`

.. _Schema:

schema
"""""""""""""""""""""""
Type: ``Associative array``

Description: Array contains pair ``schema_entity_name``:``schema_entity`` for all methods available for this element

selectionTag
""""""""""""""""""""""""
Type: ``String``

Description: Unique ``key_name``, via that key create dictionary with [True|False].
Need for choose more than one element in list

short_name
""""""""""""""""""""""""
Type: ``String``

Description: Short name of :ref:`entity<terms>`

shortestURL
""""""""""""""""""""""""
Type: ``String``

Description: Contains ``string`` with shortest url to this :ref:`entity<terms>`

.. _sublinks:

sublinks
""""""""""""""""""""""""""
Type: ``Associative array``

Description: Contains pair ``subkink_name``:``sublink_object`` for this element.

    ``Sublink_object`` - :ref:`GUI schema<terms>` object

sublinks_l2
""""""""""""""""""""""""""
Type: ``Associative array``

Description: Contains pair ``subkink_name``::ref:`sublink-object<sublinks>` for element that nested by 2 level lower

type
"""""""""""""""""""""""""
Type: ``String``

Description: Type of entity, can have one of this value: ``action``, ``list``, ``page``