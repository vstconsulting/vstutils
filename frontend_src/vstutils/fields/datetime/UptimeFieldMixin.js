import $ from 'jquery';
import IMask from 'imask';
import UptimeFieldContentEdit from './UptimeFieldContentEdit.vue';

const UptimeFieldMixin = {
    components: {
        field_content_edit: UptimeFieldContentEdit,
    },
    data() {
        return {
            /**
             * Object for storing settings, need for methods, that change field value.
             */
            uptimeSettings: {
                timeout: 100,
                iteration: 1,
                mouseDown: false,
            },
            /**
             * Object with masks for uptime field.
             */
            maskObj: {
                mask: [
                    {
                        mask: 'HH:mm:SS',
                        blocks: {
                            HH: {
                                mask: IMask.MaskedRange,
                                from: 0,
                                to: 23,
                            },
                            mm: {
                                mask: IMask.MaskedRange,
                                from: 0,
                                to: 59,
                            },
                            SS: {
                                mask: IMask.MaskedRange,
                                from: 0,
                                to: 59,
                            },
                        },
                    },
                    {
                        mask: 'DAYd HH:mm:SS',
                        blocks: {
                            DAY: {
                                mask: IMask.MaskedRange,
                                from: 0,
                                to: 31,
                            },
                            HH: {
                                mask: IMask.MaskedRange,
                                from: 0,
                                to: 23,
                            },
                            mm: {
                                mask: IMask.MaskedRange,
                                from: 0,
                                to: 59,
                            },
                            SS: {
                                mask: IMask.MaskedRange,
                                from: 0,
                                to: 59,
                            },
                        },
                    },
                    {
                        mask: 'MONTHm DAYd HH:mm:SS',
                        blocks: {
                            MONTH: {
                                mask: IMask.MaskedRange,
                                from: 0,
                                to: 12,
                            },
                            DAY: {
                                mask: IMask.MaskedRange,
                                from: 0,
                                to: 31,
                            },
                            HH: {
                                mask: IMask.MaskedRange,
                                from: 0,
                                to: 23,
                            },
                            mm: {
                                mask: IMask.MaskedRange,
                                from: 0,
                                to: 59,
                            },
                            SS: {
                                mask: IMask.MaskedRange,
                                from: 0,
                                to: 59,
                            },
                        },
                    },
                    {
                        mask: 'YEARy MONTHm DAYd HH:mm:SS',
                        blocks: {
                            YEAR: {
                                mask: IMask.MaskedRange,
                                from: 0,
                                to: 99,
                            },
                            MONTH: {
                                mask: IMask.MaskedRange,
                                from: 0,
                                to: 12,
                            },
                            DAY: {
                                mask: IMask.MaskedRange,
                                from: 0,
                                to: 31,
                            },
                            HH: {
                                mask: IMask.MaskedRange,
                                from: 0,
                                to: 23,
                            },
                            mm: {
                                mask: IMask.MaskedRange,
                                from: 0,
                                to: 59,
                            },
                            SS: {
                                mask: IMask.MaskedRange,
                                from: 0,
                                to: 59,
                            },
                        },
                    },
                ],
            },
        };
    },
    mounted() {
        if (!this.field.options.readOnly) {
            let element = $(this.$el).find('input.uptime-input');

            if (element[0]) {
                // adds mask to uptime field's input
                this.IMask = new IMask(element[0], this.maskObj);
            }
        }
    },
    methods: {
        /**
         * Method, that returns uptime field value in seconds.
         */
        value_in_seconds() {
            let data = $.extend(true, {}, this.data);

            data[this.field.options.name] = this.value;

            return this.field.toInner(data);
        },
        /**
         * Method, that increases field value on increment amount.
         * @param {number} increment Number, on which field value should be increased.
         */
        valueUp(increment) {
            let value = this.value_in_seconds();
            let new_value = value + increment;

            if (new_value >= 3155759999) {
                new_value = 0;
            }

            let data = $.extend(true, {}, this.data);
            data[this.field.options.name] = new_value;

            this.setValueInStore(this.field.toRepresent(data));
        },
        /**
         * Method, that decreases field value on increment amount.
         * @param {number} decrement Number, on which field value should be decreased.
         */
        valueDown(decrement) {
            let value = this.value_in_seconds();
            let new_value = value - decrement;

            if (new_value < 0) {
                new_value = 0;
            }

            let data = $.extend(true, {}, this.data);
            data[this.field.options.name] = new_value;

            this.setValueInStore(this.field.toRepresent(data));
        },
        /**
         * Method, that gets increment size and calls valueUp method.
         */
        doIncrease() {
            if (this.uptimeSettings.mouseDown) {
                let increment = this.getIncrement(this.uptimeSettings.iteration);
                this.valueUp(increment);
                this.uptimeSettings.iteration++;
                setTimeout(this.doIncrease, this.uptimeSettings.timeout);
            }
        },
        /**
         * Method, that gets decrement size and calls valueUp method.
         */
        doDecrease() {
            if (this.uptimeSettings.mouseDown) {
                let decrement = this.getIncrement(this.uptimeSettings.iteration);
                this.valueDown(decrement);
                this.uptimeSettings.iteration++;
                setTimeout(this.doDecrease, this.uptimeSettings.timeout);
            }
        },
        /**
         * Method, that calculates increment/decrement size.
         * @param {number} iteration Number of increase/decrease iteration.
         */
        getIncrement(iteration) {
            let increement = 1;

            if (iteration >= 20) {
                increement = 10;
            }

            if (iteration >= 30) {
                increement = 100;
            }

            if (iteration >= 40) {
                increement = 1000;
            }

            return increement;
        },
        /**
         * Method, that resets uptimeSettings settings.
         */
        resetIncrement() {
            this.uptimeSettings.mouseDown = false;
            this.uptimeSettings.iteration = 1;
        },
        /**
         * Method, that inits field value increase.
         */
        callDoIncrease() {
            this.uptimeSettings.mouseDown = true;
            setTimeout(this.doIncrease, this.uptimeSettings.timeout);
        },
        /**
         * Method, that inits field value decrease.
         */
        callDoDecrease() {
            this.uptimeSettings.mouseDown = true;
            setTimeout(this.doDecrease, this.uptimeSettings.timeout);
        },
    },
};

export default UptimeFieldMixin;
