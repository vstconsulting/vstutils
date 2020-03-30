import RouterConstructor from './RouterConstructor.js';
import * as mixins from './mixins';

window.RouterConstructor = RouterConstructor;
Object.assign(window, mixins);

export { RouterConstructor, mixins };
