/**
 * Mixin for field buttons (cleanValue, defaultValue, hideField).
 * Mixin - extension for several Vue components with common data/methods/props/template and so on.
 */
const base_field_button_mixin = {
    props: ['field'],
    template: "#template_field_part_button_base",
    data() {
        return {
            wrapper_classes: ['input-group-append'],
            wrapper_styles: {},
            span_classes: ['input-group-text'],
            span_styles: {'cursor': 'pointer'},
            icon_classes: ['fa', 'fa-times'],
            icon_styles: {},
            help_text: 'Clean value',
            event_handler: 'cleanValue',
        };
    },
    methods: {
        eventHandler(e) {
            this.$emit(this.event_handler, e);
        }
    },
};

/**
 * Mixin for file field buttons (cleanValue, readFile, hideField).
 */
const file_field_button_mixin = {
    data() {
        return {
            wrapper_classes: [],
            wrapper_styles: {},
            span_classes: ['btn', 'btn-default', 'btn-right', 'textfile'],
            span_styles: {'float': 'right', 'marginLeft': '10px',  'marginBottom': '10px'},
            icon_styles: {},
        };
    },
};

/**
 * Mixin for gui_fields' content(input value area).
 */
const base_field_content_mixin = {
    data() {
        return {
            /**
             * Type of field's input element (if it exists).
             */
            input_type: 'text',
            /**
             * Names of additional attributes of field's input element.
             */
            attrs_names: {
                // readOnly: ['readonly', 'disabled'],
                minLength: ['minlength'],
                maxLength: ['maxlength'],
                min: ['min'],
                max: ['max'],
                required: ['required'],
            },
            /**
             * Default values of field's input attributes.
             */
            default_field_attrs: {},
        };
    },
    computed: {
        /**
         * Property, that returns array with properties,
         * which store values of additional attributes.
         */
        props_with_attrs() {
            return [this.default_field_attrs, this.field.options];
        },
        /**
         * Property, that returns object with values of additional attributes.
         */
        attrs() {
            let attrs = {};

            this.props_with_attrs.forEach(prop => {
                attrs = $.extend(true, attrs, this.getAttrsFromProp(prop));
            });

            return attrs;
        },
        /**
         * Property, that returns value of 'aria-label' attribute.
         */
        aria_label() {
            return this.field.options.title || this.field.options.name + 'field';
        },
    },
    methods: {
        /**
         * Method, that forms additional attributes objects based on prop's value.
         * @param {object} prop Object with values of additional attributes.
         */
        getAttrsFromProp(prop) {
            let attrs = {};

            for(let key in this.attrs_names) {
                if(this.attrs_names.hasOwnProperty(key)) {
                    if (prop[key] === undefined) {
                        continue;
                    }

                    this.attrs_names[key].forEach(attr => {attrs[attr] = prop[key];});
                }
            }

            return attrs;
        },
    },
};

/**
 * Mixin for some inner component of gui_field.
 */
const base_field_inner_component_mixin = {
    props: ['field', 'wrapper_opt', 'value', 'data'],
    data() {
        return {
            /**
             * Array with CSS class names, that should be added to the component.
             */
            class_list: [],
            /**
             * Dict with CSS style properties (key, value), that should be added to the component.
             */
            styles_dict: {},
        };
    },
    computed: {
        /**
         * Property, that returns string with component's CSS class names.
         */
        classes() {
            return this.class_list.join(" ");
        },
        /**
         * Property, that returns dict with CSS style properties.
         */
        styles() {
            return this.styles_dict;
        },
    },
};

/**
 * Mixin, that contains 'label_id' computed property - value of 'id' attribute of field's label.
 */
const field_label_id_mixin = {
    props: ['field', 'wrapper_opt', 'value', 'data'],
    computed: {
        label_id() {
            let w = this.wrapper_opt.use_prop_data ? '-inner' : "";
            return 'label-for-' + this.field.options.name + '-field' + w;
        }
    },
};

/**
 * Mixin for gui_field label component.
 */
const base_field_label_mixin = {
    mixins: [base_field_inner_component_mixin, field_label_id_mixin],
    template: "#template_field_part_label",
    data() {
        return {
            class_list: ['control-label'],
        };
    },
};

/**
 * Mixin for readOnly gui_fields' content(input value area).
 */
const base_field_content_readonly_mixin = {
    mixins: [base_field_content_mixin, base_field_inner_component_mixin, field_label_id_mixin],
    template: "#template_field_content_readonly_base",
    data() {
        return {
            class_list: ['form-control'],
        };
    },
};

/**
 * Mixin for editable gui_fields' content(input value area).
 */
const base_field_content_edit_mixin = {
    mixins: [base_field_content_mixin, base_field_inner_component_mixin, field_label_id_mixin],
    template: "#template_field_content_edit_base",
    data() {
        return {
            class_list: ['form-control'],
        };
    },
    computed: {
        /**
         * Property, that returns true, if this field can be hidden.
         * @return {boolean}
         */
        with_hidden_button() {
            let opt = $.extend(true, {}, this.field.options, this.wrapper_opt);

            return opt.hidden_button && !opt.required;
        },
        /**
         * Property, that returns true, if this field has default value.
         * @return {boolean}
         */
        with_default_value() {
            let opt = $.extend(true, {}, this.field.options, this.wrapper_opt);

            return opt.default !== undefined;
        },
    },
    components: {
        /**
         * Component for 'clean value' button.
         */
        field_clear_button: {
            mixins: [base_field_button_mixin],
        },
        /**
         * Component for 'hide field' button.
         */
        field_hidden_button: {
            mixins: [base_field_button_mixin],
            data() {
                return {
                    icon_classes: ['fa', 'fa-minus'],
                    event_handler: 'hideField',
                    help_text: 'Hide field',
                };
            },
        },
        /**
         * Component for 'set default value' button.
         */
        field_default_value_button: {
            mixins: [base_field_button_mixin],
            data() {
                return {
                    icon_classes: ['fa', 'fa-repeat'],
                    event_handler: 'valueToDefault',
                    help_text: 'Set default value',
                };
            },
        },
    }
};

/**
 * Mixin for gui_field description component.
 */
const base_field_description_mixin = {
    mixins: [base_field_inner_component_mixin],
    template: "#template_field_part_description",
    data() {
        return {
            class_list: ['help-block'],
        };
    },
};

/**
 * Mixin for gui_field list_view component.
 */
const base_field_list_view_mixin ={
    mixins: [base_field_inner_component_mixin],
    template: "#template_field_part_list_view",
    data() {
        return {
            styles_dict: {display: 'contents'},
        };
    },
};

/**
 * Mixin for integer field content.
 */
const integer_field_content_mixin = {
    data() {
        return {
            input_type: 'number',
        };
    },
};

/**
 * Mixin for boolean gui_field content(input value area).
 */
const boolean_field_content_mixin = {
    data() {
        return {
            class_list: ["form-control", "boolean-select"],
        };
    },
    computed: {
        selected: function(){
            return this.value ? 'selected' : '';
        },

        classes() {
            return [].concat(this.class_list, this.selected).join(" ");
        },
    },
};

/**
 * Mixin for readOnly choices field content(input value area).
 */
const choices_field_content_readonly_mixin = {
    mixins: [base_field_content_readonly_mixin],
    template: "#template_field_content_readonly_choices",
    computed: {
        choices_classes() {
            return addCssClassesToElement('field', this.value, this.field.options.name);
        },
        classes() {
            return [].concat(this.class_list, this.choices_classes).join(" ");
        },
    },
};

/**
 * Mixin for editable autocomplete field content(input value area).
 */
const autocomplete_field_content_edit_mixin = {
    template: "#template_field_content_edit_autocomplete",
    data() {
        return {
            /**
             * Property, that stores DOM element with mounted autocomplete.
             */
            ac: undefined,
            class_list: ["form-control", "autocomplete-field-input"],
        };
    },
    mounted() {
        this.ac = $(this.$el).find('.autocomplete-field-input')[0];
        this.initAutoComplete();
    },
    computed: {
        /**
         * Property, that returns value to represent.
         */
        val() {
            return this.value;
        },
    },
    methods: {
        /**
         * Method, that mounts autocomplete to current field's input.
         */
        initAutoComplete() {
            return new autoComplete({ /* globals autoComplete */
                selector: this.ac,
                minChars: 0,
                delay:350,
                cache:false,
                showByClick:true,
                renderItem: (item, search) => {
                    return this._renderItem(item, search);
                },
                onSelect: (event, term, item) =>  {
                    return this._onSelect(event, term, item);

                },
                source: (search_input, response) =>  {
                    return this._source(search_input, response);
                }
            });
        },
        /**
         * Method callback for autoComplete.renderItem() method.
         * @param {string} item.
         * @param {string} search.
         * @private
         */
        _renderItem(item, search) { /* jshint unused: false */
            return '<div class="autocomplete-suggestion"' +
                ' data-value="' + item + '" >' + item + '</div>';
        },
        /**
         * Method callback for autoComplete.onSelect() method.
         * @param {object} event OnSelect event.
         * @param {object} term.
         * @param {object} item DOM element of selected option.
         * @private
         */
        _onSelect(event, term, item) { /* jshint unused: false */
            let value = this._getAutocompleteValue(item);

            this.$emit('proxyEvent', 'setValueInStore', value);

            $(this.ac).attr({'data-hide':'hide'});
        },
        /**
         * Method returns value of selected autocomplete item.
         * @param {object} item DOM element - autocomplete item.
         * @private
         */
        _getAutocompleteValue(item) {
            return $(item).attr('data-value');
        },
        /**
         * Method callback for autoComplete.source() method.
         * @param {string} search_input Search string value.
         * @param {function} response Response callback.
         * @private
         */
        _source(search_input, response) {
            if(this._autocompleteIsHidden()) {
                return;
            }

            this._filterAutocompleteData(trim(search_input), response);
        },
        /**
         * Method returns value of 'data-hide' attribute of autocomplete DOM element.
         * @returns {boolean}
         * @private
         */
        _autocompleteIsHidden() {
            let isHidden = $(this.ac).attr('data-hide');

            if(isHidden == "hide")  {
                $(this.ac).attr({'data-hide':'show'});
                return true;
            }

            return false;
        },
        /**
         * Method filters autocomplete data and returns it in response callback.
         * @param {string} search_input Search string value.
         * @param {function} response Response callback.
         * @private
         */
        _filterAutocompleteData(search_input, response) {
            let list = [];

            let choices = this.field.options.enum || [];

            if(this.field.options.default && !choices.includes(this.field.options.default)) {
                list.push(this.field.options.default);
            }

            list = list.concat(choices);

            let match = list.filter(item => item.indexOf(search_input) != -1);

            response(match);
        },
        /**
         * Method, that saves in store value, typed by user.
         * @param {string} value
         */
        setValueByHandsInStore(value) {
            this.$emit('proxyEvent', 'setValueInStore', value);
        },
    },
};

/**
 * Mixin for password gui_field content(input value area).
 */
const password_field_content_mixin = {
    data() {
        return {
            input_type: 'password',
        };
    },
};

/**
 * Mixin for date gui_field content(input value area).
 */
const date_field_content_mixin = {
    data() {
        return {
            input_type: 'date',
        };
    },
};

/**
 * Mixin for date_time gui_field content(input value area).
 */
const date_time_field_content_mixin = {
    data() {
        return {
            input_type: 'datetime-local',
        };
    },
};

/**
 * Mixin for color gui_field content(input value area).
 */
const color_field_content_mixin = {
    data() {
        return {
            input_type: 'color',
        };
    },
};

/**
 * Mixin for editable crontab gui_field(input value area).
 */
const crontab_field_content_edit_mixin = {
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
                        {view: "All", value: "*"},
                        {view: "*/2", value: "*/2"},
                        {view: "*/3", value: "*/3"},
                        {view: "*/5", value: "*/5"},
                        {view: "*/10", value: "*/10"},
                        {view: "*/15", value: "*/15"},
                        {view: "*/20", value: "*/20"},
                        {view: "At the beginning", value: "0"},
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
                        {view: "All", value: "*"},
                        {view: "*/2", value: "*/2"},
                        {view: "*/3", value: "*/3"},
                        {view: "*/4", value: "*/4"},
                        {view: "*/5", value: "*/5"},
                        {view: "*/6", value: "*/6"},
                        {view: "*/8", value: "*/8"},
                        {view: "At the beginning", value: "0"},
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
                        {view: "All", value: "*"},
                        {view: "*/2", value: "*/2"},
                        {view: "*/3", value: "*/3"},
                        {view: "*/4", value: "*/4"},
                        {view: "*/5", value: "*/5"},
                        {view: "*/7", value: "*/7"},
                        {view: "At the beginning", value: "1"},
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
                        {view: "All", value: "*"},
                        {view: "*/2", value: "*/2"},
                        {view: "*/3", value: "*/3"},
                        {view: "*/4", value: "*/4"},
                        {view: "*/6", value: "*/6"},
                        {view: "At the beginning", value: "1"},
                    ],
                    labels: [
                        '', 'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'
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
                        {view: "All", value: "*"},
                        {view: "*/2", value: "*/2"},
                        {view: "*/3", value: "*/3"},
                        {view: "At the beginning", value: "1"},
                    ],
                    labels: [
                        'Sunday', 'Monday', 'Tuesday', 'Wednesday',
                        'Thursday', 'Friday', 'Saturday', 'Sunday'
                    ],
                },
            },
            /**
             * Property for working with field value before saving it to store.
             */
            val: "* * * * *",
            /**
             * Object for storing values of crontab elements' model items and
             * crontab elements' strings.
             */
            model: {},
        };
    },
    template: "#template_field_content_edit_crontab",
    components: {
        /**
         * Button, that shows/hides crontab form.
         */
        field_toggle_crontab_button: {
            mixins: [base_field_button_mixin],
            data() {
                return {
                    icon_classes: ['fa', 'fa-pencil'],
                    event_handler: 'toggleCrontab',
                    help_text: 'Crontab form',
                };
            },
        },
        /**
         * Vue component for crontab element.
         */
        crontab_element: {
            props: ['options', 'model'],
            template: "#template_field_crontab_form_element",
            computed: {
                /**
                 * Property, that forms values array for template.
                 * @return {Array}
                 */
                values() {
                    let arr = [];

                    for(let i = this.options.start; i <= this.options.end; i++ ) {
                        let obj = {
                            number: i,
                            selected: this.model[this.options.name][i],
                        };
                        arr.push(obj);
                    }

                    return arr;
                },

                styles() {
                    if(this.options.labels) {
                        return "width: 50%;";
                    }

                    return 'width: calc(20% - 4px);';
                }
            },
            methods: {
                /**
                 * Method, that emits calling of parent's method.
                 * @param {string} method
                 * @param {object} value
                 */
                proxyCrontabEvent(method, value) {
                    this.$emit(method, value);
                },
                /**
                 * Method, that returns CSS class ofcrontab element model' item
                 * based on it 'selected property.
                 * @param element
                 * @return {string}
                 */
                is_selected(element) {
                    if(element.selected) {
                        return 'selected';
                    }

                    return "";
                },
                /**
                 * Method, that toggle value of model item.
                 * @param {string} prop
                 * @param {number} number
                 */
                toggleModelValue(prop, number) {
                    let value = false;

                    if(this.model[prop] && this.model[prop][number]) {
                        value = this.model[prop][number];
                    }

                    this.proxyCrontabEvent('setModelValue', {
                        prop: prop,
                        number: number,
                        value: !value,
                    });
                },
                /**
                 * Method, that returns model item label.
                 */
                getLabel(options, el) {
                    if(options.labels && options.labels[el.number]) {
                        return options.labels[el.number];
                    }

                    return el.number;
                }
            },

        },
    },
    created() {
        // inits properties for models and strings of crontab elements.
        for(let key in this.crontab_elements) {
            if(this.crontab_elements.hasOwnProperty(key)) {
                let el = this.crontab_elements[key];

                this.model[el.name] = {};
                this.model[el.name + "Str"] = "*";
            }
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
            for(let i = minInt; i < maxInt; i++) {
                resArr[i] = false;
            }

            for(let i =0; i < resArr.length; i++) {
                resArr[i] = false;
            }

            if(!str) {
                str = "*";
            }

            let Parts = str.split(",");

            for(let i in Parts) {
                if(/^\*$/.test(Parts[i])) {
                    if(minInt < maxInt) {
                        for(let j = minInt; j <= maxInt; j++) {
                            resArr[j] = true;
                        }
                    }
                } else if(/^\*\/([0-9]+)$/.test(Parts[i])) {
                    let match = /^\*\/([0-9]+)$/.exec(Parts[i]);

                    if(minInt < maxInt && match[1]/1 >= 1) {
                        for(let j = minInt; j <= maxInt; j+= match[1]/1) {
                            resArr[j] = true;
                        }
                    }
                } else if(/^([0-9]+)-([0-9]+)$/.test(Parts[i])) {
                    let match = /^([0-9]+)-([0-9]+)$/.exec(Parts[i]);

                    if(match[1]/1 > maxInt) {
                        match[1] = minInt;
                    }

                    if(match[2]/1 > maxInt) {
                        match[2] = maxInt;
                    }

                    if(match[1]/1 < match[2]/1) {
                        for(let j = match[1]/1; j <= match[2]/1; j++) {
                            resArr[j] = true;
                        }
                    }
                } else if(/^([0-9]+)$/.test(Parts[i])) {
                    if(Parts[i]/1 <= maxInt && Parts[i]/1 >= minInt) {
                        resArr[Parts[i]/1] = true;
                    }
                } else if(/^([0-9]+)\/([0-9]+)$/.test(Parts[i])) {
                    let match = /^([0-9]+)\/([0-9]+)$/.exec(Parts[i]);

                    if(match[1]/1 > maxInt) {
                        match[1] = minInt;
                    }

                    if(match[1]/1 < maxInt && match[2]/1 >= 1) {
                        for(let j = match[1]/1; j <= maxInt; j+=match[2]/1) {
                            resArr[j] = true;
                        }
                    }
                }
                else if(/^([0-9]+)-([0-9]+)\/([0-9]+)$/.test(Parts[i])) {
                    let match = /^([0-9]+)-([0-9]+)\/([0-9]+)$/.exec(Parts[i]);

                    if(match[1]/1 > maxInt) {
                        match[1] = minInt;
                    }

                    if(match[2]/1 > maxInt) {
                        match[2] = maxInt;
                    }

                    if(match[1]/1 < match[2]/1 && match[3]/1 >= 1) {
                        for(let j = match[1]/1; j <= match[2]/1; j+=match[3]/1) {
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
            if(string !== undefined) {
                this.val = string;
            }

            string = trim(this.val).split(" ");

            if(string.length != 5 || /[A-z]/.test(this.val)) {
                this.val = "* * * * *";
                string = trim(this.val).split(" ");
            }

            for(let key in this.crontab_elements) {
                if(this.crontab_elements.hasOwnProperty(key)) {
                    let el = this.crontab_elements[key];

                    this.model[el.name + "Str"] = string[el.order];
                }
            }

            for(let key in this.crontab_elements) {
                if(this.crontab_elements.hasOwnProperty(key)) {
                    let el = this.crontab_elements[key];

                    this.parseItem(
                        this.model[el.name], this.model[el.name + "Str"], el.start, el.end,
                    );
                }
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

            for(let i in this.model[opt.name]) {
                if(this.model[opt.name][i]) {
                    arr.push(i/1);
                }
            }

            this.model[opt.name + 'Str'] = this.compileItem(arr, opt.start, opt.end);
        },
        /**
         * Method, that calculates value of crontab string based on model values.
         */
        calculateValue() {
            for(let key in this.crontab_elements) {
                if(this.crontab_elements.hasOwnProperty(key)) {
                    this._calculateValue_handle(this.crontab_elements[key]);
                }
            }

            this.val =  this.model.MinutesStr +
                " " + this.model.HoursStr +
                " " + this.model.DayOfMonthStr +
                " " + this.model.MonthsStr +
                " " + this.model.DaysOfWeekStr;

            this.model = { ...this.model};
        },
        /**
         * Method, that sets new value of single element of crontab string.
         * @param {object} opt Object with props(name, value) of crontab element.
         */
        setCrontabElValue(opt={}) {
            let el = this.crontab_elements[opt.name];

            if(!el) {
                return;
            }

            this.val = this.value.replace(
                /^([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+)/img,
                el.reg_str.format([opt.value]),
            );

            this.parseCalcAndSave(this.val);
        },
        /**
         * Method, that sets value of single property of crontab element's model.
         * @param {object} opt Object with props of crontab element.
         */
        setModelValue(opt) {
            if(this.model[opt.prop]) {
                this.model[opt.prop][opt.number] = opt.value;
            }

            this.calculateValue();
            this.$emit('proxyEvent', 'setValueInStore', this.val);

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
            this.$emit('proxyEvent', 'setValueInStore', value);
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
            itemResults.push(resArr.join(","));
            if(!resArr || !resArr.length || resArr.length == maxInt - minInt + 1) {
                return "*";
            }

            if(resArr.length) {
                let division = [];

                for(let j=2; j<maxInt/2; j++) {
                    let isInner = false;

                    for(let k in division) {
                        if(j % division[k] == 0) {
                            isInner = true;
                        }
                    }

                    if(isInner) {
                        continue;
                    }

                    let isOk = true;

                    for(let i=minInt; i<maxInt; i+=j) {
                        if(resArr.indexOf(i) == -1) {
                            isOk = false;
                            break;
                        }
                    }

                    if(isOk) {
                        division.push(j);
                    }
                }

                let exclude = [];
                let includeParts = [];

                for(let i = 0; i < division.length; i++) {
                    for(let j=minInt; j<maxInt; j+=division[i]) {
                        exclude.push(j);
                    }
                    includeParts.push("*/"+division[i]);
                }

                let lastVal = -1;
                let range = [];

                for(let i = 0; i < resArr.length; i++) {
                    if(exclude.indexOf(resArr[i]) != -1) {
                        continue;
                    }

                    if(lastVal + 1 == resArr[i] ) {
                        range.push(resArr[i]);
                    } else {
                        if(range.length > 2) {
                            includeParts.push(range[0] + "-" + range[range.length-1]);
                        } else if(range.length) {
                            for(let l = 0; l < range.length; l++) {
                                includeParts.push(range[l]);
                            }
                        }
                        range = [resArr[i]];
                    }

                    lastVal = resArr[i];
                }

                if(range.length > 2) {
                    includeParts.push(range[0] + "-" + range[range.length-1]);
                } else if(range.length) {
                    for(let l = 0; l < range.length; l++) {
                        includeParts.push(range[l]);
                    }
                }

                itemResults.push(includeParts.join(","));
            }

            if(resArr.length) {
                let lastVal = -1;
                let includeParts = [];
                let range = [];

                for(let i = 0; i < resArr.length; i++) {
                    if(lastVal + 1 == resArr[i]) {
                        range.push(resArr[i]);
                    } else {
                        if(range.length > 2) {
                            includeParts.push(range[0] + "-" + range[range.length-1]);
                        } else if(range.length) {
                            for(let l = 0; l < range.length; l++) {
                                includeParts.push(range[l]);
                            }
                        }

                        range = [resArr[i]];
                    }

                    lastVal = resArr[i];
                }

                if(range.length > 2) {
                    includeParts.push(range[0] + "-" + range[range.length-1]);
                } else if(range.length) {
                    for(let l = 0; l < range.length; l++) {
                        includeParts.push(range[l]);
                    }
                }

                itemResults.push(includeParts.join(","));
            }

            let minLength = 99999;
            let minLengthResult = "";

            for(let i in itemResults) {
                if(itemResults[i].length < minLength ) {
                    minLength = itemResults[i].length;
                    minLengthResult = itemResults[i];
                }
            }

            return minLengthResult;
        }
    },
};

/**
 * Mixin for read only json gui_field.
 */
const json_field_content_read_only_mixin = {
    template: "#template_field_content_readonly_json",
    computed: {
        realFields() {
            return this.field.generateRealFields(this.value);
        },
    },
};

/**
 * Mixin for content components of api_object field.
 */
const field_content_api_object_mixin = {
    mixins: [base_field_content_readonly_mixin],
    template: "#template_field_content_readonly_api_object",
    data() {
        return {
            /**
             * QuerySet of instance.
             */
            queryset: undefined,
            /**
             * Instance to which this field in linked.
             */
            instance: undefined,
            class_list: ["form-control", "revers-color"],
        };
    },
    watch: {
        'value': function(value) {
            if(value && this.queryset) {
                this.instance = this.getInstance(value);
            }
        }
    },
    created() {
        this.queryset = this.field.options.querysets[0];

        if(this.queryset && this.value) {
            this.instance = this.getInstance(this.value);
        }
    },
    computed: {
        /**
         * Link to the page of current instance, to which this field is linked.
         */
        href() {
            if(this.queryset && this.instance) {
                return this.queryset.url + this.instance.getPkValue();
            }
        },
        /**
         * Text of link.
         */
        text() {
            if(this.instance) {
                return this.instance.getViewFieldValue();
            }
        },
    },
    methods: {
        /**
         * Method, that opens page with instance.
         */
        goToHref() {
            this.$router.push({path: this.href});
        },
        /**
         * Method, that returns new instance of QuerySet Model.
         * @param {object} value.
         */
        getInstance(value) {
            return this.queryset.model.getInstance(value, this.queryset);
        }
    },
};

/**
 * Mixin, that adds hideField method, that is used in tables.
 */
const hide_field_in_table_mixin = {
    methods: {
        /**
         * Method, that returns true, if field should be hidden.
         * Otherwise, it returns false.
         * @param {object} field Field object.
         */
        hideField(field) {
            if(field.options && field.options.hidden) {
                return true;
            }

            if(field.options && field.options.is_pk) {
                return true;
            }

            return false;
        },
    },
};

/**
 * Mixin for vue components, that have modal window and button, that opens it.
 */
const modal_window_and_button_mixin = {
    data() {
        return {
            /**
             * Property, that is responsible
             * for modal showing/hiding.
             */
            show_modal: false,
        };
    },
    methods: {
        /**
         * Method, that opens modal window.
         */
        open() {
            this.show_modal = true;

            this.onOpen();
        },
        /**
         * Method, that closes modal window.
         */
        close() {
            this.show_modal = false;

            this.onClose();
        },
        /**
         * Method - callback for 'open' method.
         */
        onOpen() {},
        /**
         * Method - callback for 'close' method.
         */
        onClose() {},
    },
};

/**
 * Mixin with common methods of different table_row components.
 */
const table_row_mixin = {
    methods: {
        /**
         * Method handles click on table row (<tr>),
         * and depending to the place of user's click
         * it redirects user to <tr> link or to <td> link.
         * @param {object} event Click event.
         * @param {boolean} blank If true, function opens link in new window.
         */
        goToTrLink(event, blank) {
            if(!this.blockTrLink(event.target, 'tr', 'highlight-tr-none')) {
                let href;
                if(event.target.hasAttribute('href')) {
                    href = event.target.getAttribute('href');
                } else if (event.currentTarget) {
                    href = event.currentTarget.getAttribute('data-href');
                } else {
                    href = event.target.getAttribute('data-href');
                }

                if(blank) {
                    window.open("#" + href);
                } else {
                    this.$router.push(href);
                }
            }
        },
        /**
         * Method makes recursive search through DOM tree
         * and tries to find a search_class in the classList of DOM elements.
         * If function finds this search_class, it returns true.
         * Otherwise, it returns false.
         * @param {object} element DOM tree element.
         * @param {string} stop_element_name Name of DOM tree element
         * on which function stops search.
         * @param {string} search_class Name of CSS class, which function tries to find.
         */
        blockTrLink(element, stop_element_name, search_class) {
            if(!element) {
                return false;
            }

            if(element.classList.contains(search_class)) {
                return true;
            }

            if(element.parentElement &&
                element.parentElement.localName != stop_element_name) {
                return this.blockTrLink(
                    element.parentElement, stop_element_name, search_class
                );
            }

            return false;
        },
        /**
         * Method, that handles mousedown event.
         * This method opens link in new window.
         * @param {object} event Event object.
         */
        onMouseDownHandler(event) {
            if(event && event.which && event.which == 2) {
                this.goToTrLink(event, true);
            }
        },
    },
};

/**
 * Mixin for table row of table, that is used in fk_multi_autocomplete modal.
 */
const fma_table_row_mixin = {
    mixins: [hide_field_in_table_mixin, table_row_mixin],
    props: ['qs', 'instance', 'fields', 'field_props', 'field_value'],
    template: "#template_fk_multi_autocomplete_modal_table_row",
    computed: {
        data_to_represent: function() {
            // return this.instance.toRepresent();
            return this.instance.data;
        },
        selected() {
            if(!this.field_value.value) {
                return false;
            }

            let data = this.data_to_represent;

            if(data[this.field_props.value_field] == this.field_value.value) {
                return true;
            }

            return false;
        },
        is_selected() {
            if(this.selected) {
                return 'selected';
            }
            return '';
        },
        base_url() {
            return this.qs.url.replace(/\/$/g, "");
        }
    },
    methods: {
        /**
         * Method, that emits parent's 'changeValue' event,
         * that should change value of field.
         */
        selectCurrentInstance() {
            let view_val = this.data_to_represent[this.field_props.view_field];
            let value_val = this.data_to_represent[this.field_props.value_field];

            this.$emit('changeValue', {view_val: view_val, value_val: value_val });
        }
    },
};

/**
 * Mixin for table, that is used in fk_multi_autocomplete modal.
 */
const fma_table_mixin = {
    mixins: [hide_field_in_table_mixin],
    props: ['instances', 'qs', 'field_props', 'field_value'],
    template: "#template_fk_multi_autocomplete_modal_table",
    computed: {
        fields() {
            return this.qs.model.fields;
        }
    },
    methods: {
        changeValue(opt) {
            this.$emit('changeValue', opt);
        },
    },
    components: {
        fma_table_row: {
            mixins: [fma_table_row_mixin],
        },
    },
};

/**
 * Mixin for search input in fk_multi_autocomplete modal.
 */
const fma_search_input_mixin = {
    props: ['field_props'],
    template: "#template_fk_multi_autocomplete_modal_search_input",
    data() {
        return {
            /**
             * Property for storing value of search input.
             */
            search_input: undefined,
        };
    },
    methods: {
        /**
         * Method, that emits parent's 'filterQuerySetItems' event.
         */
        filterQuerySetItems() {
            this.$emit('filterQuerySetItems', this.search_input);
        },
        /**
         * Method, that cleans search_input value.
         */
        cleanFilterValue() {
            this.search_input = "";
            this.filterQuerySetItems();
        },
        /**
         * Method, that sets new value of search_input.
         * @param {string} value New value of search_input.
         */
        changeSearchInput(value) {
            this.search_input = value;
        },
        /**
         * Method, that handles 'keypress' event.
         * If user clicks on 'Enter', this method calls 'filterQuerySetItems' method.
         * @param {object} event Keypress event.
         */
        keyPressHandler(event) {
            if(event.keyCode == 13) {
                this.filterQuerySetItems();
            }
        }
    },
};

/**
 * Main mixin for pagination components.
 */
const main_pagination_mixin = {
    props: ['options'],
    template: "#template_pagination",
    computed: {
        pages_amount() {
            let num = this.options.count / this.options.page_size;

            if(num % 1 == 0) {
                return num;
            }

            return Math.floor(num) + 1;
        },

        current_page() {
            return this.options.page_number;
        },

        items(){
            let arr = [];
            let dots = "...";
            let no_dots_limit = 10;

            for(let number = 1; number <= this.pages_amount; number++) {

                if(this.pages_amount <= no_dots_limit) {
                    arr.push({number: number, text: number});
                    continue;
                }

                if(this.hideItemOrNot(number)) {
                    if(arr.last && arr.last.text != dots) {
                        arr.push({number: number, text: dots});
                    }
                    continue;
                }

                arr.push({number: number, text: number});
            }

            return arr;
        },
    },
    methods: {
        goToPage(page_number) {
            this.$router.push({
                name: this.$route.name,
                params: this.$route.params,
                query: $.extend(true, {}, this.$route.query, {page: page_number}),
            });
        },

        styles(number) {
            if(number == this.current_page) {
                return "background-color: #d2d6de;";
            }
            return "";
        },

        hideItemOrNot(number) {
            return (Math.abs(number - this.current_page) > 2 &&
                number > 3 && this.pages_amount - number > 3);
        }
    },
};


/**
 * Mixin for modal windows with instances list.
 */
const base_modal_window_for_instance_list_mixin ={
    mixins: [modal_window_and_button_mixin],
    props: ['options'],
    template: "#template_fk_multi_autocomplete_modal",
    data() {
        return {
            /**
             * Property, that is responsible
             * for preloader showing/hiding.
             */
            show_loader: false,
            /**
             * Property with data for modal list.
             */
            data: {
                instances: [],
                pagination: {
                    count: 0,
                    // page_size: list_props.page_size,
                    page_size: 10,
                    page_number: 1,
                }
            },
        };
    },
    computed: {
        /**
         * Property, that returns instances, loaded for modal list.
         */
        instances() {
            return this.data.instances;
        },
        /**
         * Property, that returns true, if there is no instance.
         * Otherwise, it returns false.
         */
        is_empty() {
            return isEmptyObject(this.instances);
        }
    },
    methods: {
        /**
         * Method, that opens modal window.
         */
        open() {
            let filters = this.generateFilters();

            this.updateInstances(filters);
        },
        /**
         * Method, that filters instances
         * according to the filter value.
         * @param {string, number} value Filter value.
         */
        filterQuerySetItems(value) {
            let filters = this.generateFilters(
                this.field_props.view_field, value,
            );

            this.updateInstances(filters);
        },
        /**
         * Method, that loads data for new pagination page.
         */
        goToPage(page) {
            let filters = this.generateFilters('page', page);

            this.updateInstances(filters);
        },
        /**
         * Method, that updates instances list
         * according to the filters.
         * @param {object} filters Object with filters values.
         */
        updateInstances(filters) {
            let qs = this.qs.clone().filter(filters);

            this.onUpdateInstances(qs);

            this.loadInstances(qs);
        },
        /**
         * Method - callback for updateInstances method.
         * @param {object} qs Updated QuerySet.
         */
        /* jshint unused: false */
        onUpdateInstances(qs) {},
        /**
         * Method, that generates filters for qs.
         * @param {string} key Filter's key.
         * @value {string, number} value Filter's value.
         */
        generateFilters(key, value) {
            let page = 1;
            let limit = this.data.pagination.page_size;

            if(key == 'page') {
                page = value;
            }

            let offset = limit * (page - 1);

            let filters = {
                limit: limit,
                offset: offset,
            };

            if(key !== 'page') {
                filters[key] = value;
            }

            return filters;
        },
        /**
         * Method, that loads instances.
         * @param {object} qs Queryset, that should load instances.
         */
        loadInstances(qs) {
            this.show_loader = true;

            if(!qs) {
                qs = this.qs;
            }

            qs.items().then(instances => {
                let data = this.data;
                let num = qs.query.offset / data.pagination.page_size;

                data.instances = instances;
                data.pagination.count = qs.api_count;
                data.pagination.page_number = num + 1;

                this.show_modal = true;
                this.show_loader = false;
            }).catch(error => {
                debugger;
                this.show_loader = false;
                let str = app.error_handler.errorToString(error);

                let srt_to_show = "Some error occurred during loading data" +
                    " for modal window. Error details: {0}".format(str);

                app.error_handler.showError(srt_to_show, str);
            });
        }

    },
    components: {
        /**
         * Component for table with instance.
         */
        current_table: {
            mixins: [fma_table_mixin],
        },
        /**
         * Component for search input of fk_multi_autocomplete field.
         */
        current_search_input: {
            mixins: [fma_search_input_mixin],
        },
        current_pagination: {
            mixins: [main_pagination_mixin],
            methods: {
                /**
                 * Method, that open new pagination page.
                 */
                goToPage(page_number) {
                    this.$emit('goToPage', page_number);
                },
            }
        }
    }
};

/**
 * Mixin for content components of inner_api_objec field.
 */
const field_inner_api_object_content_mixin = {
    methods: {
        /**
         * Property, that returns true if item, stores more, than 1 field.
         * @param {object} item Fields collector.
         */
        more_than_one_field(item) {
            return Object.keys(item).length > 1;
        },
        /**
         * Property, that returns value of realField.
         * @param {object} item Fields collector.
         * @param {object} field RealField.
         */
        realFieldValue(item, field) { /* jshint unused: false */
            if(this.value === undefined) {
                return;
            }

            if(this.value[item] !== undefined) {
                return this.value[item];
            }
        },
    },
};

/**
 * Mixin for content components of FK field.
 */
const field_fk_content_mixin = {
    data() {
        return {
            /**
             * Property, that stores the most appropriate queryset for current field.
             */
            queryset: undefined,
            /**
             * Property, that stores all querysets for current field.
             */
            querysets: undefined,

            /**
             * Property, that stores cached values.
             */
            values_cache: {},
        };
    },
    created() {
        let props = this.field.options.additionalProperties;
        let params = props.url_params || {};

        this.querysets = [];
        if(props.querysets) {
            this.querysets = props.querysets.map(qs => {
                let clone = qs.clone();

                clone.url = this.field.getQuerySetFormattedUrl(
                    this.data, $.extend(true, {}, this.$route.params, params), clone,
                );

                return clone;
            });

            this.queryset = this.field.getAppropriateQuerySet(this.data, this.querysets);
        }


        if(this.value !== undefined && typeof this.value != 'object') {
            if(this.values_cache[this.value]) {
                return this.$emit(
                    'proxyEvent', 'setValueInStore', this.values_cache[this.value],
                );
            }

            if(this.field.prefetchDataOrNot(this.data)) {
                this.prefetchValue(this.value);
            }
        }
    },
    watch: {
        value(value) {
            if(value === undefined) {
                return;
            }

            if(typeof value == 'object') {
                return;
            }

            if(this.values_cache[value]) {
                return this.$emit(
                    'proxyEvent', 'setValueInStore', this.values_cache[value],
                );
            }

            if(this.field.prefetchDataOrNot(this.data)) {
                this.prefetchValue(value);
            }
        },

        'field.options.additionalProperties.querysets': function(querysets) {
            let props = this.field.options.additionalProperties;
            let params = props.url_params || {};

            this.querysets = querysets.map(qs => {
                let clone = qs.clone();

                clone.url = this.field.getQuerySetFormattedUrl(
                    this.data, $.extend(true, {}, this.$route.params, params), clone,
                );

                return clone;
            });

            this.queryset = this.field.getAppropriateQuerySet(this.data, this.querysets);
        },
    },
    methods: {
        /**
         * Method, that loads prefetch_value.
         * @param {string, number} value.
         */
        prefetchValue(value) {
            let props = this.field.options.additionalProperties;
            let filters = {limit:1};
            filters[props.value_field] = value;
            let qs = this.queryset.filter(filters);

            qs.items().then(instances => {
                let instance = instances[0];

                if(instance && instance.data) {
                    let obj = {
                        value: value,
                        prefetch_value: instance.data[props.view_field],
                    };

                    this.values_cache[value] = obj;

                    this.$emit('proxyEvent', 'setValueInStore', obj);
                }
            });
        },
    },
};

/**
 * Mixin for list_view, readOnly content components of FK field.
 */
const field_fk_content_readonly_mixin = {
    mixins: [field_fk_content_mixin],
    computed: {
        /**
         * Property, that defines: render link or render just text.
         * @return {boolean}
         */
        with_link() {
            return this.field.makeLinkOrNot(this.data);
        },
        /**
         * Property, that returns 'fk' value.
         */
        fk() {
            if(!this.value) {
                return;
            }

            if(typeof this.value == 'object' && this.value.value) {
                return this.value.value;
            }

            return this.value;
        },
        /**
         * Link to the page of current instance, to which this field is linked.
         */
        href() {
            if(this.fk && this.queryset) {
                return this.queryset.url + this.fk;
            }
        },
        /**
         * Text of link.
         */
        text() {
            if(!this.value) {
                return;
            }

            if(typeof this.value == 'object' && this.value.prefetch_value) {
                return this.value.prefetch_value;
            }

            return this.value;
        },
    },
    methods: {
        /**
         * Method, that opens page with instance.
         */
        goToHref() {
            this.$router.push({path: this.href});
        },
    },
};

const field_fk_content_editable_mixin = {
    mixins: [base_field_content_edit_mixin, field_fk_content_mixin],
    template: "#template_field_content_edit_fk",
    data() {
        return {
            class_list: ["form-control", "select2", "select2-field-select"],
        };
    },
    mounted() {
        this.select_el = $(this.$el);

        this.initSelect2();

        if(this.value) {
            this.setValue(this.value);
        }
    },
    watch: {
        value(value) {
            this.setValue(value);
        },
    },
    methods: {
        /**
         * Method, that mounts select2 to current field's select.
         */
        initSelect2() {
            $(this.select_el).select2({
                width: '100%',
                ajax: {
                    delay: 350,
                    transport: (params, success, failure) => {
                        this.transport(params, success, failure);
                    },
                },
            }).on('change', (event) => {
                let data = $(this.select_el).select2('data')[0];
                let val_obj = {};

                if(data) {
                    val_obj.value = data.id;
                    val_obj.prefetch_value = data.text;
                } else {
                    val_obj.value = event.target.value;
                    val_obj.prefetch_value = event.target.value;
                }

                if(!deepEqual(val_obj, this.value)){
                    this.$emit('proxyEvent', 'setValueInStore', val_obj);

                }
            });
        },

        setValue(value) {
            if(!value) {
                return $(this.select_el).val(null).trigger('change');
            }

            if(typeof value !== 'object') {
                value = {
                    value: value,
                    prefetch_value: value,
                };
            }

            let result = {
                id: value.value,
                text: value.prefetch_value,
            };

            let newOption = new Option(
                result.text, result.id, false, true,
            );

            $(this.select_el).append(newOption).trigger('change');
        },

        transport(params, success, failure) {
            let search_str = trim(params.data.term);
            let props = this.field.options.additionalProperties;
            let filters = {
                limit: guiLocalSettings.get('page_size') || 20,
            };


            function getDependenceValueAsString(parent_data_object, field_name)
            {
                if (!field_name || !parent_data_object.hasOwnProperty(field_name))
                {
                    return undefined;
                }
                let field_dependence_name_array = [];
                let filds_data_obj = parent_data_object[field_name];
                for (let index = 0; index < filds_data_obj.length; index++)
                {
                    field_dependence_name_array.push(filds_data_obj[index].value);
                }
                return field_dependence_name_array.join(',');
            }

            filters[props.view_field] = search_str;
            let field_dependence_data = getDependenceValueAsString(this.$parent.data, props.field_dependence_name);

            let format_data = {
                fieldType: this.field.options.format,
                modelName: this.queryset.model.name,
                fieldName: this.field.options.name
            };
            let p = this.querysets.map(qs => {
                let signal_obj = {
                    qs: qs,
                    filters: filters,
                };
                if (field_dependence_data !== undefined)
                {
                    signal_obj.field_dependence_name = props.field_dependence_name;
                    signal_obj.filter_name = props.filter_name;
                    signal_obj[props.field_dependence_name] = field_dependence_data;
                }

                tabSignal.emit("filter.{fieldType}.{modelName}.{fieldName}".format(format_data), signal_obj);

                if (!signal_obj.hasOwnProperty('nest_prom'))
                {
                    return qs.filter(filters).items();
                } else {
                    return signal_obj.nest_prom;
                }
            });

            Promise.all(p).then(response => {
                let results = [];

                if(this.field.options.default !== undefined) {
                    if(typeof this.field.options.default !== 'object') {
                        results.push({
                            id: this.field.options.default,
                            text: this.field.options.default,
                        });
                    } else {
                        results.push(this.field.options.default);
                    }
                }

                response.forEach(instances => {
                    instances.forEach(instance => {
                        results.push({
                            id: instance.data[props.value_field],
                            text: instance.data[props.view_field],
                        });
                    });
                });

                success({results:results});

            }).catch(error => {
                console.error(error);

                let results = [];

                if(props.default_value) {
                    results.push(props.default_value);
                }

                failure(results);
            });
        },
    }
};

/**
 * Mixin for editable fk_autocomplete gui_field(input value area).
 */
const field_fk_autocomplete_edit_content_mixin = {
    computed: {
        /**
         * Property, that returns value to represent.
         * @private
         */
        _val() {
            if(!this.value) {
                return;
            }

            if(typeof this.value == 'object' &&
                this.value.prefetch_value !== undefined) {
                return this.value.prefetch_value;
            }

            return this.value;
        },
        /**
         * Property, that returns value to represent.
         */
        val() {
            return this._val;
        }
    },
    methods: {
        /**
         * Method, that saves in store value, typed by user.
         * @param {*} value
         */
        setValueByHandsInStore(value) {
            if(this.value && this.value.prefetch_value &&
                this.value.prefetch_value == value) {
                return;
            }

            let obj = {
                value: value,
                prefetch_value: value,
            };

            this.$emit('proxyEvent', 'setValueInStore', obj);
        }
    }
};

/**
 * Mixin for read file button of binfile field.
 */
const field_binfile_readfile_button_mixin = {
    mixins: [base_field_button_mixin],
    data() {
        return {
            wrapper_classes: ['input-group-append'],
            wrapper_styles: {},
            span_classes: ['btn', 'input-group-text', 'textfile'],
            icon_styles: {},
            icon_classes: ['fa', 'fa-file-text-o'],
            event_handler: 'readFile',
            help_text: 'Open file',
            accept: '*',
            multiple: false,
        };
    },
    template: "#template_field_part_button_readFile",
};

/**
 * Mixin for editable binfile field (input value area).
 */
const field_binfile_edit_content_mixin = {
    mixins: [base_field_content_edit_mixin],
    template: "#template_field_content_edit_base64file",
    created() {
        this.styles_dict.minHeight = '38px';
    },
    components: {
        field_clear_button: {
            mixins: [base_field_button_mixin],
        },
        field_hidden_button: {
            mixins: [base_field_button_mixin],
            data() {
                return {
                    icon_classes: ['fa', 'fa-minus'],
                    event_handler: 'hideField',
                    help_text: 'Hide field',
                };
            },
        },
        /**
         * Component for 'open file' button.
         */
        field_read_file_button: {
            mixins: [field_binfile_readfile_button_mixin],
        },
    },
};

/**
 * Mixin for readonly and editable namedbinfile field.
 */
const field_namedbinfile_content_mixin = {
    data() {
        return {
            title_for_empty_value: 'No file selected',
        };
    },
    computed: {
        val() {
            if(this.value && typeof this.value == "object" && this.value.name) {
                return this.value.name;
            }

            return this.title_for_empty_value;
        }
    },
};

/**
 * Mixin for readonly and editable namedbinimage field.
 */
const field_namedbinimage_content_mixin = {
    data() {
        return {
            title_for_empty_value: 'No image selected',

        };
    },
    components: {
        image_block: {
            mixins: [base_field_inner_component_mixin],
            template: '#template_field_content_binimage_image_block',
            data() {
                return {
                    show_modal: false,
                    modal_opt: {
                        footer: false,
                    }
                };
            },
            computed: {
                img_src() {
                    if(this.value && this.value.content) {
                        return 'data:image/png;base64,' + this.value.content;
                    }
                },
                img_alt() {
                    return this.field.options.title || this.field.options.name;
                }
            },
            methods: {
                openImage() {
                    this.show_modal = true;
                },
                closeImage() {
                    this.show_modal = false;
                },
            },
        }
    },
};

/**
 * Mixin for readonly and editable multiplenamedbinfile field.
 */
const field_multiplenamedbinfile_content_mixin = {
    mixins: [field_namedbinfile_content_mixin],
    data() {
        return {
            type_in_singal: 'file',
            type_in_plural: 'files',
        };
    },
    computed: {
        val() {
            if(this.value && Array.isArray(this.value) && this.value.length > 0) {
                return this.value.length + " " + (this.value.length === 1 ? this.type_in_singal : this.type_in_plural) +" selected";
            }

            return this.title_for_empty_value;
        },
    },
};


/**
 * Mixin for readonly and editable multiplenamedbinimage field.
 */
const field_multiplenamedbinimage_content_mixin = {
    mixins: [field_multiplenamedbinfile_content_mixin, field_namedbinimage_content_mixin],
    data() {
        return {
            type_in_singal: 'image',
            type_in_plural: 'images',
        };
    },
};

/**
 * Mixin for editable multiplenamedbinfile field.
 */
const field_multiplenamedbinfile_edit_content_mixin = {
    methods: {
        removeFile(index) {
            let v = this.value ? [...this.value] : [];
            v.splice(index, 1);
            this.$emit('proxyEvent', 'setValueInStore', v);
        },
    },
    components: {
        field_read_file_button: {
            mixins: [field_binfile_readfile_button_mixin],
            data() {
                return {
                    help_text: 'Open files',
                    multiple: true,
                };
            },
        },
    },
};

const gui_fields_mixins = { /* jshint unused: false */
    base: {
        props: {
            field: Object,
            wrapper_opt: Object,
            prop_data:{required:false, default: () => {}},
        },
        data: function () {
            return {
                wrapper_classes_list: {
                    base: "form-group " + addCssClassesToElement(
                        'guiField', this.field.options.name, this.field.options.format || this.field.options.type,
                    ),
                    grid: "col-lg-4 col-xs-12 col-sm-6 col-md-6",
                },
                wrapper_styles_list: {},
                hidden: this.field.options.hidden || false,
            };
        },
        template: '#template_field_base',
        watch: {
            'field.options.hidden': function(value) {
                this.hidden = value;
            },
        },
        computed: {
            /**
             * Property, that returns object with values of current field
             * and fields from the same fields wrapper.
             * For example, from the same Model Instance.
             * @return {object}
             */
            data: function() {
                if(this.wrapper_opt.use_prop_data) {
                    return this.prop_data;
                }

                return this.$store.getters.getViewInstanceData({
                    url: this.wrapper_opt.qs_url,
                    store: this.wrapper_opt.store,
                });
            },
            /**
             * Property, that return value of current field.
             * @return {*}
             */
            value: function () {
                return this.getRepresentValue(this.data);
            },
            /**
             * Property, that returns string with classes of field wrapper.
             * @return {string}
             */
            wrapper_classes: function () {
                let list = "";

                for (let cl in this.wrapper_classes_list) {
                    if(this.wrapper_classes_list.hasOwnProperty(cl)) {
                        list += this.wrapper_classes_list[cl] + " ";
                    }
                }

                return list;
            },
            /**
             * Property, that returns string with styles of field wrapper.
             * @return {string}
             */
            wrapper_styles: function () {
                return this.wrapper_styles_list;
            },
            /**
             * Property, that returns true, if field should be hidden.
             * Otherwise, returns false.
             * @return {boolean}
             */
            is_hidden: function () {
                if(this.wrapper_opt && this.wrapper_opt.hideUnrequired &&
                    this.wrapper_opt.hidden !== undefined) {
                    return this.wrapper_opt.hidden;
                }

                return this.hidden;
            },
        },
        methods: {
            /**
             * Method, that converts field value to appropriate type,
             * before saving it to the store.
             * @param {object} data Object with values of current field
             * and fields from the same fields_wrapper.
             */
            handleValue: function (data) {
                return this.field.toInner(data);
            },
            /**
             * Method, that returns value in representation format.
             * @param {object} data Object with values of current field
             * and fields from the same fields_wrapper.
             */
            getRepresentValue: function(data) {
                return this.field.toRepresent(data);
            },
            /**
             * Method, that saves field value into the Vuex store
             * (commits Vuex store state mutation).
             */
            setValueInStore: function(value) {
                let val = $.extend(true, {}, this.data);

                val[this.field.options.name] = value;

                if(this.wrapper_opt.use_prop_data) {
                    return this.$emit('setValueInStore', this.handleValue(val));
                }

                this.$store.commit('setViewFieldValue', {
                    url: this.wrapper_opt.qs_url,
                    field: this.field.options.name,
                    value: this.handleValue(val),
                    store: this.wrapper_opt.store,
                });
            },
            /**
             * Method, that cleans field's value (sets field value to undefined).
             */
            cleanValue: function () {
                this.setValueInStore();
            },
            /**
             * Method, that sets field's value equal to default.
             */
            valueToDefault: function () {
                this.setValueInStore(this.field.options.default);
            },
            /**
             * Method, that sets field property 'hidden' equal to true.
             */
            hideField: function () {
                this.cleanValue();
                this.$emit('toggleHidden', {field: this.field.options.name});
            },
            /**
             * Method, that calls other field's methods.
             * It is expected to be called from inner components of field.
             * For example, from <field_content_edit></field_content_edit> component.
             * Buttons component, that 'field_content_edit' has inside itself,
             * will emit 'proxyEvent' event with the name of field's method,
             * that proxyEvent should call.
             */
            proxyEvent(callback_name, opt) {
                if (this[callback_name]) {
                    this[callback_name](opt);
                }
            },
        },
        components: {
            /**
             * Component for label (title) of field.
             */
            field_label: {
                mixins: [base_field_label_mixin],
            },
            /**
             * Component for area, that shows value of field with readOnly == true.
             */
            field_content_readonly: {
                mixins: [base_field_content_readonly_mixin],
            },
            /**
             * Component for area, that shows value of field with readOnly == false.
             */
            field_content_edit: {
                mixins: [base_field_content_edit_mixin],
            },
            /**
             * Component for description (help text) of field.
             */
            field_description: {
                mixins: [base_field_description_mixin],
            },
            /**
             * Component for list_view of field.
             */
            field_list_view: {
                mixins: [base_field_list_view_mixin],
            },
        },
    },

    integer: {
        components: {
            field_content_edit: {
                mixins: [base_field_content_edit_mixin, integer_field_content_mixin],
            }
        },
    },

    boolean: {
        methods: {
            toggleValue() {
                this.setValueInStore(!this.value);
            },
            /**
             * Method, that sets some value (default or false) to current boolean field,
             * if it is not hidden and it's value === undefined.
             * This is needed, because without this operation,
             * user will see that value of field is 'false', but in store value will be equal to undefined.
             */
            initBooleanValue() {
                if(!this.is_hidden && this.value === undefined) {
                    let value = false;

                    if(this.field.options.default !== undefined) {
                        value = this.field.options.default;
                    }

                    this.setValueInStore(value);
                }
            },
        },
        mounted() {
            this.initBooleanValue();
        },
        watch: {
            'is_hidden': function(is_hidden) { /* jshint unused: false */
                this.initBooleanValue();
            }
        },
        components: {
            field_content_readonly: {
                mixins: [base_field_content_readonly_mixin, boolean_field_content_mixin],
                template: "#template_field_content_readonly_boolean",
            },
            field_content_edit: {
                mixins: [base_field_content_edit_mixin, boolean_field_content_mixin],
                template: "#template_field_content_edit_boolean",
            },
            field_list_view: {
                mixins: [base_field_list_view_mixin],
                template: "#template_field_part_list_view_boolean",
                computed: {
                    classes() {
                        if(this.value) {
                            return 'boolean-true fa fa-check';
                        }

                        return 'boolean-false fa fa-times';
                    }
                },
            },
        },
    },

    choices: {
        components: {
            field_content_readonly: {
                mixins: [choices_field_content_readonly_mixin],
            },
            field_content_edit: {
                mixins: [base_field_content_edit_mixin],
                template: "#template_field_content_edit_choices",
                data() {
                    return {
                        /**
                         * Property, that stores select2 DOM element.
                         */
                        s2: undefined,
                        class_list: ["form-control", "select2", "select2-field-select"],

                    };
                },
                mounted() {
                    this.s2 = $(this.$el);

                    this.initSelect2();

                    if(this.value) {
                        this.setValue(this.value);
                    } else {
                        $(this.s2).trigger('change');
                    }
                },
                watch: {
                    value(value) {
                        this.setValue(value);
                    },
                },
                methods: {
                    /**
                     * Method, that mounts select2 to current field's select.
                     */
                    initSelect2() {
                        $(this.s2).select2({
                            width: '100%',
                            data: this.field.options.enum,
                        }).on('change', (event) => {
                            let value;
                            let data = $(this.s2).select2('data')[0];

                            if(data && data.id) {
                                value = data.id;
                            } else {
                                value = event.target.value;
                            }

                            this.$emit('proxyEvent', 'setValueInStore', value);
                        });
                    },
                    /**
                     * Method, that sets value to select2 DOM element.
                     * @param {string} value.
                     */
                    setValue(value) {
                        $(this.s2).val(value).trigger('change');
                    },
                }
            },
        },
    },

    autocomplete: {
        components: {
            field_content_edit: {
                mixins: [
                    base_field_content_edit_mixin, autocomplete_field_content_edit_mixin,
                ],
            },
        }
    },

    textarea: {
        components: {
            field_content_readonly: {
                mixins: [base_field_content_readonly_mixin],
                template: "#template_field_content_readonly_textarea",
                data() {
                    return {
                        styles_dict: {resize: 'vertical'},
                    };
                },
            },
            field_content_edit: {
                mixins: [base_field_content_edit_mixin],
                template: "#template_field_content_edit_textarea",
                data() {
                    return {
                        styles_dict: {resize: 'vertical'},
                    };
                },
            },
        },
    },

    file: {
        data() {
            return {
                file_reader_method: 'readAsText',
                file_obj: undefined,
            };
        },
        created() {
            this.file_obj = {};
        },
        methods: {
            cleanValue() {
                this.file_obj = {};
                this.setValueInStore();
            },
            /**
             * Method, returns false, if file's size is invalid (too large).
             * Otherwise, it returns true.
             * @param file_size {number} File's size.
             * @return {boolean}
             */
            isFileSizeValid(file_size) {
                if(this.field.options.max_size !== undefined) {
                    return this.field.options.max_size <= file_size;
                }
                return true;
            },
            /**
             * Method, that reads content of selected file
             * and sets field value equal to this content.
             */
            readFile: function(event) {
                let file = event.target.files[0];

                if(!file) {
                    return;
                }

                if(!this.isFileSizeValid(file.size)) {
                    guiPopUp.error("File is too large");
                    console.log("File is too large " + file.size);
                    return;
                }

                this.file_obj = file;

                let reader = new FileReader();

                reader.onload = this.readFileOnLoadCallback;

                reader[this.file_reader_method](file);
            },
            /**
             * Method - callback for onLoad event of FileReader.
             * @param {object} event Event object.
             */
            readFileOnLoadCallback: function(event) {
                this.setValueInStore(event.target.result);

                let el = $(this.$el).find("#file_reader_input");
                $(el).val("");
            },
        },
        components: {
            field_content_edit: {
                mixins: [base_field_content_edit_mixin],
                template: "#template_field_content_edit_file",
                data() {
                    return {
                        styles_dict: {resize: 'vertical'},
                    };
                },
                components: {
                    field_clear_button: {
                        mixins: [base_field_button_mixin, file_field_button_mixin],
                    },
                    field_hidden_button: {
                        mixins: [base_field_button_mixin, file_field_button_mixin],
                        data() {
                            return {
                                icon_classes: ['fa', 'fa-minus'],
                                event_handler: 'hideField',
                                help_text: 'Hide field',
                            };
                        },
                    },
                    /**
                     * Component for 'open file' button.
                     */
                    field_read_file_button: {
                        mixins: [base_field_button_mixin, file_field_button_mixin],
                        template: "#template_field_part_button_readFile",
                        data() {
                            return {
                                icon_classes: ['fa', 'fa-file-text-o'],
                                event_handler: 'readFile',
                                help_text: 'Open file',
                                accept: '*',
                            };
                        },
                    }
                }
            },
        },
    },

    binfile: {
        data() {
            return {
                file_reader_method: 'readAsArrayBuffer',
            };
        },
        watch: {
            'file_obj': function(file) {
                let el = $(this.$el).find("#file_path_input");

                if(file && file.name) {
                    $(el).text(file.name);
                } else {
                    $(el).text("No file selected");
                }
            }
        },
        methods: {
            handleValue(data={}) {
                return this.field.toBase64(data);
            },
        },
        components: {
            field_content_edit: {
                mixins: [field_binfile_edit_content_mixin],
            },
        },
    },

    namedbinfile: {
        methods: {
            handleValue(data={}) {
                return {
                    name: this.file_obj.name || null,
                    content: this.field.toBase64(data) || null,
                };
            },
        },
        components: {
            field_content_readonly: {
                mixins: [base_field_content_readonly_mixin, field_namedbinfile_content_mixin],
                template: '#template_field_content_readonly_namedbinfile',
            },
            field_content_edit: {
                mixins: [field_binfile_edit_content_mixin, field_namedbinfile_content_mixin],
                template: '#template_field_content_edit_namedbinfile',
            },
        }
    },

    namedbinimage: {
        components: {
            field_content_readonly: {
                mixins: [base_field_content_readonly_mixin, field_namedbinfile_content_mixin, field_namedbinimage_content_mixin],
                template: '#template_field_content_readonly_namedbinimage',
            },
            field_content_edit: {
                mixins: [field_binfile_edit_content_mixin, field_namedbinfile_content_mixin, field_namedbinimage_content_mixin],
                template: '#template_field_content_edit_namedbinimage',
                components: {
                    field_read_file_button: {
                        mixins: [field_binfile_readfile_button_mixin],
                        data() {
                            return {
                                accept: 'image/*',
                                help_text: 'Open image',
                            };
                        },
                    },
                }
            },
        }
    },

    multiplenamedbinfile: {
        computed: {
            val() {
                return this.value === undefined ? [] : this.value;
            }
        },
        methods: {
            handleValue(data={}) {
                return data[this.field.options.name];
            },

            readOneFile(file) {
                if(!file) {
                    return;
                }

                if(!this.isFileSizeValid(file.size)) {
                    guiPopUp.error('File "' + file.name + '" is too large.');
                    console.log('File "' + file.name + '" is too large.');
                    return;
                }

                let reader = new FileReader();

                reader.onload = (event) => {return this.readFileOnLoadCallback(event, file);};

                reader[this.file_reader_method](file);
            },

            readFileOnLoadCallback(event, file) {
                let files = [...this.val];
                let obj = {};
                obj[this.field.options.name] = event.target.result;
                files.push({
                    name: file.name,
                    content: this.field.toBase64(obj),
                });
                this.setValueInStore(files);
            },

            readFile: function(event) {
                let files = event.target.files;

                for(let index = 0; index < files.length; index++) {
                    this.readOneFile(files[index]);
                }
            },
        },
        components: {
            field_content_readonly: {
                mixins: [
                    base_field_content_readonly_mixin,
                    field_multiplenamedbinfile_content_mixin,
                ],
                template: '#template_field_content_readonly_mutiplenamedbinfile',
            },
            field_content_edit: {
                mixins: [
                    field_binfile_edit_content_mixin,
                    field_multiplenamedbinfile_content_mixin,
                    field_multiplenamedbinfile_edit_content_mixin,
                ],
                template: '#template_field_content_edit_mutiplenamedbinfile',
            },
        },
    },

    multiplenamedbinimage: {
        components: {
            field_content_readonly: {
                mixins: [base_field_content_readonly_mixin, field_multiplenamedbinimage_content_mixin],
                template: '#template_field_content_readonly_mutiplenamedbinimage',
            },
            field_content_edit: {
                mixins: [
                    field_binfile_edit_content_mixin,
                    field_multiplenamedbinimage_content_mixin,
                    field_multiplenamedbinfile_edit_content_mixin,
                ],
                template: '#template_field_content_edit_mutiplenamedbinimage',
                components: {
                    field_read_file_button: {
                        mixins: [field_binfile_readfile_button_mixin],
                        data() {
                            return {
                                accept: 'image/*',
                                help_text: 'Open images',
                                multiple: true,
                            };
                        },
                    },
                }
            },
        },
    },

    password: {
        methods: {
            copyValueToClipBoard() {
                let value = this.value;
                let field_name = this.field.options.title || this.field.options.name;

                if(!value) {
                    value = '';
                }

                try {
                    navigator.clipboard.writeText(value).then(() => {
                        guiPopUp.success("Value of <b>" + field_name + "</b> field was successfully copied to clipboard.");
                    }).catch(error => {
                        throw error;
                    });
                } catch(e) {
                    console.error(e);
                    guiPopUp.error("Value of <b>" + field_name + "</b> field was not copied to clipboard.");
                }
            },
        },
        components: {
            field_content_readonly: {
                mixins: [base_field_content_readonly_mixin, password_field_content_mixin],
            },
            field_content_edit: {
                mixins: [base_field_content_edit_mixin, password_field_content_mixin],
                template: '#template_field_content_edit_password',
                methods: {
                    showValue() {
                        this.input_type = this.input_type == 'password' ? 'text' : 'password';
                    },
                },
                components: {
                    field_show_value_button: {
                        mixins: [base_field_button_mixin],
                        props: ['field', 'input_type'],
                        data() {
                            return {
                                icon_classes: ['fa', 'fa-eye'],
                                event_handler: 'showValue',
                                help_text: "Show field's value",
                            };
                        },
                        watch: {
                            'input_type': function(type) {
                                if(type == 'text') {
                                    this.icon_classes = ['fa', 'fa-eye-slash'];
                                    this.help_text = "Hide field's value";
                                } else {
                                    this.icon_classes = ['fa', 'fa-eye'];
                                    this.help_text = "Show field's value";
                                }
                            }
                        },
                    },
                    field_copy_value_button: {
                        mixins: [base_field_button_mixin],
                        data() {
                            return {
                                icon_classes: ['fa', 'fa-files-o'],
                                event_handler: 'copyValueToClipBoard',
                                help_text: "Copy field's value to clipboard",
                            };
                        },
                    },
                },
            },
        },
    },

    email: {
        components: {
            field_content_edit: {
                mixins: [base_field_content_edit_mixin],
                data() {
                    return {
                        input_type: 'email',
                    };
                },
            },
        },
    },

    text_paragraph: {
        data: function () {
            return {
                wrapper_classes_list: {
                    base: "form-group " + addCssClassesToElement(
                        'guiField', this.field.options.name, this.field.options.format || this.field.options.type,
                    ),
                    grid: "col-lg-12 col-xs-12 col-sm-12 col-md-12",
                },
            };
        },
        components: {
            field_content_readonly: {
                mixins: [base_field_content_readonly_mixin],
                template: "#template_field_content_readonly_text_paragraph",
                data() {
                    return {
                        class_list: [],
                        styles_dict: {},
                    };
                },
            },
            field_content_edit: {
                mixins: [base_field_content_edit_mixin],
                template: "#template_field_content_edit_textarea",
            },
        },
    },

    plain_text: {
        data: function () {
            return {
                wrapper_classes_list: {
                    base: "form-group " + addCssClassesToElement(
                        'guiField', this.field.options.name, this.field.options.format || this.field.options.type,
                    ),
                    grid: "col-lg-12 col-xs-12 col-sm-12 col-md-12",
                },
            };
        },
        components: {
            field_content_readonly: {
                mixins: [base_field_content_readonly_mixin],
                template: "#template_field_content_readonly_plain_text",
                data() {
                    return {
                        class_list: ["text-data"],
                        styles_dict: {whiteSpace: 'pre-wrap'},
                    };
                },
            },
        },
    },

    html: {
        data: function () {
            return {
                link_path: "",
            };
        },
        components: {
            field_content_readonly: {
                mixins: [base_field_content_readonly_mixin],
                template: "#template_field_content_readonly_plain_text",
                data() {
                    return {
                        class_list: ["html_content", "rounded", "text-data"],
                    };
                },
                computed: {
                    with_border() {
                        if(this.value) {
                            return '';
                        }

                        return 'html_content_border';
                    },
                    classes() {
                        return [].concat(this.class_list, this.with_border).join(" ");
                    },
                },
            },
        },
        mounted() {
            this.setLinksInsideField();
        },
        methods: {
            /**
             * Method, that adds handlers to links from html field value.
             */
            setLinksInsideField: function() {
                let links_array = $(this.$el).find('a');

                for(let i = 0; i < links_array.length; i++) {
                    let link = links_array[i];

                    if(!(link.href && link.href.search(window.hostname) != -1)) {
                        link.setAttribute('target', '_blank');
                        link.setAttribute('rel', 'noreferrer');
                        continue;
                    }

                    let match = link.href.match(/#([A-z0-9,\-]+)$/);

                    if(match && link.href.search(window.location.href) == -1 &&
                        $('*').is(match[0])) {
                        link.onclick = function() {
                            $('body,html').animate({
                                scrollTop: $(match[0]).offset().top,
                            }, 600);
                            return false;
                        };

                        continue;
                    }

                    if(link.href.search(window.location.href) == -1) {
                        link.href = window.location.href + this.link_path +
                            link.href.split(window.hostname)[1];
                    }
                }
            }
        }
    },

    date: {
        components: {
            field_content_readonly: {
                mixins: [base_field_content_readonly_mixin, date_field_content_mixin],
            },
            field_content_edit: {
                mixins: [base_field_content_edit_mixin, date_field_content_mixin],
            },
        },
    },

    date_time: {
        components: {
            field_content_readonly: {
                mixins: [
                    base_field_content_readonly_mixin, date_time_field_content_mixin,
                ],
            },
            field_content_edit: {
                mixins: [base_field_content_edit_mixin, date_time_field_content_mixin],
            },
        },
    },

    uptime: {
        components: {
            field_content_edit: {
                mixins: [base_field_content_edit_mixin],
                template: "#template_field_content_edit_uptime",
                data() {
                    return {
                        class_list: ["form-control", "uptime-input"],
                    };
                },
                components: {
                    // button, that decreases field's value
                    field_uptime_down_button: {
                        mixins: [base_field_button_mixin],
                        template: "#template_field_part_button_uptime",
                        data() {
                            return {
                                icon_classes: ['fa', 'fa-chevron-left'],
                                event_handler: 'callDoDecrease',
                                help_text: 'Decrease value',
                            };
                        },
                    },
                    // button, that increases field's value
                    field_uptime_up_button: {
                        mixins: [base_field_button_mixin],
                        template: "#template_field_part_button_uptime",
                        data() {
                            return {
                                icon_classes: ['fa', 'fa-chevron-right'],
                                event_handler: 'callDoIncrease',
                                help_text: 'Increase value',
                            };
                        },
                    },
                }
            },
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
                    mask:[
                        {
                            mask:'HH:mm:SS',
                            blocks: {
                                HH: {
                                    mask: IMask.MaskedRange,
                                    from: 0,
                                    to: 23
                                },
                                mm: {
                                    mask: IMask.MaskedRange,
                                    from: 0,
                                    to: 59
                                },
                                SS: {
                                    mask: IMask.MaskedRange,
                                    from: 0,
                                    to: 59
                                }
                            },
                        },
                        {
                            mask:'DAYd HH:mm:SS',
                            blocks: {
                                DAY: {
                                    mask: IMask.MaskedRange,
                                    from: 0,
                                    to: 31
                                },
                                HH: {
                                    mask: IMask.MaskedRange,
                                    from: 0,
                                    to: 23
                                },
                                mm: {
                                    mask: IMask.MaskedRange,
                                    from: 0,
                                    to: 59
                                },
                                SS: {
                                    mask: IMask.MaskedRange,
                                    from: 0,
                                    to: 59
                                }
                            },
                        },
                        {
                            mask:'MONTHm DAYd HH:mm:SS',
                            blocks: {
                                MONTH: {
                                    mask: IMask.MaskedRange,
                                    from: 0,
                                    to: 12
                                },
                                DAY: {
                                    mask: IMask.MaskedRange,
                                    from: 0,
                                    to: 31
                                },
                                HH: {
                                    mask: IMask.MaskedRange,
                                    from: 0,
                                    to: 23
                                },
                                mm: {
                                    mask: IMask.MaskedRange,
                                    from: 0,
                                    to: 59
                                },
                                SS: {
                                    mask: IMask.MaskedRange,
                                    from: 0,
                                    to: 59
                                }
                            },
                        },
                        {
                            mask:'YEARy MONTHm DAYd HH:mm:SS',
                            blocks: {
                                YEAR: {
                                    mask: IMask.MaskedRange,
                                    from: 0,
                                    to: 99
                                },
                                MONTH: {
                                    mask: IMask.MaskedRange,
                                    from: 0,
                                    to: 12
                                },
                                DAY: {
                                    mask: IMask.MaskedRange,
                                    from: 0,
                                    to: 31
                                },
                                HH: {
                                    mask: IMask.MaskedRange,
                                    from: 0,
                                    to: 23
                                },
                                mm: {
                                    mask: IMask.MaskedRange,
                                    from: 0,
                                    to: 59
                                },
                                SS: {
                                    mask: IMask.MaskedRange,
                                    from: 0,
                                    to: 59
                                }
                            },
                        },
                    ],
                },
            };
        },
        mounted() {
            if(!this.field.options.readOnly) {
                let element = $(this.$el).find('input.uptime-input');

                if(element[0]) {
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

                if(new_value >= 3155759999) {
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

                if(new_value < 0) {
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
                if(this.uptimeSettings.mouseDown) {
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
                if(this.uptimeSettings.mouseDown) {
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

                if(iteration >= 20) {
                    increement = 10;
                }

                if(iteration >= 30) {
                    increement = 100;
                }

                if(iteration >= 40) {
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
    },

    time_interval: {
        methods: {
            /**
             * Redefinition of 'handleValue' method of base guiField.
             * @param {object} data Object with values of current field
             * and fields from the same fields_wrapper.
             */
            handleValue(data={}) {
                let value = data[this.field.options.name];

                if(value === undefined) {
                    return;
                }

                return {
                    value: this.field._toInner(data),
                    represent_value: value,
                };
            },
        },
        components: {
            field_content_edit: {
                mixins: [base_field_content_edit_mixin, integer_field_content_mixin],
                data() {
                    return {
                        default_field_attrs: {min: 0},
                    };
                },
            },
        },
    },

    crontab: {
        data: function () {
            return {
                wrapper_classes_list: {
                    base: "form-group " + addCssClassesToElement(
                        'guiField', this.field.options.name, this.field.options.format || this.field.options.type,
                    ),
                    grid: "col-lg-12 col-xs-12 col-sm-12 col-md-12",
                },
            };
        },
        components: {
            field_content_edit: {
                mixins: [base_field_content_edit_mixin, crontab_field_content_edit_mixin],
            },
        },
        computed: {},
        methods: {},
    },

    json: {
        data: function () {
            return {
                wrapper_classes_list: {
                    base: "form-group " + addCssClassesToElement(
                        'guiField', this.field.options.name, this.field.options.format || this.field.options.type,
                    ),
                    grid: "col-lg-12 col-xs-12 col-sm-12 col-md-12",
                },
            };
        },
        components: {
            field_content_readonly: {
                mixins: [
                    base_field_content_readonly_mixin, json_field_content_read_only_mixin
                ],
            },
        },
    },

    api_object: {
        components: {
            field_content_edit: {
                mixins: [field_content_api_object_mixin],
            },
            field_content_readonly: {
                mixins: [field_content_api_object_mixin],
            },
        }
    },

    fk: {
        methods: {
            /**
             * Redefinition of 'handleValue' method of base guiField.
             * @param {object} data Object with values of current field
             * and fields from the same fields_wrapper.
             */
            handleValue: function(data) {
                return data[this.field.options.name];
            },
            /**
             * Redefinition of 'getRepresentValue' method of base guiField.
             * @param {object} data Object with values of current field
             * and fields from the same fields_wrapper.
             */
            getRepresentValue: function(data) {
                return data[this.field.options.name];
            },
        },
        components: {
            field_list_view: {
                mixins: [base_field_list_view_mixin, field_fk_content_readonly_mixin],
                template: "#template_field_part_list_view_fk",
            },
            field_content_readonly: {
                mixins: [
                    base_field_content_readonly_mixin, field_fk_content_readonly_mixin,
                ],
                template: "#template_field_content_readonly_fk",
                data() {
                    return {
                        class_list: ["form-control", "revers-color"],
                        styles_dict: {height: '38px'},
                    };
                }
            },
            field_content_edit: {
                mixins: [field_fk_content_editable_mixin],
            },
        },
    },

    multiselect: {
        components: {
            field_list_view: {
                mixins: [base_field_content_readonly_mixin, field_fk_content_mixin],
                template: "#template_field_part_list_view_fk",
                computed: {
                    with_link() {
                        return false;
                    },
                    text() {
                        return this.field.toRepresent(this.data);
                    },
                },
            },
            field_content_readonly: {
                mixins: [base_field_content_readonly_mixin, field_fk_content_mixin],
                template: "#template_field_content_readonly_multiselect",
                computed: {
                    text() {
                        return this.field.toRepresent(this.data);
                    },
                },
            },
            field_content_edit: {
                mixins: [field_fk_content_editable_mixin],
                template: "#template_field_content_edit_multiselect",
                methods: {
                    /**
                     * Method, that mounts select2 to current field's select.
                     */
                    initSelect2() {
                        $(this.select_el).select2({
                            width: '100%',
                            multiple: true,
                            ajax: {
                                delay: 350,
                                transport: (params, success, failure) => {
                                    this.transport(params, success, failure);
                                },
                            },
                        }).on('change', (event) => { /* jshint unused: false */
                            let data = $(this.select_el).select2('data');
                            let val_arr = [];

                            if(data) {
                                val_arr = data.map(item => {
                                    return {
                                        value: item.id,
                                        prefetch_value: item.text,
                                    };
                                });
                            }

                            if(!deepEqual(val_arr, this.value)){
                                this.$emit('proxyEvent', 'setValueInStore', val_arr);
                            }
                        });
                    },

                    setValue(value) {
                        if(!value) {
                            return $(this.select_el).val(null).trigger('change');
                        }

                        let val = value;

                        if(typeof val == 'string') {
                            val = val.split(this.field.options.additionalProperties.view_separator);
                        }

                        if(Array.isArray(val)) {
                            $(this.select_el).html(null);

                            val.forEach(item => {
                                if(typeof item == 'object') {
                                    $(this.select_el).append(new Option(item.prefetch_value, item.value, false, true));
                                } else {
                                    $(this.select_el).append(new Option(item, item, false, true));
                                }
                            });

                            $(this.select_el).trigger('change');
                        }
                    },

                }
            }
        },
    },

    fk_autocomplete: {
        components: {
            field_content_edit: {
                mixins: [
                    base_field_content_edit_mixin,
                    autocomplete_field_content_edit_mixin,
                    field_fk_content_mixin,
                    field_fk_autocomplete_edit_content_mixin,
                ],
                methods: {
                    /**
                     * Redefinition of '_renderItem' method
                     * of autocomplete_field_content_edit_mixin.
                     */
                    _renderItem(item, search) { /* jshint unused: false */
                        return '<div class="autocomplete-suggestion" data-value="' +
                            item.value_field + '" >' + item.view_field + '</div>';
                    },
                    /**
                     * Redefinition of '_getAutocompleteValue' method
                     * of autocomplete_field_content_edit_mixin.
                     */
                    _getAutocompleteValue(item) {
                        let value = $(item).attr('data-value');
                        let prefetch_value = $(item).text();
                        return {
                            value: value,
                            prefetch_value: prefetch_value,
                        };
                    },
                    /**
                     * Redefinition of '_filterAutocompleteData' method
                     * of autocomplete_field_content_edit_mixin.
                     */
                    _filterAutocompleteData(search_input, response) {
                        let props = this.field.options.additionalProperties;
                        let filters = {
                            limit: guiLocalSettings.get('page_size') || 20,
                        };

                        filters[props.view_field] = search_input;

                        function getDependenceValueAsString(parent_data_object, field_name)
                        {
                            if (!field_name || !parent_data_object.hasOwnProperty(field_name))
                            {
                                return undefined;
                            }
                            let field_dependence_name_array = [];
                            let filds_data_obj = parent_data_object[field_name];
                            for (let index = 0; index < filds_data_obj.length; index++)
                            {
                                field_dependence_name_array.push(filds_data_obj[index].value);
                            }
                            return field_dependence_name_array.join(',');
                        }

                        let field_dependence_data = getDependenceValueAsString(this.$parent.data, props.field_dependence_name);
                        let format_data = {
                            fieldType: this.field.options.format,
                            modelName: this.queryset.model.name,
                            fieldName: this.field.options.name
                        };

                        let all = this.querysets.map(qs => {
                            let signal_obj = {
                                qs: qs,
                                filters: filters,
                            };
                            if (field_dependence_data !== undefined)
                            {
                                signal_obj.field_dependence_name = props.field_dependence_name;
                                signal_obj.filter_name = props.filter_name;
                                signal_obj[props.field_dependence_name] = field_dependence_data;
                            }
                            tabSignal.emit("filter.{fieldType}.{modelName}.{fieldName}".format(format_data), signal_obj);
                            if (!signal_obj.hasOwnProperty('nest_prom'))
                            {
                                return qs.filter(filters).items();
                            } else {
                                return signal_obj.nest_prom;
                            }
                        });

                        Promise.all(all).then(results => {
                            let matches = [];

                            if(this.field.options.default !== undefined) {
                                if(typeof this.field.options.default !== 'object') {
                                    matches.push({
                                        value_field: this.field.options.default,
                                        view_field: this.field.options.default,
                                    });
                                } else {
                                    matches.push(this.field.options.default);
                                }
                            }

                            results.forEach(instances => {
                                instances.forEach(instance => {
                                    matches.push({
                                        value_field: instance.data[props.value_field],
                                        view_field: instance.data[props.view_field],
                                    });
                                });
                            });

                            response(matches);

                        }).catch(error => {
                            debugger;
                            console.error(error);
                        });
                    },
                },
            },
        },
    },

    fk_multi_autocomplete: {
        components: {
            field_content_edit: {
                mixins: [
                    base_field_content_edit_mixin,
                    field_fk_content_mixin,
                    field_fk_autocomplete_edit_content_mixin,
                ],
                template: "#template_field_content_edit_fk_multi_autocomplete",
                data() {
                    return {
                        /**
                         * Property, that means value of fk_multi_autocomplete input's
                         * 'disabled' attribute.
                         */
                        disabled: false,
                        /**
                         * Object, that stores all selected
                         * pairs of value_field and view_field values.
                         */
                        values_cache: {},
                        /**
                         * Object, that stores
                         * temporary values of value_field and view_field:
                         * value that were selected in modal window, but was not saved.
                         */
                        tmp_field_value: {
                            value_val: undefined,
                            view_val: undefined,
                        },
                        /**
                         * Property, that stores Queryset for modal window list.
                         */
                        queryset: undefined,
                    };
                },
                created() {
                    this.queryset = this.field.getAppropriateQuerySet(this.data, this.querysets);

                    if(this.value) {
                        this.setTmpValue(this.value.value, this.value.prefetch_value);
                    }

                    if(this.value === undefined && this.field.options.enable_button) {
                        this.disabled = this.field.options.enable_button;
                    }
                },
                watch: {
                    /**
                     * Hook, that handles changes of value_field value.
                     * Updates tmp values.
                     * @param {string, number} value Field's value.
                     */
                    value(value) {
                        if(!value) {
                            this.cleanTmpValue();
                            return;
                        }

                        this.setTmpValue(this.value.value, this.value.prefetch_value);
                    }
                },
                computed: {
                    /**
                     * Property that contains names of value_field and view_field.
                     */
                    field_props() {
                        return {
                            value_field: this.field.options.additionalProperties.value_field,
                            view_field: this.field.options.additionalProperties.view_field,
                        };
                    },
                    /**
                     * Property that contains tmp values of value_field and view_field.
                     */
                    field_value() {
                        return  {
                            value: this.tmp_field_value.value_val,
                            view: this.tmp_field_value.view_val,
                        };
                    },
                    /**
                     * Property returns value,
                     * that would be shown in fk_multi_autocomplete input.
                     */
                    val() {
                        if(this.disabled) {
                            return "Field is disabled";
                        }

                        return this._val;
                    },
                    /**
                     * Property returns fk_multi_autocomplete list's queryset.
                     */
                    qs() {
                        return this.queryset;
                    },
                    /**
                     * Property with options for modal window.
                     */
                    modal_options() {
                        return {
                            qs: this.qs,
                            field_props: this.field_props,
                            field_value: this.field_value,
                        };
                    },
                },
                methods: {
                    /**
                     * Method, that changes value of property 'this.disabled' to opposite.
                     */
                    toggleEnableField() {
                        this.disabled = !this.disabled;
                        this.$emit('proxyEvent', 'cleanValue');
                    },
                    /**
                     * Method, that adds
                     * pair of value_field and view_field values to cache.
                     * @param {string, number} value Value of value_field.
                     * @param {string, number} view Value of view_field.
                     */
                    addValueToCache(value, view) {
                        this.values_cache[value] = {
                            value_val: value,
                            view_val: view,
                        };
                    },
                    /**
                     * Method, that sets tmp values
                     * to pair of value_field and view_field.
                     * @param {string, number} value Value of value_field.
                     * @param {string, number} view Value of view_field.
                     */
                    setTmpValue(value, view) {
                        this.tmp_field_value.value_val = value;
                        this.tmp_field_value.view_val = view;
                    },
                    /**
                     * Method, that resets tmp values: sets them equal to real values of
                     * value_field and view_field.
                     */
                    cleanTmpValue() {
                        if(this.value && typeof this.value == 'object') {
                            return this.setTmpValue(
                                this.value.value, this.value.prefetch_value,
                            );
                        }
                        return this.setTmpValue();
                    },
                    /**
                     * Method, that sets new tmp values and adds them to cache.
                     * @param {object} opt Object with new tmp values.
                     */
                    changeTmpValue(opt) {
                        if(opt.value_val == this.tmp_field_value.value_val &&
                            opt.view_val == this.tmp_field_value.view_val) {
                            this.setTmpValue(undefined, undefined);

                        } else {
                            this.setTmpValue(opt.value_val, opt.view_val);
                            this.addValueToCache(opt.value_val, opt.view_val);
                        }

                    },
                    /**
                     * Method, that calls setValueInStore of parent field Vue component.
                     */
                    setValueInStore() {
                        let new_value = {
                            value:  this.tmp_field_value.value_val,
                            prefetch_value:  this.tmp_field_value.view_val
                        };

                        if(new_value.value === undefined &&
                            new_value.prefetch_value === undefined) {
                            new_value = undefined;
                        }

                        this.$emit('proxyEvent', 'setValueInStore', new_value);
                    },
                    /**
                     * Method, that sets new object to queryset property.
                     * @param {object} qs QuerySet instance.
                     */
                    updateQuerySet(qs) {
                        this.queryset = qs;
                    }
                },
                components: {
                    /**
                     * Vue component for button, that enables/disables field.
                     */
                    field_enable_button: {
                        mixins: [base_field_button_mixin],
                        props: ['disabled', 'field'],
                        data() {
                            return {
                                icon_classes: ['fa', 'fa-power-off'],
                                event_handler: 'toggleEnableField',
                                help_text: 'Enable/disable field',
                            };
                        },
                        created() {
                            this.handleDisabled(this.disabled);
                        },
                        watch: {
                            disabled(disabled) {
                                this.handleDisabled(disabled);
                            }
                        },
                        methods: {
                            /**
                             * Method, that handles changes of disabled prop.
                             * @param {boolean} disabled.
                             */
                            handleDisabled(disabled) {
                                if(disabled) {
                                    this.icon_styles.color = '#00c0ef';
                                } else {
                                    delete this.icon_styles.color;
                                }

                                this.icon_styles = { ...this.icon_styles };
                            }
                        },
                    },
                    /**
                     * Vue component for fk_multi_autocomplete modal window with instances,
                     * that could be chosen.
                     */
                    field_fk_multi_autocomplete_modal: {
                        mixins: [base_modal_window_for_instance_list_mixin],
                        template: "#template_fk_multi_autocomplete_modal",
                        computed: {
                            /**
                             * Property, that returns qs for modal window.
                             */
                            qs() {
                                return this.options.qs;
                            },
                            /**
                             * Property, that returns field_props.
                             */
                            field_props() {
                                return this.options.field_props;
                            },
                            /**
                             * Property, that returns field_value.
                             */
                            field_value() {
                                return this.options.field_value;
                            },
                        },
                        methods: {
                            /**
                             * Method, that opens modal window.
                             */
                            open() {
                                let filters = this.generateFilters();

                                this.updateInstances(filters);
                            },
                            /**
                             * Method, that closes modal window.
                             */
                            close() {
                                this.$emit('cleanTmpValue');
                                this.show_modal = false;
                            },
                            /**
                             * Method, that emits changeValue event of parent component.
                             */
                            changeValue(opt) {
                                this.$emit('changeValue', opt);
                            },
                            /**
                             * Method, that emits setNewValue event of parent component.
                             */
                            setNewValue() {
                                this.$emit('setNewValue');
                                this.close();
                            },
                            /**
                             * Method - callback for 'updateInstances' method.
                             * @param {object} qs New QuerySet object.
                             */
                            onUpdateInstances(qs) {
                                this.$emit('updateQuerySet', qs);
                            },

                        },
                    },
                },

            },
        },
    },

    color: {
        components: {
            field_content_readonly: {
                mixins: [base_field_content_readonly_mixin, color_field_content_mixin],
            },
            field_content_edit: {
                mixins: [base_field_content_edit_mixin, color_field_content_mixin],
            },
        },
    },

    inner_api_object: {
        data: function () {
            return {
                wrapper_classes_list: {
                    base: "form-group " + addCssClassesToElement(
                        'guiField', this.field.options.name, this.field.options.format || this.field.options.type,
                    ),
                    grid: "col-lg-12 col-xs-12 col-sm-12 col-md-12",
                },
            };
        },
        components: {
            field_content_readonly: {
                mixins: [
                    base_field_content_readonly_mixin,
                    field_inner_api_object_content_mixin,
                ],
                template: "#template_field_content_readonly_inner_api_object",
            },
            field_content_edit: {
                mixins: [
                    base_field_content_edit_mixin,
                    field_inner_api_object_content_mixin,
                ],
                template: "#template_field_content_edit_inner_api_object",
                methods: {
                    setValueInStore(value, item, field) {
                        let new_value = $.extend(true, {}, this.value);

                        if(!new_value[item]) {
                            new_value[item] = {};
                        }

                        new_value[item][field] = value;
                        this.$emit('proxyEvent', 'setValueInStore', new_value);
                    },
                },
            },
        },
    },

    dynamic: {
        template: "#template_field_dynamic",
        data() {
            return {
                /**
                 * Property, that stores real field of current dynamic field.
                 */
                realField: undefined,
                /**
                 * Property, that stores previous instance of real field of current dynamic field.
                 */
                previous_realField: undefined,
                /**
                 * Property, that stores previous parent values.
                 * It's needed for optimization of realField regeneration.
                 */
                parent_values: {},
            };
        },
        created() {
            this.realField = this.field.getRealField(this.data);
            this.parent_values = this.field._getParentValues(this.data);
        },
        watch: {
            /**
             * Hook, that checks: is previous parent_values different from new data.
             * If they are different, realField will be regenerated.
             * @param {object} data New data.
             */
            'data': function(data) {
                for(let key in this.parent_values) {
                    if(data[key] !== this.parent_values[key]) {
                        this.parent_values = this.field._getParentValues(data);
                        this.previous_realField = this.realField;
                        this.realField = this.field.getRealField(data);

                        if(this.realField.options && this.value !== undefined) {
                            if(this.realField.options.save_value === false) {
                                this.cleanValue();
                            } else if(this.realField.options.save_value === true) {

                            } else if(this.previous_realField.options && this.realField.options.format !== this.previous_realField.options.format) {
                                this.cleanValue();
                            }
                        }
                    }
                }
            }
        },
    },

    hidden: {
        template: '#template_field_hidden',
    },

    form: {
        data() {
            return {
                wrapper_classes_list: {
                    base: "form-group " + addCssClassesToElement(
                        'guiField', this.field.options.name, this.field.options.format || this.field.options.type,
                    ),
                    grid: "col-lg-12 col-xs-12 col-sm-12 col-md-12",
                },
            };
        },
        template: '#template_field_form',
        computed: {
            /**
             * Property, that stores wrapper_opt prop for form's fields.
             */
            form_wrapper_opt() {
                return $.extend(true, {}, this.wrapper_opt, {
                    readOnly: false,
                    use_prop_data: true,
                });
            },
            /**
             * Property, that stores form's guiField objects.
             */
            realFields() {
                return this.field.generateRealFields();
            },
            /**
             * Property, that returns values of realFields.
             */
            form_value() {
                return this.value;
            }
        },
        methods: {
            /**
             * Method, that saves new value of form's realField.
             * @param {string} realField Name of realField.
             * @param {*} value New value of realField.
             */
            setFormFieldValue(realField, value) {
                let val = $.extend(true, {}, this.value || {});

                val[realField] = value;

                this.setValueInStore(val);

            },
            /**
             * Redefinition of 'handleValue' method of base guiField.
             * @param {object} data
             */
            handleValue: function(data) {
                return data[this.field.options.name];
            },
            /**
             * Redefinition of 'getRepresentValue' method of base guiField.
             * @param {object} data
             */
            getRepresentValue: function(data) {
                return data[this.field.options.name];
            },
        },
    },

    button: {
        template: '#template_field_button',
        methods: {
            /**
             * Method, that handles onclick event.
             */
            onClickHandler() {
                if(this.field.options.onclick) {
                    this.field.options.onclick();
                }
            },
        },
    },

    string_array: {
        components: {
            field_list_view: {
                mixins: [base_field_list_view_mixin],
                template: "#template_field_part_list_view_string_array",
            },
        },
    },
};

/**
 * Setting of global Vue filter - capitalize.
 */
Vue.filter('capitalize', function (value) {
    if (!value) {
        return '';
    }
    value = value.toString();
    return value.charAt(0).toUpperCase() + value.slice(1);
});
/**
 * Setting of global Vue filter - split - replacing "_" on " ".
 */
Vue.filter('split', function (value) {
    if (!value) {
        return '';
    }
    return value.replace(/_/g, " ");
});
