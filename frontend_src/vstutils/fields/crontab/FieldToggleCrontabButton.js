import { BaseFieldButton } from '../buttons';

/**
 * Button, that shows/hides crontab form.
 */
const FieldToggleCrontabButton = {
    mixins: [BaseFieldButton],
    data() {
        return {
            iconClasses: ['fas', 'fa-pencil-alt'],
            helpText: 'Crontab form',
        };
    },
};

export default FieldToggleCrontabButton;
