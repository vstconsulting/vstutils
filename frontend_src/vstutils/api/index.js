import { guiLocalSettings } from "../utils";
guiLocalSettings.setIfNotExists("guiApi.real_query_timeout", 100);

import StatusError from "./StatusError.js";
window.StatusError = StatusError;

import ApiConnector from "./ApiConnector.js";
window.ApiConnector = ApiConnector;

import { api_connector_config, openapi_dictionary } from "./openapi.js";
window.api_connector_config = api_connector_config;
window.openapi_dictionary = openapi_dictionary;

export { StatusError, ApiConnector, api_connector_config, openapi_dictionary };
