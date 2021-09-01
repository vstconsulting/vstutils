<template>
    <div class="form-group col-lg-3 col-xs-12 col-md-6 col-sm-6">
        <div class="btn-group" role="group">
            <button
                type="button"
                class="btn btn-default dropdown-toggle"
                :aria-label="options.title"
                data-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="true"
            >
                {{ options.title }}
                <span class="caret" />
            </button>
            <ul class="dropdown-menu dropdown-menu-left">
                <li v-for="(item, idx) in options.samples" :key="idx">
                    <a
                        href="#"
                        class="crontab_li_a"
                        @click.stop.prevent="
                            proxyCrontabEvent('setCrontabElValue', { name: options.name, value: item.value })
                        "
                    >
                        {{ item.view }}
                    </a>
                </li>
            </ul>
        </div>

        <div class="control-label" style="margin-top: 15px">
            <button
                v-for="(el, idx) in values"
                :key="idx"
                class="btn btn-default"
                :class="is_selected(el)"
                :style="styles"
                :aria-label="getLabel(options, el)"
                @click="toggleModelValue(options.name, el.number)"
            >
                {{ getLabel(options, el) }}
            </button>
        </div>
    </div>
</template>

<script>
    /**
     * Vue component for crontab element.
     */
    export default {
        props: {
            options: { type: Object, required: true },
            model: { type: Object, required: true },
        },
        computed: {
            /**
             * Property, that forms values array for template.
             * @return {Array}
             */
            values() {
                let arr = [];

                for (let i = this.options.start; i <= this.options.end; i++) {
                    let obj = {
                        number: i,
                        selected: this.model[this.options.name][i],
                    };
                    arr.push(obj);
                }

                return arr;
            },

            styles() {
                if (this.options.labels) {
                    return 'width: 50%;';
                }

                return 'width: calc(20% - 4px);';
            },
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
                if (element.selected) {
                    return 'selected';
                }

                return '';
            },
            /**
             * Method, that toggle value of model item.
             * @param {string} prop
             * @param {number} number
             */
            toggleModelValue(prop, number) {
                let value = false;

                if (this.model[prop] && this.model[prop][number]) {
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
                if (options.labels && options.labels[el.number]) {
                    return options.labels[el.number];
                }

                return el.number;
            },
        },
    };
</script>
