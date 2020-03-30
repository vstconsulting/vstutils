/**
 * Mixin for gui_entity_action components.
 */
const ActionTypeMixin = {
    name: 'action_type_mixin',
    data() {
        let hideUnrequired = false;

        if (
            this.view.objects &&
            this.view.objects.model &&
            this.view.objects.model.fields &&
            Object.keys(this.view.objects.model.fields).length > 6
        ) {
            hideUnrequired = true;
        }

        return {
            options: {
                hideUnrequired: hideUnrequired,
            },
        };
    },
};

export default ActionTypeMixin;
