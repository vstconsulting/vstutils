import * as items from './items';
import * as mixins from './mixins';
import * as widgets from './widgets';

/**
 * Function that transforms module to object and replace key with value from given field
 * @example
 * // return {component1: {name: "component1", ...}, Com2: {}}
 * moduleToObjectWithComponentByName({Com1: {name: "component1"}, Com2: {}})
 * @param {object} components components object to transform
 * @param {string} nameField field in each component to take name from
 */
function moduleToObjectWithComponentByName(components, nameField = 'name') {
    return Object.fromEntries(
        Object.entries(components).map(([oldName, component]) => [
            component[nameField] || oldName,
            component,
        ]),
    );
}

Object.assign(window, moduleToObjectWithComponentByName(mixins));

let vst_vue_components = {
    items: moduleToObjectWithComponentByName(items),
    widgets: moduleToObjectWithComponentByName(widgets),
};

window.vst_vue_components = vst_vue_components;

export { items, mixins, widgets };
