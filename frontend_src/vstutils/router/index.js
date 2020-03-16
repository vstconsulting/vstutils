import RouterConstructor from "./RouterConstructor.js";
import * as mixins from "./mixins.js";

window.RouterConstructor = RouterConstructor;
Object.assign(window, mixins);

export { RouterConstructor };
export * from "./mixins.js";
