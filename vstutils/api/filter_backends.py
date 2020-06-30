# Call standart filtering
class VSTFilterBackend:
    __slots__ = ()
    required = False


class HideHiddenFilterBackend(VSTFilterBackend):
    __slots__ = ()
    required = True

    def filter_queryset(self, request, queryset, view):
        # pylint: disable=unused-argument
        """
        Clear objects with hidden attr from queryset.
        """
        return getattr(queryset, 'cleared', queryset.all)()

    def get_schema_fields(self, view):
        # pylint: disable=unused-argument
        return []
