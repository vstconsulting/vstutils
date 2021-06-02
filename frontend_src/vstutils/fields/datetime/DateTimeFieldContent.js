/**
 * Mixin for date-time gui_field content(input value area).
 */
const DateTimeFieldContent = {
    data() {
        return {
            format: 'llll',
            inputType: 'datetime-local',
        };
    },
    computed: {
        preparedValue() {
            return this.value ? this.value.format(this.format) : this.value;
        },
    },
};

export default DateTimeFieldContent;
