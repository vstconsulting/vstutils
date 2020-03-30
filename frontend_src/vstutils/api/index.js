import { guiLocalSettings } from '../utils';
guiLocalSettings.setIfNotExists('guiApi.real_query_timeout', 100);

import StatusError from './StatusError.js';
window.StatusError = StatusError;

import ApiConnector from './ApiConnector.js';
window.ApiConnector = ApiConnector;

import openapi_dictionary from './openapi.js';
window.openapi_dictionary = openapi_dictionary;

export { StatusError, ApiConnector, openapi_dictionary };
