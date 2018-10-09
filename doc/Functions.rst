VST Utils functions
===========================

``String.format()``
""""""""""""""""""""
Description: This function get list or associative array and insert in string by keys

``String.format_keys()``
""""""""""""""""""""""

Description: Function search and return all `{keys}` as list

``addslashes(string)``
""""""""""""""""""""""
Arguments:

    string: `string` that would be edit

Description: Function get string and replace all '/' to '//'

``inheritance(obj, constructor)``
""""""""""""""""""""""""""""""""""""""""

Arguments:

    obj:

    constructor:

Description:

``hidemodal()``
"""""""""""""""""""""""

Description: hide modal window

``capitalizeString(string)``
"""""""""""""""""""""""""""""""

Arguments:

    string: string to edit

Description: Return string with first letter in upper case and other in lower case

``sliceLongString(string, valid_length)``
""""""""""""""""""""""""""""""""""""""""""""""""""""

Arguments:

    string: String for slicing. Default value: `""`

    valid_length: Amount of letters. Default value: 100

Description: Slice long string and if `'string.length > valid_length'` at end of slicing string add `'...'`.

``toIdString(string)``
""""""""""""""""""""""
Arguments:

    string: `string` that would be edit

Description: Replace all non letter, non numeric or ```-``` to ```_```. After that replace ```[]``` to ```_```.

``isEmptyObject(object)``
""""""""""""""""""""""""""

Arguments:

    object: `object` for check

Description: Check `object` is empty.

``readFileAndInsert(event, element)``
""""""""""""""""""""""""""""""""""""""""""""

Arguments:

    event:

    element:

Description:

``addCssClassesToElement(element, title, type)``
""""""""""""""""""""""""""""""""""

Arguments:

    element: Name of element. Default value: `""`

    title: Title of element.

    type: Type of element

Description: Return string contains css class(-es)


``addStylesAndClassesToListField(guiObj, field, data, opt)``
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

Arguments:

    guiObj: elemnt of gui

    field: field of this gui object

    data: variables values for field

    opt: additional properties of field

Description: Return style and class as string

``turnTableTrIntoLink(event)``
""""""""""""""""""""""""""""""""""""

Arguments:

    event:

Description: Open URL from event data

``hideIdInList(listObject)``
""""""""""""""""""""""""""""

Arguments:

    listObject: list object when find `id` field

Description: Add `hidden` property to `id` field

``getNewId()``
"""""""""""""""""""""""""""""""""

Description: return new id

``vstMakeLocalUrl(url, vars)``
""""""""""""""""""""""""""""""""""""""""""

Arguments:

    url: `array` or `string` hat contains URL. Default value: `""`

    vars: variable that would be enter inside url. Default value: `{}`

Description: Make local URL

``vstGO()``
""""""""""""""""

Description:  create local URL and open it

``makeUrlForApiKeys(url_string)``
""""""""""""""""""""""""""""""""""

Arguments:

    url_string: url to replace to API keys

Description: replace keys to API

``vstMakeLocalApiUrl(url, vars)``
""""""""""""""""""""""""""""""""""""""""

Arguments:

    url: `array` or `string` hat contains URL.

    vars: variable that would be enter inside url. Default value: `{}`

Description: Create local URL for API

``openHelpModal()``
""""""""""""""""""""""

Description: Open help menu in modal window