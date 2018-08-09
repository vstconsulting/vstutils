import json
import six
from django.core.management import call_command
from vstutils.unittests import BaseTestCase, VSTUtilsTestCase
from .models import Host, HostGroup


class ProjectTestCase(BaseTestCase):
    def setUp(self):
        super(ProjectTestCase, self).setUp()
        self.predefined_hosts_cnt = 10
        for i in range(self.predefined_hosts_cnt):
            Host.objects.create(name='test_{}'.format(i))
        self.objects_bulk_data = [
            self.get_bulk('hosts', dict(name='a'), 'add'),
            self.get_mod_bulk('hosts', '<0[data][id]>', dict(name='b'), 'subgroups'),
            self.get_mod_bulk('hosts', '<1[data][id]>', dict(name='c'), 'subgroups'),
            self.get_mod_bulk('hosts', '<2[data][id]>', dict(name='d'), 'subgroups'),
            self.get_mod_bulk('hosts', '<0[data][id]>', dict(name='aa'), 'hosts'),
            self.get_mod_bulk('hosts', '<1[data][id]>', dict(name='ba'), 'hosts'),
            self.get_mod_bulk('hosts', '<2[data][id]>', dict(name='ca'), 'hosts'),
            self.get_mod_bulk('hosts', '<3[data][id]>', dict(name='da'), 'hosts'),
        ]

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

    def test_objects_copy(self):
        Host.objects.all().delete()
        HostGroup.objects.all().delete()
        bulk_data = list(self.objects_bulk_data)
        bulk_data.append(
            self.get_mod_bulk('hosts', '<1[data][id]>', {'name': 'copied'}, 'copy')
        )
        bulk_data.append(
            self.get_mod_bulk('hosts', '<1[data][id]>', {}, 'copy')
        )
        results = self.make_bulk(bulk_data)
        self.assertNotEqual(results[-2]['data']['id'], results[1]['data']['id'])
        self.assertEqual(results[-2]['data']['name'], 'copied')
        self.assertNotEqual(results[-1]['data']['id'], results[1]['data']['id'])
        self.assertEqual(
            results[-1]['data']['name'], 'copy-{}'.format(results[1]['data']['name'])
        )
        self._check_subhost(
            results[0]['data']['id'],
            ('subgroups', results[-1]['data']['id']),
            name='copy-b'
        )
        self._check_subhost(
            results[0]['data']['id'],
            ('subgroups', results[-2]['data']['id']),
            name='copied'
        )
        self._check_subhost(
            results[-1]['data']['id'],
            ('hosts', results[5]['data']['id']),
            name='ba'
        )

    def test_hierarchy(self):
        Host.objects.all().delete()
        HostGroup.objects.all().delete()
        bulk_data = list(self.objects_bulk_data)
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
            self.get_mod_bulk('hosts', host_group_id, {}, 'shost/<14[data][id]>', 'delete'),
            self.get_mod_bulk('hosts', host_group_id, dict(id='<14[data][id]>'), 'shost'),
        ]
        results = self.make_bulk(bulk_data, 'put')
        self.assertCount(hg.hosts.all(), 1)
        self.assertEqual(results[0]['data']['count'], 1, results[0])
        self.assertEqual(results[1]['data']['count'], 1, results[1])
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
        self.assertEqual(results[18]['status'], 204)
        self.assertEqual(results[19]['status'], 201)

    def test_coreapi_schema(self):
        stdout = six.StringIO()
        call_command('generate_swagger', format='json', stdout=stdout)
        data = json.loads(stdout.getvalue())
        # Check default settings
        self.assertEqual(
            data['basePath'], '/{}/{}'.format(
                self._settings('VST_API_URL'), self._settings('VST_API_VERSION')
            )
        )
        self.assertEqual(
            data['info']['contact']['someExtraUrl'],
            self._settings('CONTACT')['some_extra_url']
        )
        self.assertEqual(data['info']['title'], self._settings('PROJECT_GUI_NAME'))
        self.assertEqual(data['swagger'], '2.0')
        # Check default values
        api_model_user = data['definitions']['User']
        self.assertEqual(api_model_user['type'], 'object')
        self.assertIn('username', api_model_user['required'])
        self.assertEqual(api_model_user['properties']['username']['type'], 'string')
        self.assertEqual(api_model_user['properties']['id']['type'], 'integer')
        self.assertEqual(api_model_user['properties']['id']['readOnly'], True)
        self.assertEqual(api_model_user['properties']['is_active']['type'], 'boolean')
        self.assertEqual(api_model_user['properties']['is_staff']['type'], 'boolean')
        # Check autocomplete field
        api_model_hostgroup = data['definitions']['HostGroup']
        hostgroup_props = api_model_hostgroup['properties']
        self.assertEqual(api_model_hostgroup['properties']['parent']['type'], 'string')
        self.assertEqual(hostgroup_props['parent']['format'], 'autocomplete')
        self.assertEqual(
            hostgroup_props['parent']['additionalProperties']['$ref'],
            '#/definitions/Host/properties/id'
        )
        # Check file and secret_file fields
        self.assertEqual(hostgroup_props['file']['type'], 'string')
        self.assertEqual(hostgroup_props['file']['format'], 'file')
        self.assertEqual(hostgroup_props['secret_file']['type'], 'string')
        self.assertEqual(hostgroup_props['secret_file']['format'], 'secretfile')
