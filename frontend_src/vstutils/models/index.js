import { Model, ModelClass } from './Model.js';
import ModelConstructor, { NoModel } from './ModelConstructor.js';
import { ModelsResolver } from './ModelsResolver.js';
import { mapToObjectProxy } from '../utils';

const globalModels = new Map();

/**
 * @deprecated
 * @type {Object<string, BaseField>}
 */
const guiModels = mapToObjectProxy(globalModels);

export { Model, ModelClass, ModelConstructor, ModelsResolver, globalModels, guiModels, NoModel };
