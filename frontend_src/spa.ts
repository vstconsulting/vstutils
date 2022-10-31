import * as utils from './vstutils/utils';
export * from './app.common.js';
import * as spa from './app.common.js';

globalThis.spa = spa;

const getApp = utils.getApp;
export { getApp };

import { App } from './vstutils/app';

globalThis.App = App;
