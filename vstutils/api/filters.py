from django.contrib.auth.models import User
from django_filters import rest_framework as filters
from django_filters import CharFilter, BooleanFilter

id_help = 'A unique integer value (or comma separated list) identifying this instance.'
name_help = 'A name string value (or comma separated list) of instance.'


def _extra_search(queryset, field, value, stype):
    vals = field.split("__")
    field, tp = vals[0], (list(vals)[1:2] + [""])[0]
    field += "__{}".format(stype)
    value = value.split(",") if stype == "in" else value
    if tp.upper() == "NOT":
        return queryset.exclude(**{field: value})
    return queryset.filter(**{field: value})


def extra_filter(queryset, field, value):
    return _extra_search(queryset, field, value, "in")


def name_filter(queryset, field, value):
    return _extra_search(queryset, field, value, "contains")


class DefaultIDFilter(filters.FilterSet):
    id = CharFilter(method=extra_filter, help_text=id_help)
    id__not = CharFilter(method=extra_filter, help_text=id_help)


class UserFilter(DefaultIDFilter):
    is_active     = BooleanFilter(help_text='Boolean value meaning status of user.')
    first_name    = CharFilter(help_text='Users first name.')
    last_name     = CharFilter(help_text='Users last name.')
    email         = CharFilter(help_text="Users e-mail value.")
    username__not = CharFilter(method=name_filter, help_text=name_help)
    username      = CharFilter(method=name_filter, help_text=name_help)

    class Meta:
        model = User
        fields = ('id',
                  'username',
                  'is_active',
                  'first_name',
                  'last_name',
                  'email',)
