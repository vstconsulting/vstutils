VSTUtils Framework
==================

Small framework for easy generates web-applications (SPA or Single Page Application).
It uses OpenAPI schema for GUI rendering based over the REST API
and also provides the ability to generate documentation for the API based on the schema.


Quickstart
----------

1. Install package: `pip install vstutils`

2. Create package 'prj': `vstutilsctl newproject --name proj`

3. Change directory to project and run `python proj web`

4. Enjoy! See http://localhost:8080/

See example in `test_src/test_proj`.


New project
-----------

*  New projects will be created with all needed for building dist.
*  Destination where project will be created could be changed via --dir=[directory].
*  Name which will be shown in GUI could be changed via --guiname=[GUI NAME].


Projects
--------

* Polemarch (https://polemarch.org/)


License
-------

VSTUtils is licensed under the terms of the Apache License 2.0.
See the file "LICENSE" for more information.

Copyright 2018-2019 VST Consulting
