Fields of gui schema
========================

List of fields, gui schema object can have not all of this fields.

actions
"""""""""""""""""
Type: ``Object``

Description: Object contains list of action that can be do by that object


bulk_name
"""""""""""""""""
Type: ``String``

Description: Name for bulk requests


buttons
"""""""""""""""""
Type: ``array``

Description: Array contains button object


canAdd
"""""""""""""""""
Type: ``Boolean``

Description: Can add elements as children elements


canCreate
"""""""""""""""""
Type: ``Boolean``

Description: Can create new elements of same type or elements that can be children

canDelete
"""""""""""""""""
Type: ``Boolean``

Description: Can delete element

canEdit
"""""""""""""""""
Type: ``Boolean``

Description: Can edit element

canRemove
"""""""""""""""""
Type: ``Boolean``

Description: Can remove element from children list of this element

extension_class_name
""""""""""""""""""""""""""""
Type: ``Array``

Description: array of ``object_names`` that used to inheriance

hide_non_required
""""""""""""""""""""""""""""
Type: ``Integer``

Description: Number of elements, after that number try collapse form

isEmptyAction
""""""""""""""""""""""""""""
Type: ``Boolean``

Description: This action schema is empty

level
""""""""""""""""""""""""""""
Type: ``Integer``

Description: Nested level of element

links
"""""""""""""""""""""""""""
Type: ``Associative array``

Description: Link to nested elements

list
""""""""""""""""""""""""""""
Type: ``Object``

Description: Object contains list of object with the same type

list_path
"""""""""""""""""""""""""""""
Type: ``String``

Description: Path to list of objects

method
""""""""""""""""""""""""""""
Type: 'Associative array'

Description: Array contains pair ``method_name``:``HTTP_method_name``

methodAdd
""""""""""""""""""""""""""""
Type: ``String``

Description: Name of HTTP method

methodDelete
""""""""""""""""""""""""""""
Type: ``String``

Description: Name of HTTP method

methodEdit
""""""""""""""""""""""""""""
Type: ``String``

Description: Name of HTTP method

methodExec
""""""""""""""""""""""""""""
Type: ``String``

Description: Name of HTTP method

multi_actions
""""""""""""""""""""""""""""
Type: ``Associative array``

Description: Contains pair ``action_name`` with ``action_objct`` or ``action_function``

name
"""""""""""""""""""""
Type: ``String``

Description: Name of element

name_field
""""""""""""""""""""""""
Type: ``String``

Description: Field that contains name of element

page
"""""""""""""""""""""""""""
Type: ``Object``

Description: Contains object with detail data for elements of the list

page_path
""""""""""""""""""""""""""
Type: ``String``

Description: Path to detail data of the object

parent
"""""""""""""""""""""""""
Type: ``Object``

Description: Contains object of parent element

parent_path
"""""""""""""""""""""""""
Type: ``String``

Description: contains api path to parent object

path
""""""""""""""""""
Type: ``String``

Description: Current path in api

schema
"""""""""""""""""""""""
Type: ``Associative array``

Description: Array contains schema for all methods available for this element

selectionTag
""""""""""""""""""""""""
Type: ``String``

Description: Unique ``key_name``, via that key create dictionary with [True|False]. Need for choose more than one element in list

short_name
""""""""""""""""""""""""
Type: ``String``

Description: Short name of element

shortestURL
""""""""""""""""""""""""
Type: ``Object``

Description: Contains object with shortest url to element of the same type

sublinks
""""""""""""""""""""""""""
Type: ``Associative array``

Description: Contains pair ``subkinks_name``:``sublinks_object`` for this element

sublinks_l2
""""""""""""""""""""""""""
Type: ``Associative array``

Description: Contains pair ``subkinks_name``:``sublinks_object`` for element that nested by 2 level lower

type
"""""""""""""""""""""""""
Type: ``String``

Description: Type of API path