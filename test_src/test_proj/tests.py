from vstutils.unittests import BaseTestCase, VSTUtilsTestCase
from .models import Host


class ProjectTestCase(BaseTestCase):
    def setUp(self):
        self.predefined_hosts_cnt = 10
        for i in range(self.predefined_hosts_cnt):
            Host.objects.create(name='test_{}'.format(i))

    def test_models(self):
        self.assertEqual(Host.objects.all().count(), self.predefined_hosts_cnt)
        Host.objects.all().delete()
        Host.objects.create(name='test_one')
        self.assertEqual(Host.objects.test_filter().count(), 1)
        Host.objects.create(name='test_two', hidden=True)
        self.assertEqual(Host.objects.all().count(), 2)
        self.assertEqual(Host.objects.all().cleared().count(), 1)
