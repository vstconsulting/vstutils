from vstutils.api.health import DefaultBackend


class TestDefaultBackend(DefaultBackend):
    check_health_int = 1
