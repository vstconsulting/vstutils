from collections import OrderedDict

from rest_framework.pagination import LimitOffsetPagination as DRFLimitOffsetPagination

from .responses import BaseResponseClass


class LimitOffsetPagination(DRFLimitOffsetPagination):
    def paginate_queryset(self, queryset, request, view=None):
        self.identifier = request.headers.get('Identifiers-List-Name')
        return super().paginate_queryset(queryset, request, view)

    def get_paginated_response(self, data):
        response = BaseResponseClass(OrderedDict([
            ('count', self.count),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('results', data)
        ]))
        if self.identifier is not None:
            response.headers['Pagination-Identifiers'] = ','.join(map(str, (d[self.identifier] for d in data)))
        return response
