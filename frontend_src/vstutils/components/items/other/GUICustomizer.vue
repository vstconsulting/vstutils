<template>
    <div class="p-3 customizer-options">
        <h5>{{ $t('customize application styles') | capitalize }}</h5>
        <hr class="mb-2" />
        <field_choices
            :field="skinField"
            :wrapper_opt="{ use_prop_data: true }"
            :prop_data="{ skin_name: skin_name }"
            @setValueInStore="skinOnChangeHandler"
        />
        <hr class="mb-2" />
        <div class="customize-skin-options">
            <field_form
                :field="formField"
                :wrapper_opt="{ use_prop_data: true }"
                :prop_data="{ skin_settings: skin_settings }"
                @setValueInStore="formOnChangeHandler"
            />
        </div>
    </div>
</template>

<script>
    import { guiCustomizer } from '../../../guiCustomizer';

    export default {
        name: 'gui_customizer',
        data() {
            return {
                customizer: guiCustomizer,
            };
        },

        created() {
            this.customizer.init();
        },

        computed: {
            /**
             * Property, that returns current skin settings.
             */
            skin_settings() {
                return this.customizer.skin.settings;
            },
            /**
             * Property, that returns current skin name.
             */
            skin_name() {
                return this.customizer.skin.name;
            },
            /**
             * Property, that returns guiFields.form instance,
             * that is aimed to be form for skin settings.
             */
            formField() {
                return this.customizer.formField;
            },
            /**
             * Property, that returns guiFields.choices instance,
             * that is aimed to be field for skin selecting.
             */
            skinField() {
                return this.customizer.skinField;
            },
        },

        methods: {
            /**
             * Method - handler for formField's onChange event.
             * @param {object} value New form value.
             */
            formOnChangeHandler(value) {
                return this.customizer.setSkinSettings(value);
            },
            /**
             * Method - handler for skinField's onChange event.
             * @param {string} skin New skin.
             */
            skinOnChangeHandler(skin) {
                return this.customizer.setSkin(skin);
            },
        },
    };
</script>

<style scoped></style>
