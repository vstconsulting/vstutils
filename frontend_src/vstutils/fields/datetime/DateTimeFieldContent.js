/**
 * Mixin for date-time gui_field content(input value area).
 */
const DateTimeFieldContent = {
    data() {
        return {
            inputType: 'datetime-local',
        };
    },
    computed: {
        preparedValue() {
            return this.value ? this.value.format(this.format) : '';
        },
        format() {
            return this.field?.dateRepresentFormat || 'llll';
        },
    },
};

export default DateTimeFieldContent;
