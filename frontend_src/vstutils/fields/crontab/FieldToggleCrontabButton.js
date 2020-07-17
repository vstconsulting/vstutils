import { BaseFieldButton } from '../base';

/**
 * Button, that shows/hides crontab form.
 */
const FieldToggleCrontabButton = {
    mixins: [BaseFieldButton],
    data() {
        return {
            icon_classes: ['fas', 'fa-pencil-alt'],
            event_handler: 'toggleCrontab',
            help_text: 'Crontab form',
        };
    },
};

export default FieldToggleCrontabButton;
