from typing import List, Dict
from rest_framework import views
from . import base


class BulkViewSet(views.APIView):
    client_environ_keys_copy: List
    type_to_bulk: Dict


class HealthView(base.ListNonModelViewSet):
    ...


class MetricsView(base.ListNonModelViewSet):
    ...
