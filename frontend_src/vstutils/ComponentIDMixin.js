import { createUniqueIdGenerator } from '@/vstutils/utils';

const DEFAULT_GENERATOR = createUniqueIdGenerator();

/**
 * Mixin to generate unique id for components
 */
export default {
    beforeCreate() {
        this.componentId = DEFAULT_GENERATOR();
    },
};
