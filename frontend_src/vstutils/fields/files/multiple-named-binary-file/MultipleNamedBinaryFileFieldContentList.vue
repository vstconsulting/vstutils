<template>
    <BootstrapModal styles="width: 90vw; max-width: 1000px" :title="title">
        <ul class="multiple-files-list">
            <li
                v-for="(file, idx) in value"
                :key="idx"
                :title="$t('Download file')"
                style="color: #007bff"
                @click="fileClickHandler(file)"
            >
                <div>
                    <span class="break-word">{{ file.name }}</span>
                </div>
            </li>
        </ul>

        <template #activator="{ openModal }">
            <i :class="classes" style="font-size: 1.5rem" @click.stop="openModal" />
            <p v-if="!value || value.length === 0">{{ title_for_empty_value }}</p>
        </template>
    </BootstrapModal>
</template>

<script>
    import MultipleNamedBinaryFileFieldContentReadonly from './MultipleNamedBinaryFileFieldContentReadonly';
    import BootstrapModal from '../../../components/BootstrapModal.vue';

    export default {
        components: { BootstrapModal },
        mixins: [MultipleNamedBinaryFileFieldContentReadonly],
        computed: {
            classes() {
                if (this.value && this.value?.length > 0) {
                    return 'fas fa-file-alt';
                }
                return '';
            },
            title() {
                return `${this.$t('File list')} (${this.$t(this.field.title)})`;
            },
        },
    };
</script>
