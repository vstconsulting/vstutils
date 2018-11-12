# Call standart filtering
class VSTFilterBackend(object):
    __slots__ = ()
    required = False


class HideHiddenFilterBackend(VSTFilterBackend):
    __slots__ = ()
    required = True

    def filter_queryset(self, request, queryset, view):
        # pylint: disable=unused-argument
        return getattr(queryset, 'cleared', queryset.all)()

    def get_schema_fields(self, view):
        # pylint: disable=unused-argument
        return []
