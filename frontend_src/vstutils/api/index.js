import { guiLocalSettings } from '../utils';
guiLocalSettings.setIfNotExists('guiApi.real_query_timeout', 100);

import StatusError from './StatusError.js';
import { ApiConnector, APIResponse, apiConnector } from './ApiConnector.js';
import openapi_dictionary from './openapi.js';

export { StatusError, ApiConnector, APIResponse, apiConnector, openapi_dictionary };
