import guiFieldsMixins from "./guiFieldsMixins.js";
import fieldsRegistrator from "./fieldsRegistrator.js";
import guiFields from "./guiFields.js";

for (let [name, mixin] of Object.entries(guiFieldsMixins)) {
  window[name] = mixin;
}

window.fieldsRegistrator = fieldsRegistrator;

window.guiFields = guiFields;

export { guiFieldsMixins, fieldsRegistrator, guiFields };
