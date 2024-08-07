<template>
    <div>
        <div class="csv-table" :style="requiredErrorTextVar">
            <FileFieldSelector
                :field="field"
                :hideable="hideable"
                :clearable="value && value.length"
                :text="text"
                @input="updateFile($event[0])"
                @clear="clear"
                @hide="emit('hide-field')"
            />
            <div class="m-0">
                <DataTable
                    :model="rowModel"
                    :min-column-width="field.minColumnWidth"
                    :rows="rows"
                    @change="emit('set-value', $event)"
                />
            </div>
        </div>
        <ConfirmModal
            ref="confirmationModalRef"
            :message="$ts('Your changes will be deleted. Are you sure?')"
            @confirm="confirmClear"
            @reject="rejectClear"
        />
    </div>
</template>
<script setup lang="ts">
    import { computed, defineAsyncComponent, ref } from 'vue';

    import { i18n } from '#vstutils/translation';
    import { readFileAsText } from '#vstutils/utils';
    import { FieldEditPropsDef } from '#vstutils/fields/base';
    import ConfirmModal from '#vstutils/components/common/ConfirmModal.vue';
    import FileFieldSelector from '../FileFieldSelector.vue';

    import type { ExtractRepresent, FieldEditPropsDefType } from '#vstutils/fields/base';
    import type { CsvFileField } from './index';

    const DataTable = defineAsyncComponent(() => import('./DataTable.vue'));

    const props = defineProps(FieldEditPropsDef as FieldEditPropsDefType<CsvFileField>);

    const emit = defineEmits<{
        (event: 'set-value', value: ExtractRepresent<CsvFileField> | null | undefined): void;
        (event: 'hide-field'): void;
        (event: 'clear'): void;
    }>();

    const confirmationModalRef = ref<InstanceType<typeof ConfirmModal>>();

    const rowModel = computed(() => props.field.rowModel!);
    const rows = computed(() => props.value || []);
    const requiredErrorTextVar = computed(() => {
        return `--required-error-text: "${i18n.tc('Column is required!')}"`;
    });
    const text = computed(() => {
        return i18n.tc('file n selected', props.value ? 1 : 0);
    });

    function clear() {
        confirmationModalRef.value!.openModal();
    }
    function confirmClear() {
        emit('clear');
        confirmationModalRef.value!.closeModal();
    }
    function rejectClear() {
        confirmationModalRef.value!.closeModal();
    }
    async function updateFile(file: File) {
        if (!file) {
            emit('set-value', null);
            return;
        }
        const content = await readFileAsText(file);
        const data = props.field.parseFile(content);
        if (data) {
            emit('set-value', data);
        }
    }
</script>

<style scoped>
    .btn {
        margin: 5px;
    }
    /*To keep file buttons the same size*/
    .field-button {
        height: 36px;
    }
    .file-buttons {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        flex-grow: 1;
        margin-bottom: 0;
        padding-bottom: 0;
    }
</style>
