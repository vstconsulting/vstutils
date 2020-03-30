import { BaseButtonMixin } from '../../mixins';

/**
 * Component for independent button:
 * - It can be link button(it has 'path' property in it's 'options'),
 *   that do redirect to another view.
 * - It can be just button(it has no 'path' property in it's 'options'),
 *   that calls some method of root component.
 */

const ButtonCommon = {
    name: 'gui_button_common',
    mixins: [BaseButtonMixin],
    computed: {
        classes() {
            let classes = this.getRepresentationProperty('classes');

            if (!classes) {
                classes = [];
            }

            if (Array.isArray(classes)) {
                classes.push(this.class_with_name);
            } else if (typeof classes == 'string') {
                classes = [classes, this.class_with_name];
            }

            return classes;
        },
    },
};

export default ButtonCommon;
