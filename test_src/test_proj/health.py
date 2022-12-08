from vstutils.api.health import DefaultBackend
from vstutils.api.metrics import BaseBackend as MetricsBaseBackend


def metrics_generator():
    for i in range(2):
        yield '{prefix}_generated_data_tuple', (b'', (1, 2, 3))
        yield '{prefix}_generated_data_dict', ({"int": 1, "str": "text"}, 1)
        yield '{prefix}_generated_data_simple', 1


class TestDefaultBackend(DefaultBackend):
    check_health_int = 1


class TestMetricsDefaultBackend(MetricsBaseBackend, metrics_prefix='test'):
    __slots__ = ()
    metrics_list = (
        ('test_multiple_metrics', lambda: (b'', (1,2,3))),
        ('test_data_values', lambda: ({"int": 1, "str": "text"}, 1)),
        ('{prefix}_simple_metric', lambda: 1),
        (None, metrics_generator),
    )
