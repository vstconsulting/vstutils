import Model from './Model.js';
import ModelConstructor from './ModelConstructor.js';

/**
 * Object, that contains Models classes.
 * Model class - constructor, that creates Models - JS objects.
 * This Model (JS object) is an abstraction aimed to be something similar to Django Models.
 * This Model can create Model instances (also JS Objects),
 * that aimed to be something similar to Django Model instances.
 */
window.guiModels = { Model };

window.ModelConstructor = ModelConstructor;

export { Model, ModelConstructor };
