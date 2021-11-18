#  pylint: disable=invalid-name
"""
WSGI config for VST Projects project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/howto/deployment/wsgi/
"""

import gc
import os
import atexit

from django.core.wsgi import get_wsgi_application

from .environment import prepare_environment

prepare_environment()

# Instagram recommendations.
# gc.disable() doesn't work, because some random 3rd-party library will
# enable it back implicitly.
gc.set_threshold(0)
# Suicide immediately after other atexit functions finishes.
# CPython will do a bunch of cleanups in Py_Finalize which
# will again cause Copy-on-Write, including a final GC
atexit.register(os._exit, 0)  # pylint: disable=protected-access

application = get_wsgi_application()
