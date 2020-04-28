import { BaseFieldButton } from '../base';

/**
 * Button, that shows/hides crontab form.
 */
const FieldToggleCrontabButton = {
    mixins: [BaseFieldButton],
    data() {
        return {
            icon_classes: ['fa', 'fa-pencil'],
            event_handler: 'toggleCrontab',
            help_text: 'Crontab form',
        };
    },
};

export default FieldToggleCrontabButton;
