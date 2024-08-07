<template>
    <BootstrapModal ref="modal" :title="$ts(action.title)">
        <template #activator="{ openModal }">
            <button class="dropdown-item" type="button" @click="openModal" v-text="$st(action.title)" />
        </template>

        <div class="container">
            <ModelFields
                :data="store.sandbox"
                :model="store.model"
                :editable="true"
                :fields-errors="store.fieldsErrors"
                :hide-read-only="true"
                @set-value="store.setFieldValue"
            />
        </div>

        <template #footer>
            <button type="button" class="btn btn-primary" @click="execute">
                {{ $t('Execute') }}
            </button>
        </template>
    </BootstrapModal>
</template>

<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { defineStore } from 'pinia';
    import { useRoute } from 'vue-router/composables';

    import { guiPopUp, pop_up_msg } from '#vstutils/popUp';
    import { i18n } from '#vstutils/translation';
    import { formatPath, parseResponseMessage, getUniqueId, getApp } from '#vstutils/utils';
    import { createActionStore } from '#vstutils/store/helpers';
    import BootstrapModal from '#vstutils/components/BootstrapModal.vue';
    import ModelFields from '#vstutils/components/page/ModelFields.vue';

    import type { Action, ListView, ViewStore } from '#vstutils/views';

    const props = defineProps<{
        action: Action;
    }>();
    const app = getApp();
    const modal = ref<InstanceType<typeof BootstrapModal> | null>(null);

    const useStore = defineStore(`notEmptyMultiActionModal_${getUniqueId()}`, () =>
        createActionStore(props.action.view!),
    );
    const store = useStore();
    const route = useRoute();

    const view = computed(() => props.action.view!);

    function getRequestPaths() {
        const pageStore = app.store.page as ViewStore<ListView>;
        return pageStore.instances
            .filter((instance) => pageStore.selection.includes(instance.getPkValue()))
            .map((instance) => formatPath(view.value.path, route.params, instance));
    }

    async function execute() {
        const instance = store.instance!;
        try {
            instance._validateAndSetData();
        } catch (e) {
            app.error_handler.defineErrorAndShow(e);
            return;
        }
        const method = view.value.method;
        const headers = { 'content-type': 'application/json' };
        const responses = await Promise.allSettled(
            getRequestPaths().map((path) =>
                app.api.makeRequest({
                    method,
                    headers,
                    path,
                    data: instance._getInnerData(),
                    useBulk: instance.shouldUseBulk(method),
                    auth: view.value.isSecure,
                }),
            ),
        );
        store.instance!.sandbox.markUnchanged();
        for (const response of responses) {
            if (response.status === 'fulfilled') {
                guiPopUp.success(
                    i18n.ts(pop_up_msg.instance.success.execute, [
                        i18n.t(view.value!.title),
                        parseResponseMessage(response.value.data),
                    ]),
                );
            } else {
                const str = app.error_handler.errorToString(response.reason);
                const srt_to_show = i18n.ts(pop_up_msg.instance.error.execute, [
                    i18n.t(view.value.title),
                    str,
                ]);
                app.error_handler.showError(srt_to_show, str);
            }
        }
        app.store.page.fetchData();
        modal.value!.close();
    }
</script>
