VST Utils JavaScript functions
==============================
List of common JS functions that you can use in your application.

String.format()
""""""""""""""""""""
**Description:** This function gets list or associative array with values,
that should change some keys in the string.

String.format_keys()
""""""""""""""""""""""""""""""""
**Description:** Function searches and returns all {keys} as list.

trim(s)
"""""""
**Arguments:**

* s: {string} - string to trim.

**Description:** Function trims (deletes non-printing characters from the beginning and from the end of string).

capitalizeString(string)
""""""""""""""""""""""""
**Arguments:**

* string: {string} - string to edit.

**Description:** Returns string with first letter in upper case and others in lower case.

sliceLongString(string="", valid_length=100)
""""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* string: {string} - String for slicing. Default value: "".
* valid_length: {number} - Amount of letters. Default value: 100.

**Description:** Function compares string's length with the 'valid_length'.
If 'string.length' > 'valid_length', then function slices string to the 'valid_length'
and adds '...' at the end of sliced string.

isEmptyObject(object)
"""""""""""""""""""""
**Arguments:**

* object: {object} - object to check.

**Description:** Checks object is empty (object has no properties). Returns true if object is empty,
otherwise, returns false.


addCssClassesToElement(element="", title="", type="")
"""""""""""""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* element: {string} - Name of element. Default value: "";
* title: {string} - Title of element. Default value: "";
* type: {string} - Type of element. Default value: "".

**Description:** Returns string contains css class(-es), that were formed based on different combinations of arguments.

getCookie(name)
"""""""""""""""
**Arguments:**

* name: {string} - Name of cookie.

**Description:** Returns cookie value if it exists. Otherwise, returns null.

deepEqual(x, y)
"""""""""""""""
**Arguments:**

* x: {object} - First object to compare;
* y: {object} - Second object to compare.

**Description:** Function checks types of x and y.
If both are objects, then function checks that all properties of those objects are equal.
Otherwise, function compares x and y with the === operator.

stringToBoolean(string)
"""""""""""""""""""""""
**Arguments:**

* string: {string} - String to check on boolean value.

**Description:** Function checks string for keeping boolean value and return this value.

oneCharNumberToTwoChar(n)
"""""""""""""""""""""""""
**Arguments:**

* n: {number} - Number to transform.

**Description:** Function converts numbers from 0 to 9 into 00 to 09.

allPropertiesIsObjects(obj)
"""""""""""""""""""""""""""
**Arguments:**

* obj: {object} - Object to check.

**Description:** Function checks that all properties of object are also objects. Returns boolean value.

arrayBufferToBase64(buffer)
"""""""""""""""""""""""""""
**Arguments:**

* buffer: {array} - Instance of Array​Buffer.

**Description:** Function converts instance of Array​Buffer to Base64.

randomString(length, abc="qwertyuiopasdfghjklzxcvbnm012364489")
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* length: {number} - Random string's length;
* abc: {string} - String with chars, that can be used in random string. Default value: "qwertyuiopasdfghjklzxcvbnm012364489".

**Description:** Function forms random string and returns it.

hexToRgbA(hex, alpha=1)
"""""""""""""""""""""""
**Arguments:**

* hex: {string} - Color in HEX format (#fefefe);
* aplha: {number} - Opacity value of RGBa color (0-1). Default value: 1.

**Description:** Function converts color from hex to rgba.

getTimeInUptimeFormat(time)
"""""""""""""""""""""""""""
**Arguments:**

* time: {number} - Time in seconds.

**Description:** Function returns time in uptime format.

findClosestPath(paths, current_path)
""""""""""""""""""""""""""""""""""""
**Arguments:**

* paths: {array} - Array with paths({string});
* current_path: {string} - Path, based on which function makes search.

**Description:** Function, that finds the most appropriate (closest) path from path array to current_path.
It's supposed, that values in 'paths' array' were previously sorted.
It's supposed, that 'paths' array does not contain all application paths.

cleanAllCacheAndReloadPage()
""""""""""""""""""""""""""""
**Description:** Function, that cleans files cache, unregisters current Service Worker instance and reloads page.

cleanOpenApiCacheAndReloadPage()
""""""""""""""""""""""""""""""""
**Description:** Function, that removes OpenAPI schema from cache and reloads page.

updateGuiVersionsInLocalStorage()
"""""""""""""""""""""""""""""""""
**Description:** Function saves to the Local Storage values of global gui versions variables.

createDomElement(type, attributes, props)
"""""""""""""""""""""""""""""""""""""""""
**Arguments:**

* type: {string} - Type (tag) of DOM element;
* attributes: {array} - Array of objects - DOM element attributes(key, value);
* props: {object} - Object with properties of DOM element.

**Description:** Function creates DOM element and sets it attributes and props.

onLoadingErrorHandler(event)
""""""""""""""""""""""""""""
**Arguments:**

* event: {object} - Error event.

**Description:** Handler for window.onerror event, that should be called during app dependencies loading,
if some error occurred in content of loaded files.





