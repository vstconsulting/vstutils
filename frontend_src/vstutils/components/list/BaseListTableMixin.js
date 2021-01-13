/**
 * @vue/component
 */
export default {
    name: 'BaseListTableMixin',
    methods: {
        doesPropertyExist(obj, property) {
            if (!obj[property]) {
                return false;
            }

            if (Array.isArray(obj[property])) {
                return obj[property].length > 0;
            }

            if (typeof obj[property] == 'object') {
                return Object.keys(obj[property]).length > 0;
            }
        },
        td_classes(field) {
            return ['column', `column-${field.name}`, `column-format-${field.format}`];
        },
    },
};
