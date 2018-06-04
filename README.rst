VST Utils
=========

Small lib for easy generates web-applications.


Quickstart
----------

1. Install package: `pip install vstutils`

2. Create package 'prj' with minimal `__init__.py` and `__main__.py`

3. Paste to `__init__.py`:

   .. sourcecode:: python

      from vstutils.environment import prepare_environment, cmd_execution

      __version__ = '1.0.0'

      settings = {
          "VST_PROJECT": 'prj',
          "VST_ROOT_URLCONF": 'vstutils.urls',
          "VST_WSGI": 'vstutils.wsgi',
          "VST_PROJECT_GUI_NAME": "Example Project"
      }

      prepare_environment(**settings)

4. Paste to `__main__.py`:

   .. sourcecode:: python

      rom vstutils.environment import cmd_execution, sys
      sys.path.append('./')
      import prj

      cmd_execution()

5. Run `python prj runserver 0.0.0.0:8081 --insecure`

6. Enjoy!


License
-------

Apache Software License

