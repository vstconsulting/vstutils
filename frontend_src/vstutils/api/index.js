import { guiLocalSettings } from '../utils';
guiLocalSettings.setIfNotExists('guiApi.real_query_timeout', 100);

import StatusError from './StatusError.js';
import ApiConnector from './ApiConnector.js';
import openapi_dictionary from './openapi.js';

export { StatusError, ApiConnector, openapi_dictionary };
