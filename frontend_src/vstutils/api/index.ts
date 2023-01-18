import { guiLocalSettings } from '../utils';
guiLocalSettings.setIfNotExists('guiApi.real_query_timeout', 100);

export * from './StatusError';
export * from './ApiConnector';

import openapi_dictionary from './openapi.js';
export { openapi_dictionary };
