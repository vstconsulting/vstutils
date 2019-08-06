VSTUtils JavaScript functions
=============================
List of common JS functions that you can use in your application.

String.format()
""""""""""""""""""""
**Description:** This function gets list or associative array with values,
that should change some keys in the string.

String.format_keys()
""""""""""""""""""""""""""""""""
**Description:** Function searches and returns all ``{keys}`` as list.

trim(s)
"""""""
**Arguments:**

* s: string to trim.

**Description:** Function trims (deletes non-printing characters from the beginning and from the end of string).

capitalizeString(string)
"""""""""""""""""""""""""""""""
**Arguments:**

* string: string to edit.

**Description:** Returns string with first letter in upper case and others in lower case.

sliceLongString(string, valid_length)
""""""""""""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* string: String for slicing. Default value: ``""``.
* valid_length: Amount of letters. Default value: 100.

**Description:** Function compares string's length with the ``valid_length``.
If ``'string.length > valid_length'``, then function slices string to the ``valid_length``
and adds ``'...'`` at the end of sliced string.

isEmptyObject(object)
""""""""""""""""""""""""""
**Arguments:**

* object: ``object`` to check.

**Description:** Checks ``object`` is empty (object has no properties). Returns ``true`` if object is empty,
otherwise, returns false.


addCssClassesToElement(element, title, type)
"""""""""""""""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* element: Name of element. Default value: ``""``;
* title: Title of element;
* type: Type of element.

**Description:** Returns string contains css class(-es), that were formed based on different combinations of arguments.

deepEqual(x, y)
"""""""""""""""
**Arguments:**

* x: First object to compare;
* y: Second object to compare.

**Description:** Function checks types of ``x`` and ``y``.
If both are objects, then function checks that all properties of those objects are equal.
Otherwise, function compares ``x`` and ``y`` with the ``===`` operator.

stringToBoolean(string)
"""""""""""""""""""""""
**Arguments:**

* string: String to check on boolean value.

**Description:** Function checks string for keeping boolean value and return this value.

oneCharNumberToTwoChar(n)
"""""""""""""""""""""""""
**Arguments:**

* n: Number to transform.

**Description:** Function converts numbers from 0 to 9 into 00 to 09.

allPropertiesIsObjects(obj)
"""""""""""""""""""""""""""
**Arguments:**

* obj: Object to check.

**Description:** Function checks that all properties of object are also objects. Returns boolean value.

arrayBufferToBase64(buffer)
"""""""""""""""""""""""""""
**Arguments:**

* buffer: Instance of Array​Buffer.

**Description:** Function converts instance of Array​Buffer to Base64.

randomString(length, abc)
"""""""""""""""""""""""""
**Arguments:**

* length: Random string's length;
* abc: String with chars, that can be used in random string. Default value: ``"qwertyuiopasdfghjklzxcvbnm012364489"``.

**Description:** Function forms random string and returns it.

hexToRgbA(hex, alpha)
"""""""""""""""""""""
**Arguments:**

* hex: Color in HEX format;
* aplha: Opacity value of RGBa color. Default value: 1.

**Description:** Function converts color from hex to rgba.

getTimeInUptimeFormat(time)
"""""""""""""""""""""""""""
**Arguments:**

* time: Time in seconds.

**Description:** Function returns time in uptime format.

findClosestPath(paths, current_path)
""""""""""""""""""""""""""""""""""""
**Arguments:**

* paths: Array with paths({string});
* current_path: Path, based on which function makes search.

**Description:** Function, that finds the most appropriate (closest) path from path array to current_path.
It's supposed, that values in 'paths' array' were previously sorted.
It's supposed, that 'paths' array does not contain all application paths.





