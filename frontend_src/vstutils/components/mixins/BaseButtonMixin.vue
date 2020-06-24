<template>
    <button
        class="btn gui-btn"
        :class="classes"
        @click="onClickHandler"
        v-if="!options.hidden"
        :aria-label="title"
    >
        <template v-if="icon_classes">
            <span :class="icon_classes"></span>
            <span :class="title_classes">{{ title | capitalize | split }}</span>
        </template>
        <template v-else>
            {{ title | capitalize | split }}
        </template>
    </button>
</template>

<script>
    import $ from 'jquery';
    /**
     * Mixin for buttons, that are not link_buttons.
     */
    export default {
        name: 'base_button_mixin',
        props: ['type', 'options', 'look'],
        computed: {
            title() {
                // return this.options.title || this.options.name;
                return this.$t(this.options.title || this.options.name);
            },
            classes() {
                return this.getRepresentationProperty('classes');
            },
            class_with_name() {
                return 'btn-' + this.type + '-' + this.options.name;
            },
            icon_classes() {
                return this.getRepresentationProperty('icon_classes');
            },
            title_classes() {
                return this.getRepresentationProperty('title_classes');
            },
        },
        methods: {
            getPkKeys(path) {
                let pk_keys = path.match(/{[A-z0-9]+}/g);
                if (pk_keys) {
                    return pk_keys.map((pk_key) => pk_key.replace(/^{|}$/g, ''));
                }
                return [];
            },

            getPathParams(path) {
                let pk_key = this.getPkKeys(path).last;
                if (pk_key && this.instance_id) {
                    let params = {};
                    params[pk_key] = this.instance_id;
                    return $.extend(true, {}, this.$route.params, params);
                }
                return this.$route.params;
            },

            onClickHandler(instance_id) {
                if (this.options.method) {
                    return this.doMethod(this.options, instance_id);
                }

                if (this.options.empty) {
                    return this.doEmptyAction(this.options, instance_id);
                }

                if (this.options.path) {
                    return this.goToPath(this.options.path);
                }

                return this.doAction(instance_id);
            },

            doMethod(options, instance_id) {
                this.$root.$emit(
                    'eventHandler-' + this.$root.$children.last._uid,
                    this.options.method,
                    $.extend(true, { instance_id: instance_id }, options),
                );
            },

            goToPath(path_name) {
                this.$router.push({
                    name: path_name,
                    params: this.getPathParams(path_name),
                });
            },

            doAction(instance_id) {
                if (this.options.multi_action) {
                    this.$root.$emit(
                        'eventHandler-' + this.$root.$children.last._uid,
                        this.options.name + 'Instances',
                    );
                } else {
                    this.$root.$emit(
                        'eventHandler-' + this.$root.$children.last._uid,
                        this.options.name + 'Instance',
                        { instance_id: instance_id },
                    );
                }
            },

            doEmptyAction(options, instance_id) {
                let opt = options;
                if (typeof instance_id == 'number' || typeof instance_id == 'string') {
                    opt = $.extend(true, { instance_id: instance_id }, options);
                }
                this.$root.$emit(
                    'eventHandler-' + this.$root.$children.last._uid,
                    'executeEmptyActionOnInstance',
                    opt,
                );
            },

            getRepresentationProperty(name) {
                let property = [];

                if (this.look && this.look[name]) {
                    property = this.look[name];
                }

                if (this.options && this.options[name]) {
                    property = this.options[name];
                }

                return property;
            },
        },
    };
</script>

<style scoped></style>
