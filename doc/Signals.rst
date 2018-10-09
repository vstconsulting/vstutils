Signals
========================

``resourse.loaded``
""""""""""""""""""""""""
Arguments: None

Description: This Signal send after load all resources

``openapi.loaded``
""""""""""""""""""""""""
 
Arguments:

	api: variable contains API

Description:
	
	Inside this event can overload openapi answer

``openapi.schema``
""""""""""""""""""""""""

Arguments:

	api: Variable with API

	schema: Variable contains gui schema

Description: Signal send if gui schema not in cache

``openapi.schema.name.[name]``
"""""""""""""""""""""""""""""""""

Arguments:
	
	paths: List of all paths

	path: Current path

	value: Current object by path

Description: Signal calls with `name` of current object.

``openapi.schema.type.[type]``
""""""""""""""""""""""""""""""""""

Arguments:
	
	paths: List of all paths

	path: Current path

	value: Current object by path

Description: Signal calls with `type` of current object.

``openapi.schema.schema``
"""""""""""""""""""""""""""""""""

Arguments:
	
	paths: List of all paths

	path: Current path

	value: Current object by path

``openapi.schema.schema.[schema]``
""""""""""""""""""""""""""""""""""""""""""""""""""""

Arguments:
	
	paths: List of all paths

	path: Current path

	value: Current object by path

	schema:

``openapi.schema.fields``
"""""""""""""""""""""""""""""""""

Arguments:
	
	paths: List of all paths

	path: Current path

	value: Current object by path

	schema:

	fields:

``openapi.paths``
""""""""""""""""""""""""

Arguments:

	api: API

Description: Signal send after schema signals

``openapi.completed``
"""""""""""""""""""""""""""

Arguments:
	
	api: API

Description: signal sended after complete openapi load 

``loading.compelted``
"""""""""""""""""""""""""

Arguments: None

Description: SIgnal send aftercomplete loaing all




