<template>
    <div class="form-group">
        <label for="hideNotRequiredSelector">{{ ($t('add') + ' ' + $t('field')) | capitalize }}</label>
        <select
            id="hideNotRequiredSelector"
            ref="select"
            class="form-control custom-select"
            :disabled="fields.length === 0"
            @change.prevent="handleSelect"
        >
            <option value="__default" disabled selected>
                {{ ($t('select') + ' ' + $t('field')) | capitalize }}
            </option>
            <option v-for="field in fields" :key="field.name" :value="field.name">
                {{ $t(field.title) }}
            </option>
        </select>
    </div>
</template>

<script>
    export default {
        name: 'HideNotRequiredSelect',
        props: {
            fields: { type: Array, required: true },
        },
        methods: {
            handleSelect(e) {
                this.$emit('show-field', e.target.value);
                this.$refs.select.value = '__default';
            },
        },
    };
</script>
