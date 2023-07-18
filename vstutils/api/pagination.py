from collections import OrderedDict

from rest_framework.pagination import LimitOffsetPagination as DRFLimitOffsetPagination

from .responses import HTTP_200_OK


class LimitOffsetPagination(DRFLimitOffsetPagination):
    response_class = HTTP_200_OK

    def paginate_queryset(self, queryset, request, view=None):
        self.identifier = request.headers.get('Identifiers-List-Name')
        return super().paginate_queryset(queryset, request, view)

    def get_response_data(self, data):
        return OrderedDict([
            ('count', self.count),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('results', data)
        ])

    def get_paginated_response(self, data):
        response = self.response_class(self.get_response_data(data))
        if self.identifier is not None:
            response.headers['Pagination-Identifiers'] = ','.join(map(str, (d[self.identifier] for d in data)))
        return response

    def get_paginated_response_schema(self, schema):
        paginated_schema = super().get_paginated_response_schema(schema)
        paginated_schema['required'] = ['count', 'results']
        return paginated_schema
