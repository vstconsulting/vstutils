from vstutils.unittests import BaseTestCase, VSTUtilsTestCase
from .models import Host, HostGroup


class ProjectTestCase(BaseTestCase):
    def setUp(self):
        super(ProjectTestCase, self).setUp()
        self.predefined_hosts_cnt = 10
        for i in range(self.predefined_hosts_cnt):
            Host.objects.create(name='test_{}'.format(i))

    def test_models(self):
        self.assertEqual(Host.objects.all().count(), self.predefined_hosts_cnt)
        Host.objects.all().delete()
        Host.objects.create(name='test_one')
        self.assertEqual(Host.objects.test_filter().count(), 1)
        Host.objects.create(name=self.random_name(), hidden=True)
        self.assertEqual(Host.objects.all().count(), 2)
        self.assertEqual(Host.objects.all().cleared().count(), 1)

    def _check_subhost(self, id, *args, **kwargs):
        suburls = '/'.join(['{}/{}'.format(s, i) for s, i in args])
        url = self.get_url('hosts', id, suburls)
        result = self.get_result('get', url)
        for key, value in kwargs.items():
            self.assertEqual(result.get(key, None), value, result)

    def test_hierarchy(self):
        Host.objects.all().delete()
        HostGroup.objects.all().delete()
        bulk_data = [
            self.get_bulk('hosts', dict(name='a'), 'add'),
            self.get_mod_bulk('hosts', '<0[data][id]>', dict(name='b'), 'subgroups'),
            self.get_mod_bulk('hosts', '<1[data][id]>', dict(name='c'), 'subgroups'),
            self.get_mod_bulk('hosts', '<2[data][id]>', dict(name='d'), 'subgroups'),
            self.get_mod_bulk('hosts', '<0[data][id]>', dict(name='aa'), 'hosts'),
            self.get_mod_bulk('hosts', '<1[data][id]>', dict(name='ba'), 'hosts'),
            self.get_mod_bulk('hosts', '<2[data][id]>', dict(name='ca'), 'hosts'),
            self.get_mod_bulk('hosts', '<3[data][id]>', dict(name='da'), 'hosts'),
        ]
        results = self.make_bulk(bulk_data)
        for result in results:
            self.assertEqual(result['status'], 201, result)
            del result
        self._check_subhost(results[0]['data']['id'], name='a')
        self._check_subhost(
            results[0]['data']['id'],
            ('subgroups', results[1]['data']['id']),
            name='b'
        )
        self._check_subhost(
            results[1]['data']['id'],
            ('subgroups', results[2]['data']['id']),
            name='c'
        )
        self._check_subhost(
            results[2]['data']['id'],
            ('subgroups', results[3]['data']['id']),
            name='d'
        )
        self._check_subhost(
            results[0]['data']['id'],
            ('hosts', results[4]['data']['id']),
            name='aa'
        )
        self._check_subhost(
            results[1]['data']['id'],
            ('hosts', results[5]['data']['id']),
            name='ba'
        )
        self._check_subhost(
            results[2]['data']['id'],
            ('hosts', results[6]['data']['id']),
            name='ca'
        )
        self._check_subhost(
            results[3]['data']['id'],
            ('hosts', results[7]['data']['id']),
            name='da'
        )
        # More tests
        host_group_id = results[0]['data']['id']
        host_id = results[4]['data']['id']
        hg = HostGroup.objects.get(pk=host_group_id)
        bulk_data = [
            self.get_mod_bulk('hosts', host_group_id, {}, 'subgroups', 'get'),
            self.get_mod_bulk('hosts', host_group_id, {}, 'hosts', 'get'),
            self.get_mod_bulk(
                'hosts', host_group_id, dict(name="test1"),
                'hosts/{}'.format(host_id), 'patch'
            ),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'hosts/{}'.format(host_id), 'get'
            ),
            self.get_mod_bulk(
                'hosts', host_group_id, dict(name="test2"),
                'hosts/{}'.format(host_id), 'put'
            ),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'hosts/{}'.format(host_id), 'get'
            ),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'hosts/{}'.format(999), 'get'
            ),
            self.get_mod_bulk('hosts', host_group_id, {}, 'subhosts', 'get'),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'hosts/{}'.format(host_id), 'delete'
            ),
            self.get_mod_bulk(
                'hosts', host_group_id, {'name': ''}, 'hosts/{}'.format(host_id), 'patch'
            ),
            self.get_mod_bulk('hosts', host_group_id, {'name': 'some'}, 'shost'),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'shost/<10[data][id]>', 'delete'
            ),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'hosts', 'get', filters='offset=10'
            ),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'shost/<24[data][id]>', 'get'
            ),
            self.get_mod_bulk('hosts', host_group_id, {'name': 'some_other'}, 'shost'),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'shost/<14[data][id]>/test', 'get'
            ),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'shost/<14[data][id]>/test2', 'get'
            ),
            self.get_mod_bulk(
                'hosts', host_group_id, {}, 'shost/<14[data][id]>/test3', 'get'
            ),
        ]
        results = self.make_bulk(bulk_data, 'put')
        self.assertCount(hg.hosts.all(), 1)
        self.assertEqual(results[0]['data']['count'], 1)
        self.assertEqual(results[1]['data']['count'], 1)
        self.assertEqual(results[2]['data']['id'], host_id)
        self.assertEqual(results[2]['data']['name'], 'test1')
        self.assertEqual(results[3]['data']['id'], host_id)
        self.assertEqual(results[3]['data']['name'], 'test1')
        self.assertEqual(results[4]['data']['id'], host_id)
        self.assertEqual(results[4]['data']['name'], 'test2')
        self.assertEqual(results[5]['data']['id'], host_id)
        self.assertEqual(results[5]['data']['name'], 'test2')
        self.assertEqual(results[6]['status'], 404)
        self.assertEqual(results[7]['data']['count'], 1)
        self.assertEqual(results[8]['status'], 204)
        self.assertEqual(results[9]['status'], 404)
        self.assertEqual(results[10]['data']['name'], 'some')
        self.assertEqual(results[11]['status'], 204)
        self.assertTrue(Host.objects.filter(pk=results[10]['data']['id']).exists())
        self.assertEqual(results[12]['data']['results'], [])
        self.assertEqual(results[13]['status'], 400)
        self.assertEqual(results[13]['data']['error_type'], "IndexError")
        self.assertEqual(results[15]['status'], 200)
        self.assertEqual(results[15]['data']['detail'], "OK")
        self.assertEqual(results[16]['status'], 201)
        self.assertEqual(results[16]['data']['detail'], "OK")
        self.assertEqual(results[17]['status'], 404)
