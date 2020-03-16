import * as mixins from "./mixins";
Object.assign(window, mixins);

import * as items from "./items.js";
import * as widgets from "./widgets.js";

let vst_vue_components = {
  items: items,
  widgets: widgets
};
window.vst_vue_components = vst_vue_components;

export { vst_vue_components, mixins };
