# pylint: disable=import-error
import collections
import io
import re
import json
import yaml
from docutils.statemachine import ViewList
from docutils.parsers.rst import Directive, directives
from docutils import nodes
from sphinx.util.nodes import nested_parse_with_titles
from sphinxcontrib.httpdomain import HTTP_STATUS_CODES


class _YamlOrderedLoader(yaml.SafeLoader):
    pass


_YamlOrderedLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG,
    lambda loader, node: collections.OrderedDict(loader.construct_pairs(node))
)


class VSTOpenApiBase(Directive):
    find_model = re.compile(r"\"\$ref\":.*\"#\/(?P<def_path>.*)\/(?P<def_name>.*)\"")
    required_arguments = 1  # path to openapi spec
    final_argument_whitespace = True  # path may contain whitespaces
    openapi_version = None
    models_path = 'definitions'
    path_path = 'paths'
    indent_depth = 2
    indent = '   '
    type_dict = dict(
        integer=1,
        uri='http://localhost:8080{}',
        string='example {}',
        textarea='exampletextarea',
        boolean='true',
        select2='username',
        dynamic='test_dynamic',
        uptime='22:11:34',
        date_time='22.06.19',
        html='test_html',
        email='example@mail.com'
    )
    uri_format_values = dict(
        pk=1,
        host_id=1,
        group_id=1,
        inventory_id=1,
        periodic_task_id=1,
        variables_id=1,
    )

    def __init__(self, *args, **kwargs):
        super(VSTOpenApiBase, self).__init__(*args, **kwargs)
        self.__view_list = ViewList()
        self.spec = {}
        self.paths = {}
        self.definitions = {}
        self.current_path = None

    def load_yaml(self):
        env = self.state.document.settings.env
        relpath, abspath = env.relfn2path(directives.path(self.arguments[0]))

        env.note_dependency(relpath)

        encoding = self.options.get('encoding', env.config.source_encoding)
        with io.open(abspath, 'rt', encoding=encoding) as stream:
            spec = yaml.load(stream, _YamlOrderedLoader)
        self.spec = spec
        self.paths = spec[self.path_path]
        self.definitions = spec[self.models_path]
        self.openapi_version = spec.get('swagger', None) or spec['openapi']
        self.options.setdefault('uri', 'file://%s' % abspath)

    def write(self, value):
        self.__view_list.append(value, '<openapi>')

    def run(self):
        # Loading yaml
        self.load_yaml()

        # Print paths from schema
        section_title = '**API Paths**'
        self.write(section_title)
        self.write('=' * len(section_title))
        self.print_paths()

        # Print models
        section_title = '**Schemas Description**'
        self.write(section_title)
        self.write('=' * len(section_title))
        self.print_schemas()

        # Render by sphinx
        node = nodes.section()
        node.document = self.state.document
        nested_parse_with_titles(self.state, self.__view_list, node)
        return node.children

    def print_paths(self):
        for path_key, path_value in self.paths.items():
            # Handler for request in path
            self.current_path = path_key
            for request_key, request_value in path_value.items():
                if request_key == 'parameters':
                    continue
                self.get_main_title(path_key, request_key)
                self.get_description(request_value)
                self.get_status_code_and_schema_rst(request_value['responses'])
                self.get_params(path_value['parameters'], 'param')
                self.get_params(request_value['parameters'], 'query')

    def print_schemas(self):
        self.indent_depth += 1
        for i in self.definitions:
            def_name = i.split('/')[-1]
            self.write('.. _{}:'.format(def_name))
            self.write('')
            self.write('{} Schema'.format(def_name))
            self.write('{}'.format('`' * (len(def_name) + 7)))
            self.write('')
            self.write(self.indent * self.indent_depth + '.. code-block:: json')
            self.indent_depth += 1
            self.write('')
            self.definition_rst(def_name)
            self.indent_depth -= 1
            self.write('')
            self.write('')
        self.indent_depth -= 1

    def get_main_title(self, path_name, request_name):
        main_title = '.. http:{}:: {}'.format(request_name, path_name)
        self.write(main_title)
        self.write(self.indent + '')

    def get_status_code_and_schema_rst(self, responses):
        for status_code, response_schema in responses.items():
            status_code = int(status_code)
            schema = response_schema.get('schema', None)
            status = HTTP_STATUS_CODES.get(status_code, None)
            if status is None or not (100 < status_code < 300):
                continue
            self.write(self.indent + '**Example Response**')
            self.write('')
            self.write(self.indent + '.. code-block:: html')
            self.write('')
            self.write('{}HTTP/1.1 {} {}'.format(self.indent * 2, status_code, status))
            self.write('{}Vary: {}'.format(self.indent * 2, response_schema['description']))
            self.write('{}Content-Type: application/json'.format(self.indent * 2))
            self.write('')

            if schema:
                self.schema_handler(schema)
            else:
                self.write(self.indent * self.indent_depth + '{}')

    def schema_handler(self, schema):
        dict_for_render = schema.get('properties', dict()).items()
        if schema.get('$ref', None):
            def_name = schema.get('$ref').split('/')[-1]
            dict_for_render = self.definitions[def_name].get('properties', dict()).items()
        elif schema.get('properties', None) is None:
            return ''

        answer_dict = dict()
        json_dict = dict()
        for opt_name, opt_value in dict_for_render:
            var_type = opt_value.get('format', None) or opt_value.get('type', None) or 'object'
            json_name = self.indent + ':jsonparameter {} {}:'.format(var_type, opt_name)
            json_dict[json_name] = self.get_json_props_for_response(var_type, opt_value)

            answer_dict[opt_name] = self.get_response_example(var_type, opt_value)
            if var_type == 'string':
                answer_dict[opt_name] = answer_dict[opt_name].format(opt_name)

        self.write('')
        for line in json.dumps(answer_dict, indent=4).split('\n'):
            self.write(self.indent * self.indent_depth + line)

        self.write('')
        for json_param_name, json_param_value in json_dict.items():
            desc = '{}{}'.format(
                json_param_value['title'], json_param_value['props_str']
            ) or 'None'
            self.write(json_param_name + ' ' + desc)

    def get_json_props_for_response(self, var_type, option_value):
        props = list()
        for name, value in option_value.items():
            if var_type in ['dynamic', 'select2']:
                break
            elif name in ['format', 'title', 'type']:
                continue
            elif isinstance(value, dict) and value.get('$ref', None):
                props.append(':ref:`{}`'.format(value['$ref'].split('/')[-1]))
            elif '$ref' in name:
                props.append(':ref:`{}`'.format(value.split('/')[-1]))
            elif var_type == 'autocomplete':
                props.append('Example values: ' + ', '.join(value))
            else:
                props.append('{}={}'.format(name, value))

        if len(props):
            props_str = '(' + ', '.join(props) + ')'
        else:
            props_str = ''
        return dict(props_str=props_str, title=option_value.get('title', ''))

    def get_response_example(self, var_type, opt_values):
        if var_type == 'uri':
            self.current_path.format(**self.uri_format_values)
            result = self.type_dict[var_type].format(self.current_path)
        elif var_type == 'array':
            items = opt_values.get('items', dict()).get('$ref', None)
            item = 'array_example'
            if items:
                item = self.get_object_example(items.split('/')[-1])
            result = [item]
        elif var_type == 'autocomplete':
            result = opt_values.get('enum', list())[0]
        elif var_type in [None, 'object']:
            def_name = opt_values.get('$ref').split('/')[-1]
            result = self.get_object_example(def_name)
        elif var_type =='select2':
            def_name = opt_values['additionalProperties']['model']['$ref'].split('/')[-1]
            value_field_name = opt_values['additionalProperties']['value_field']
            def_model = self.definitions[def_name].get('properties')
            value_field = def_model.get(value_field_name, None)
            var_type = value_field.get('format', None) or value_field.get('type', None)
            result = self.get_response_example(var_type, def_model)
        else:
            var_type = var_type.replace('-', '_')
            result = opt_values.get('default', None) or self.type_dict[var_type]
        return result

    def get_object_example(self, def_name):
        def_model = self.definitions[def_name]
        example = dict()
        for opt_name, opt_value in def_model.get('properties', dict()).items():
            var_type = opt_value.get('format', None) or opt_value.get('type', None)
            example[opt_name] = self.get_response_example(var_type, opt_value)
            if var_type == 'string':
                example[opt_name] = example[opt_name].format(opt_name)
        return example

    def definition_rst(self, definition, spec_path=None):
        spec_path = spec_path or self.models_path
        definitions = self.spec[spec_path]
        definition_property = definitions[definition]['properties'].copy()
        if not definition_property:
            self.write(self.indent * self.indent_depth + '{}')
            return
        self.indent_depth += 1
        definition_property = self.find_nested_models(definition_property, definitions)
        json_str = json.dumps(definition_property, indent=4)
        for line in json_str.split('\n'):
            self.write(self.indent * self.indent_depth + line)
        self.indent_depth -= 1

    def find_nested_models(self, model, definitions):
        for key, value in model.items():
            if isinstance(value, dict):
                model[key] = self.find_nested_models(value, definitions)
            elif key == '$ref':
                def_name = value.split('/')[-1]
                def_property = definitions[def_name]['properties']
                return self.find_nested_models(def_property, definitions)
        return model

    def get_params(self, params, name_request):
        self.write('')
        for elem in params:
            request_type = elem['type'] if elem.get('type', None) else 'schema'
            name = elem['name']
            if elem.get('required', None):
                name += '(required)'
            schema = elem.get('schema', None)
            name = self.indent + ':{} {} {}:'.format(name_request, request_type, name)
            if schema:
                definition = schema['$ref'].split('/')[-1]
                self.write(name + ' :ref:`{}`'.format(definition))
                self.write('')
            else:
                desc = elem.get('description', '')
                self.write(name)
                self.write((self.indent_depth + 1) * self.indent + '{}'.format(desc))
        self.write('')

    def get_description(self, request_value):
        self.write(self.indent + request_value['description'])
        self.write(self.indent + '')


def setup(app):
    app.setup_extension('sphinxcontrib.httpdomain')
    app.add_directive('vst_openapi', VSTOpenApiBase)
