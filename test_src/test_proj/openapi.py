def hook1(request, schema):
    schema['info']['x-check-1'] = 1


def hook2(request, schema):
    schema['info']['x-check-2'] = 2


def hook3(request, schema):
    raise Exception('Invalid hook')


def hook5(request, schema):
    if request.user.is_superuser:
        schema['info']['x-check-5'] = 5
