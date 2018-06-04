from django.conf import settings


def settings_constants(request):
    # pylint: disable=unused-argument
    data = {"login_url": getattr(settings, 'LOGIN_URL', '/login/'),
            "logout_url": getattr(settings, 'LOGOUT_URL', '/logout/'),
            "docs_url": getattr(settings, 'DOC_URL', '/docs/'),
            "has_docs": getattr(settings, 'HAS_DOCS', False),
            "timezone": getattr(settings, 'TIME_ZONE', 'UTC'),
            "debug": getattr(settings, 'DEBUG', False)}
    return data


def project_args(request):
    host_url = request.build_absolute_uri('/')
    ver_key = "{}_version".format(getattr(settings, 'VST_PROJECT', "vstutils"))
    return {
        "host_url": host_url[:-1],
        ver_key: getattr(settings, 'PROJECT_VERSION', False),
        "gui_version": getattr(settings, 'PROJECT_VERSION', ''),
        "project_gui_name": getattr(settings, 'PROJECT_GUI_NAME', None)
    }


def headers_context(request):
    result = dict(request.META)
    result['HTTP_X_APP'] = result.get('HTTP_X_APP', 'browser')
    return dict(metadata=result)
