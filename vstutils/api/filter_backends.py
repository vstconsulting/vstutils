# Call standart filtering
class HideHiddenFilterBackend(object):

    def filter_queryset(self, request, queryset, view):
        return getattr(queryset, 'cleared', queryset.all)()

    def get_schema_fields(self, view):
        return []
