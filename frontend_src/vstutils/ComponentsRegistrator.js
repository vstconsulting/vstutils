/**
 * Class, that registers Vue components
 */
class ComponentsRegistrator {
    constructor() {
        this.components = {};
    }

    /**
     * Method, that adds new Vue component for registration, overrides existing.
     * If no name provided then component.name will be used.
     * @param {object} component Vue component
     * @param {string} name component name
     */
    add(component, name = null) {
        if (!name && (!component.name || typeof component.name !== 'string')) {
            throw new Error(`Can not register component: ${component}`);
        }
        this.components[name || component.name] = component;
    }

    /**
     * Method, that registers all added components
     */
    registerAll(vue) {
        for (let [name, component] of Object.entries(this.components)) {
            if (!vue.options.components[name]) {
                vue.component(name, component);
            }
        }
    }
}

const globalComponentsRegistrator = new ComponentsRegistrator();

export { ComponentsRegistrator, globalComponentsRegistrator };
