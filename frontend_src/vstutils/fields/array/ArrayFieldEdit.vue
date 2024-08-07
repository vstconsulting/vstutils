<template>
    <div>
        <select ref="select" class="form-control" multiple style="width: 100%" />

        <div v-if="showItemField" class="item-field-wrapper" style="padding: 0.5rem">
            <button type="button" class="btn btn-danger" @click="closeItemField">
                <i class="fas fa-ban" />
            </button>
            <component
                :is="field.itemField.getComponent()"
                :field="field.itemField"
                :data="newValueData"
                type="edit"
                class="flex-grow-1"
                hide-title
                @set-value="setNewValue"
            />
            <button type="button" class="btn btn-primary" @click="addValue">
                <i class="fas fa-plus" />
            </button>
        </div>
    </div>
</template>

<script>
    import $ from 'jquery';
    import Vue from 'vue';
    import { createUniqueIdGenerator } from '#vstutils/utils';
    import { BaseFieldContentEdit } from '../base';

    const idGenerator = createUniqueIdGenerator();

    export default {
        name: 'ArrayFieldEdit',
        mixins: [BaseFieldContentEdit],
        data() {
            const value = this.value || [];
            return {
                showItemField: false,
                newValue: undefined,
                internalValues: value.map((item) => ({ id: idGenerator(), value: item })),
            };
        },
        computed: {
            newValueData() {
                return { ...this.data, [this.field.name]: this.currentValue };
            },
        },
        watch: {
            internalValues: function (newVal) {
                this.$emit(
                    'set-value',
                    newVal.map((internalValue) => internalValue.value),
                );
            },
        },
        mounted() {
            this.initSelect();
        },
        beforeDestroy() {
            this.destroySelect();
        },
        methods: {
            renderSelection(id) {
                const item = this.internalValues.find((item) => id === item.id);
                if (!item.cachedContent) {
                    if (!item.vm) {
                        item.vm = new Vue({
                            parent: this,
                            mixins: [this.field.itemField.getComponent()],
                            propsData: {
                                field: this.field.itemField,
                                data: { [this.field.itemField.name]: item.value },
                                type: 'readonly',
                                hideTitle: true,
                            },
                        }).$mount();
                    }
                    item.cachedContent = $(item.vm.$el.outerHTML);
                }
                return item.cachedContent;
            },
            initSelect() {
                $(this.$refs.select)
                    .select2({
                        theme: window.SELECT2_THEME,
                        data: this.internalValues.map((item) => ({
                            id: item.id,
                            text: item.id,
                            selected: true,
                        })),
                        templateSelection: (item) => this.renderSelection(item.id),
                    })
                    .on('select2:opening', (event) => {
                        event.preventDefault();
                        this.openItemField();
                    })
                    .on('select2:unselect', (event) => {
                        this.removeValue(event.params.data.id);
                    });
            },
            destroySelect() {
                $(this.$refs.select).select2('destroy').off('select2:opening').off('select2:unselect');
            },
            openItemField() {
                this.newValue = this.field.itemField.getEmptyValue();
                this.showItemField = true;
            },
            closeItemField() {
                this.showItemField = false;
                this.newValue = null;
            },
            setNewValue({ value }) {
                this.newValue = value;
            },
            addValue() {
                const id = idGenerator();
                const value = this.newValue;
                this.internalValues.push({ id, value });
                $(this.$refs.select).append(new Option(id, id, true, true)).trigger('change');
                this.closeItemField();
            },
            removeValue(id) {
                const idx = this.internalValues.findIndex((val) => val.id === id);
                this.internalValues[idx]?.vm?.$destroy();
                this.internalValues.splice(idx);
            },
        },
    };
</script>

<style>
    .field-component.format-array .select2-selection__choice {
        display: flex;
    }
</style>

<style scoped>
    .item-field-wrapper {
        display: flex;
    }
    .item-field-wrapper * + * {
        margin-left: 0.5rem;
    }
</style>
