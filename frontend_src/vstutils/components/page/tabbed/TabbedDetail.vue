<template>
    <div>
        <div class="card card-primary card-outline card-outline-tabs">
            <div class="card-header p-0 pt-1">
                <ul class="nav nav-tabs" role="tablist">
                    <li class="nav-item">
                        <a
                            class="nav-link"
                            :disabled="!hasPreviousStep"
                            :class="{ disabled: !hasPreviousStep }"
                            @click="goPreviousStep"
                        >
                            <i class="fas fa-chevron-left" />
                        </a>
                    </li>
                </ul>
                <ul class="nav nav-tabs tabs-titles" role="tablist">
                    <li class="spacer" />
                    <li v-for="(tab, idx) in tabs" :key="idx" class="nav-item">
                        <a
                            :id="`tab-label-${idx}`"
                            class="nav-link"
                            :class="{ active: tab.active, disabled: tab.active }"
                            role="tab"
                            :aria-controls="`tab-${idx}`"
                            :aria-selected="tab.active"
                            @click="openTab(idx)"
                        >
                            {{ $t(tab.title) }}
                        </a>
                    </li>
                    <li class="spacer" />
                </ul>
                <ul class="nav nav-tabs" role="tablist">
                    <li class="nav-item">
                        <a
                            class="nav-link"
                            :disabled="!hasNextStep"
                            :class="{ disabled: !hasNextStep }"
                            @click="goNextStep"
                        >
                            <i class="fas fa-chevron-right" />
                        </a>
                    </li>
                </ul>
            </div>
            <div class="card-body">
                <div class="tab-content">
                    <div
                        v-for="(tab, idx) in tabs"
                        :id="`tab-${idx}`"
                        :key="idx"
                        class="tab-pane"
                        :class="{ active: tab.active, show: tab.active }"
                        role="tabpanel"
                        :aria-labelledby="`tab-label-${idx}`"
                    >
                        <div class="fields-container">
                            <component
                                :is="field.getComponent()"
                                v-for="field in tab.fields"
                                :key="field.name"
                                :field="field"
                                :data="data"
                                :error="fieldsErrors && fieldsErrors[field.name]"
                                :type="fieldType"
                                @set-value="setFieldValue"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { computed, toRef } from 'vue';
    import { type Model } from '#vstutils/models';
    import { useTabbedDetailState } from './state';

    const props = defineProps<{
        instance: Model;
        type: 'edit' | 'create' | 'readonly';
    }>();

    const fieldType = computed(() => (props.type === 'readonly' ? 'readonly' : 'edit'));

    const {
        data,
        fieldsErrors,
        goNextStep,
        goPreviousStep,
        hasNextStep,
        hasPreviousStep,
        openTab,
        setFieldValue,
        tabs,
    } = useTabbedDetailState({
        instance: toRef(props, 'instance'),
        requireStepValidation: props.type === 'create',
    });
</script>

<style scoped lang="scss">
    .card-header {
        display: flex;
        justify-content: space-between;
    }

    .spacer {
        flex-grow: 1;
    }

    .tabs-titles {
        flex-grow: 1;
        flex-wrap: nowrap;
        overflow-x: auto;
        overflow-y: hidden;
        display: flex;
        align-items: stretch;
    }

    .fields-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .nav-link {
        height: 100%;
        text-wrap: nowrap;

        &:not(:disabled) {
            cursor: pointer;
        }
    }
</style>
