/**
 * Mixin for gui_entity_{page_new, action} components.
 */
const PageNewAndActionTypeMixin = {
    name: 'page_new_and_action_type_mixin',
    data() {
        return {
            options: {
                hideReadOnly: true,
                store: 'sandbox',
            },
        };
    },
};

export default PageNewAndActionTypeMixin;
