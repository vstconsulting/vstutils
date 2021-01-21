import { ApiConnector, APIResponse } from './ApiConnector.js';
import openapi_dictionary from '../openapi.js';
import StatusError from '../StatusError.js';

const apiConnector = new ApiConnector();

export { StatusError, ApiConnector, apiConnector, APIResponse, openapi_dictionary };
