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
            const value = this.value;
            if (!value) {
                return '';
            }
            if (this.format) {
                return value.format(this.format);
            }
            const formatter = Intl.DateTimeFormat(this.$i18n.locale, {
                dateStyle: 'medium',
                timeStyle: 'medium',
            });
            return formatter.format(value.toDate());
        },
        format() {
            return this.field?.dateRepresentFormat;
        },
    },
};

export default DateTimeFieldContent;
