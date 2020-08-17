let counter = 0;

/**
 * Mixin to generate unique id for components
 */
export default {
    beforeCreate() {
        this.componentId = (++counter).toString();
    },
};
