<template>
    <div>
        <div class="csv-table" :style="requiredErrorTextVar">
            <FileSelector
                :show-hide-button="hideable"
                :has-value="value && value.length"
                :text="text"
                @read-file="updateFile($event[0])"
                @clear="clear"
                @hide="$emit('hide-field', field)"
            />
            <div class="m-0">
                <DataTable
                    :config="tableConfig"
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
    import { computed, ref } from 'vue';

    import { guiPopUp } from '@/vstutils/popUp';
    import { i18n } from '@/vstutils/translation';
    import { readFileAsText } from '@/vstutils/utils';
    import ConfirmModal from '@/vstutils/components/common/ConfirmModal.vue';
    import DataTable from './DataTable.vue';
    import FileSelector from '../FileSelector.vue';

    import type { ParseResult } from 'papaparse';
    import type { ExtractRepresent } from '@/vstutils/fields/base';
    import type { CsvFileField } from './index';

    const props = defineProps<{
        field: CsvFileField;
        value: ExtractRepresent<CsvFileField> | null | undefined;
        hideable: boolean;
    }>();

    const emit = defineEmits<{
        (event: 'set-value', value: ExtractRepresent<CsvFileField> | null | undefined): void;
        (event: 'hide-field'): void;
        (event: 'clear'): void;
    }>();

    const confirmationModalRef = ref<any>(null);

    let parsed: ParseResult<unknown[]> = {
        data: [],
        errors: [],
        meta: {
            delimiter: '',
            linebreak: '',
            aborted: false,
            truncated: false,
            cursor: 0,
        },
    };
    const tableConfig = props.field.getTableConfig();

    const rows = computed(() => {
        return (props.value || []) as Record<string, unknown>[];
    });
    const requiredErrorTextVar = computed(() => {
        return `--required-error-text: "${i18n.tc('Column is required!')}"`;
    });
    const text = computed(() => {
        return i18n.tc('file n selected', props.value ? 1 : 0);
    });

    function clear() {
        confirmationModalRef.value.openModal();
    }
    function confirmClear() {
        emit('clear');
        confirmationModalRef.value.closeModal();
    }
    function rejectClear() {
        confirmationModalRef.value.closeModal();
    }
    async function updateFile(file: File) {
        if (!file) {
            emit('set-value', null);
            return;
        }
        const content = await readFileAsText(file);
        const columnsNames = tableConfig.slice(1).map((column) => column.prop);
        parsed = props.field.parseFile(content);
        if (parsed.errors.length > 0) {
            guiPopUp.error();
            console.error(parsed);
            return;
        }
        const value = parsed.data.map((el) => {
            return el.reduce((acc: Record<string, unknown>, n, i) => {
                acc[columnsNames[i]] = n;
                return acc;
            }, {});
        });
        emit('set-value', value);
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
