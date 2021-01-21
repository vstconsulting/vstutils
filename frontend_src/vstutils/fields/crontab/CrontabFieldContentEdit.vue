<template>
    <div>
        <div class="row">
            <div class="col-lg-12">
                <div class="input-group">
                    <input
                        type="text"
                        :class="classes"
                        :style="styles"
                        :required="attrs['required']"
                        :value="value"
                        :aria-labelledby="label_id"
                        :aria-label="aria_label"
                        @blur="updateValue($event.target.value)"
                    />

                    <field_toggle_crontab_button @click.native="toggleCrontab" />
                </div>
            </div>
        </div>

        <div
            v-show="show_crontab"
            id="guiElement-gui"
            class="row crontabEditor"
            style="margin-top: 15px; display: none"
        >
            <crontab_element
                v-for="(item, idx) in crontab_elements"
                :key="idx"
                :options="item"
                :model="model"
                @setModelValue="setModelValue($event)"
                @setCrontabElValue="setCrontabElValue($event)"
            />
        </div>
    </div>
</template>

<script>
    import { trim } from '../../utils';
    import CrontabFieldComponent from './CrontabFieldComponent.vue';
    import FieldToggleCrontabButton from './FieldToggleCrontabButton.js';

    /**
     * Mixin for editable crontab gui_field(input value area).
     */
    export default {
        components: {
            field_toggle_crontab_button: FieldToggleCrontabButton,
            crontab_element: CrontabFieldComponent,
        },
        data() {
            return {
                /**
                 * Property, that means show crontab form or not.
                 */
                show_crontab: false,
                /**
                 * Dict with propeties of crontab elements -
                 * single elements of crontab string.
                 */
                crontab_elements: {
                    Minutes: {
                        name: 'Minutes',
                        title: 'Minutes',
                        start: 0,
                        end: 59,
                        reg_str: '{0} $2 $3 $4 $5',
                        order: 0,
                        samples: [
                            { view: 'All', value: '*' },
                            { view: '*/2', value: '*/2' },
                            { view: '*/3', value: '*/3' },
                            { view: '*/5', value: '*/5' },
                            { view: '*/10', value: '*/10' },
                            { view: '*/15', value: '*/15' },
                            { view: '*/20', value: '*/20' },
                            { view: 'At the beginning', value: '0' },
                        ],
                    },
                    Hours: {
                        name: 'Hours',
                        title: 'Hours',
                        start: 0,
                        end: 23,
                        reg_str: '$1 {0} $3 $4 $5',
                        order: 1,
                        samples: [
                            { view: 'All', value: '*' },
                            { view: '*/2', value: '*/2' },
                            { view: '*/3', value: '*/3' },
                            { view: '*/4', value: '*/4' },
                            { view: '*/5', value: '*/5' },
                            { view: '*/6', value: '*/6' },
                            { view: '*/8', value: '*/8' },
                            { view: 'At the beginning', value: '0' },
                        ],
                    },
                    DayOfMonth: {
                        name: 'DayOfMonth',
                        title: 'Days of Month',
                        start: 1,
                        end: 31,
                        reg_str: '$1 $2 {0} $4 $5',
                        order: 2,
                        samples: [
                            { view: 'All', value: '*' },
                            { view: '*/2', value: '*/2' },
                            { view: '*/3', value: '*/3' },
                            { view: '*/4', value: '*/4' },
                            { view: '*/5', value: '*/5' },
                            { view: '*/7', value: '*/7' },
                            { view: 'At the beginning', value: '1' },
                        ],
                    },
                    Months: {
                        name: 'Months',
                        title: 'Months',
                        start: 1,
                        end: 12,
                        reg_str: '$1 $2 $3 {0} $5',
                        order: 3,
                        samples: [
                            { view: 'All', value: '*' },
                            { view: '*/2', value: '*/2' },
                            { view: '*/3', value: '*/3' },
                            { view: '*/4', value: '*/4' },
                            { view: '*/6', value: '*/6' },
                            { view: 'At the beginning', value: '1' },
                        ],
                        labels: [
                            '',
                            'January',
                            'February',
                            'March',
                            'April',
                            'May',
                            'June',
                            'July',
                            'August',
                            'September',
                            'October',
                            'November',
                            'December',
                        ],
                    },
                    DaysOfWeek: {
                        name: 'DaysOfWeek',
                        title: 'Days of Week',
                        start: 0,
                        end: 6,
                        reg_str: '$1 $2 $3 $4 {0}',
                        order: 4,
                        samples: [
                            { view: 'All', value: '*' },
                            { view: '*/2', value: '*/2' },
                            { view: '*/3', value: '*/3' },
                            { view: 'At the beginning', value: '1' },
                        ],
                        labels: [
                            'Sunday',
                            'Monday',
                            'Tuesday',
                            'Wednesday',
                            'Thursday',
                            'Friday',
                            'Saturday',
                            'Sunday',
                        ],
                    },
                },
                /**
                 * Property for working with field value before saving it to store.
                 */
                val: '* * * * *',
                /**
                 * Object for storing values of crontab elements' model items and
                 * crontab elements' strings.
                 */
                model: {},
            };
        },
        created() {
            // inits properties for models and strings of crontab elements.
            for (let val of Object.values(this.crontab_elements)) {
                this.model[val.name] = {};
                this.model[val.name + 'Str'] = '*';
            }
        },
        mounted() {
            this.val = this.value;
            this.parseCronString(this.val);
            this.calculateValue();
        },
        methods: {
            /**
             * Method, that shows/hides crontab form.
             */
            toggleCrontab() {
                this.show_crontab = !this.show_crontab;
            },

            /**
             * Method, that parse value of single crontab element from crontab string.
             * @param {array} resArr
             * @param {string} str
             * @param {number} minInt
             * @param {number} maxInt
             * @return {array}
             */
            parseItem(resArr, str, minInt, maxInt) {
                for (let i = minInt; i <= maxInt; i++) {
                    resArr[i] = false;
                }

                if (!str) {
                    str = '*';
                }

                let Parts = str.split(',');

                for (let i in Parts) {
                    if (/^\*$/.test(Parts[i])) {
                        if (minInt < maxInt) {
                            for (let j = minInt; j <= maxInt; j++) {
                                resArr[j] = false;
                            }
                        }
                    } else if (/^\*\/([0-9]+)$/.test(Parts[i])) {
                        let match = /^\*\/([0-9]+)$/.exec(Parts[i]);

                        if (minInt < maxInt && match[1] / 1 >= 1) {
                            for (let j = minInt; j <= maxInt; j += match[1] / 1) {
                                resArr[j] = true;
                            }
                        }
                    } else if (/^([0-9]+)-([0-9]+)$/.test(Parts[i])) {
                        let match = /^([0-9]+)-([0-9]+)$/.exec(Parts[i]);

                        if (match[1] / 1 > maxInt) {
                            match[1] = minInt;
                        }

                        if (match[2] / 1 > maxInt) {
                            match[2] = maxInt;
                        }

                        if (match[1] / 1 < match[2] / 1) {
                            for (let j = match[1] / 1; j <= match[2] / 1; j++) {
                                resArr[j] = true;
                            }
                        }
                    } else if (/^([0-9]+)$/.test(Parts[i])) {
                        if (Parts[i] / 1 <= maxInt && Parts[i] / 1 >= minInt) {
                            resArr[Parts[i] / 1] = true;
                        }
                    } else if (/^([0-9]+)\/([0-9]+)$/.test(Parts[i])) {
                        let match = /^([0-9]+)\/([0-9]+)$/.exec(Parts[i]);

                        if (match[1] / 1 > maxInt) {
                            match[1] = minInt;
                        }

                        if (match[1] / 1 < maxInt && match[2] / 1 >= 1) {
                            for (let j = match[1] / 1; j <= maxInt; j += match[2] / 1) {
                                resArr[j] = true;
                            }
                        }
                    } else if (/^([0-9]+)-([0-9]+)\/([0-9]+)$/.test(Parts[i])) {
                        let match = /^([0-9]+)-([0-9]+)\/([0-9]+)$/.exec(Parts[i]);

                        if (match[1] / 1 > maxInt) {
                            match[1] = minInt;
                        }

                        if (match[2] / 1 > maxInt) {
                            match[2] = maxInt;
                        }

                        if (match[1] / 1 < match[2] / 1 && match[3] / 1 >= 1) {
                            for (let j = match[1] / 1; j <= match[2] / 1; j += match[3] / 1) {
                                resArr[j] = true;
                            }
                        }
                    }
                }

                return resArr;
            },

            /**
             * Method, that parse crontab string.
             * @param {string} string
             */
            parseCronString(string) {
                if (string !== undefined) {
                    this.val = string;
                }

                string = trim(this.val).split(' ');

                if (string.length != 5 || /[A-z]/.test(this.val)) {
                    this.val = '* * * * *';
                    string = trim(this.val).split(' ');
                }

                for (let val of Object.values(this.crontab_elements)) {
                    this.model[val.name + 'Str'] = string[val.order];
                }

                for (let val of Object.values(this.crontab_elements)) {
                    this.parseItem(this.model[val.name], this.model[val.name + 'Str'], val.start, val.end);
                }
            },

            /**
             * Method, that calculates value of single crontab element from crontab string
             * based on model values.
             * @param {object} opt
             * @private
             */
            _calculateValue_handle(opt) {
                let arr = [];

                for (let i in this.model[opt.name]) {
                    if (this.model[opt.name][i]) {
                        arr.push(i / 1);
                    }
                }

                this.model[opt.name + 'Str'] = this.compileItem(arr, opt.start, opt.end);
            },
            /**
             * Method, that calculates value of crontab string based on model values.
             */
            calculateValue() {
                for (let val of Object.values(this.crontab_elements)) {
                    this._calculateValue_handle(val);
                }

                this.val =
                    this.model.MinutesStr +
                    ' ' +
                    this.model.HoursStr +
                    ' ' +
                    this.model.DayOfMonthStr +
                    ' ' +
                    this.model.MonthsStr +
                    ' ' +
                    this.model.DaysOfWeekStr;

                this.model = { ...this.model };
            },
            /**
             * Method, that sets new value of single element of crontab string.
             * @param {object} opt Object with props(name, value) of crontab element.
             */
            setCrontabElValue(opt = {}) {
                let el = this.crontab_elements[opt.name];

                if (!el) {
                    return;
                }

                this.val = this.value.replace(
                    /^([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+)/gim,
                    el.reg_str.format([opt.value]),
                );

                this.parseCalcAndSave(this.val);
            },
            /**
             * Method, that sets value of single property of crontab element's model.
             * @param {object} opt Object with props of crontab element.
             */
            setModelValue(opt) {
                if (this.model[opt.prop]) {
                    this.model[opt.prop][opt.number] = opt.value;
                }

                this.calculateValue();
                this.$emit('set-value', this.val);
            },
            /**
             * Method, that sets new value to crontab string.
             * @param {string} value New crontab string value.
             */
            updateValue(value) {
                this.val = value;
                this.parseCalcAndSave(this.val);
            },
            /**
             * Method, that parses crontab string, calculates models values
             * and saves new value of crontab string.
             * @param {string} value crontab string value.
             */
            parseCalcAndSave(value) {
                this.parseCronString(value);
                this.calculateValue();
                this.$emit('set-value', value);
            },
            /**
             * Method, that compiles value of single crontab element.
             * @param {array} resArr
             * @param {number} minInt
             * @param {number} maxInt
             * @return {string}
             */
            // TODO Move same code to function(may be) in lines 1045 and 1065
            compileItem(resArr, minInt, maxInt) {
                let itemResults = [];
                itemResults.push(resArr.join(','));
                if (!resArr || !resArr.length || resArr.length == maxInt - minInt + 1) {
                    return '*';
                }

                if (resArr.length) {
                    let division = [];

                    for (let j = 2; j < maxInt / 2; j++) {
                        let isInner = false;

                        for (let k in division) {
                            if (j % division[k] == 0) {
                                isInner = true;
                            }
                        }

                        if (isInner) {
                            continue;
                        }

                        let isOk = true;

                        for (let i = minInt; i < maxInt; i += j) {
                            if (resArr.indexOf(i) == -1) {
                                isOk = false;
                                break;
                            }
                        }

                        if (isOk) {
                            division.push(j);
                        }
                    }

                    let exclude = [];
                    let includeParts = [];

                    for (let i = 0; i < division.length; i++) {
                        for (let j = minInt; j < maxInt; j += division[i]) {
                            exclude.push(j);
                        }
                        includeParts.push('*/' + division[i]);
                    }

                    let lastVal = -1;
                    let range = [];

                    for (let i = 0; i < resArr.length; i++) {
                        if (exclude.indexOf(resArr[i]) != -1) {
                            continue;
                        }

                        if (lastVal + 1 == resArr[i]) {
                            range.push(resArr[i]);
                        } else {
                            if (range.length > 2) {
                                includeParts.push(range[0] + '-' + range[range.length - 1]);
                            } else if (range.length) {
                                for (let l = 0; l < range.length; l++) {
                                    includeParts.push(range[l]);
                                }
                            }
                            range = [resArr[i]];
                        }

                        lastVal = resArr[i];
                    }

                    if (range.length > 2) {
                        includeParts.push(range[0] + '-' + range[range.length - 1]);
                    } else if (range.length) {
                        for (let l = 0; l < range.length; l++) {
                            includeParts.push(range[l]);
                        }
                    }

                    itemResults.push(includeParts.join(','));
                }

                if (resArr.length) {
                    let lastVal = -1;
                    let includeParts = [];
                    let range = [];

                    for (let i = 0; i < resArr.length; i++) {
                        if (lastVal + 1 == resArr[i]) {
                            range.push(resArr[i]);
                        } else {
                            if (range.length > 2) {
                                includeParts.push(range[0] + '-' + range[range.length - 1]);
                            } else if (range.length) {
                                for (let l = 0; l < range.length; l++) {
                                    includeParts.push(range[l]);
                                }
                            }

                            range = [resArr[i]];
                        }

                        lastVal = resArr[i];
                    }

                    if (range.length > 2) {
                        includeParts.push(range[0] + '-' + range[range.length - 1]);
                    } else if (range.length) {
                        for (let l = 0; l < range.length; l++) {
                            includeParts.push(range[l]);
                        }
                    }

                    itemResults.push(includeParts.join(','));
                }

                let minLength = 99999;
                let minLengthResult = '';

                for (let i in itemResults) {
                    if (itemResults[i].length < minLength) {
                        minLength = itemResults[i].length;
                        minLengthResult = itemResults[i];
                    }
                }

                return minLengthResult;
            },
        },
    };
</script>

<style scoped></style>
