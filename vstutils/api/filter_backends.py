# Call standart filtering
class HideHiddenFilterBackend(object):

    def filter_queryset(self, request, queryset, view):
        # pylint: disable=unused-argument
        return getattr(queryset, 'cleared', queryset.all)()

    def get_schema_fields(self, view):
        # pylint: disable=unused-argument
        return []
