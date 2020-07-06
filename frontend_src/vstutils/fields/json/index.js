import { globalComponentsRegistrator } from '../../ComponentsRegistrator.js';
import JSONField from './JSONField.js';
import JsonMapper from './JsonMapper.js';
import JsonFieldContentReadonly from './JsonFieldContentReadonly.vue';
import JSONFieldMixin from './JSONFieldMixin.js';
import * as components from './components';

import JsonObject from './components/JsonObject.vue';
import JsonArray from './components/JsonArray.vue';
import StringJsonArray from './components/StringJsonArray.vue';
import JsonString from './components/JsonString.vue';
globalComponentsRegistrator.add(JsonObject);
globalComponentsRegistrator.add(JsonArray);
globalComponentsRegistrator.add(StringJsonArray);
globalComponentsRegistrator.add(JsonString);

export { JSONField, JsonFieldContentReadonly, JSONFieldMixin, JsonMapper, components };
