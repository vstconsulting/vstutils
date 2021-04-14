/**
 * Creates an ID generator function. Every execution returns a prefix text
 * concatenated with an incremented number.
 * @param {string} [prefix] A text to be concatenated with an incremented number.
 */
export const createGenerator = (prefix = '') => {
    let count = 0;
    return () => prefix + (++count).toString(10);
};

/**
 * Default generator function.
 */
const DEFAULT_GENERATOR = createGenerator();

/**
 * Mixin to generate unique id for components
 */
export default {
    beforeCreate() {
        this.componentId = DEFAULT_GENERATOR();
    },
};
