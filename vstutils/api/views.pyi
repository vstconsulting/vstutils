from typing import List, Dict
from . import base


class BulkViewSet(base.rvs.APIView):
    client_environ_keys_copy: List
    type_to_bulk: Dict


class HealthView(base.ListNonModelViewSet):
    ...
