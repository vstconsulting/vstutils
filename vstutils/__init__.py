# pylint: disable=django-not-available
__version__ = '1.0.0'

if __name__ == "__main__":
    from .environment import cmd_execution
    cmd_execution()
