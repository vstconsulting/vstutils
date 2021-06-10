<template>
    <BaseListModal
        class="add-child-modal"
        :qs="queryset"
        :title="($t('add') + ' ' + $t('child instances')) | capitalize"
        apply-button-text="Add"
        @apply="addSelected"
    >
        <template #activator="{ openModal }">
            <OperationButton
                :title="$t('add') | capitalize"
                classes="btn btn-primary btn-operation-add"
                icon-classes="fa fa-folder-open"
                @clicked="openModal"
            />
        </template>
    </BaseListModal>
</template>

<script>
    import { formatPath, joinPaths } from '../../utils';
    import OperationButton from '../common/OperationButton.vue';
    import { guiPopUp, pop_up_msg } from '../../popUp';
    import { Model, ModelClass } from '../../models';
    import StringField from '../../fields/text/StringField.js';
    import BaseListModal from './BaseListModal';

    @ModelClass()
    class AppendNestedModel extends Model {
        static declaredFields = [new StringField({ name: 'id' })];
    }

    /**
     * Component for modal window with list of child instances,
     * that can be added to the parents list.
     */
    export default {
        name: 'AddChildModal',
        components: { BaseListModal, OperationButton },
        props: {
            view: { type: Object, required: true },
        },
        data() {
            return {
                queryset: this.view.nestedQueryset.clone({
                    url: formatPath(this.view.nestedQueryset.url, this.$route.params),
                }),
            };
        },
        methods: {
            addSelected(instances) {
                for (const instance of instances) {
                    this.addChildToParent(instance.getPkValue());
                }
            },
            async addChildToParent(instanceId) {
                const qs = this.view.objects.clone({
                    url: formatPath(this.view.objects.url, this.$route.params),
                });
                const path = this.view.deepNestedParentView
                    ? joinPaths(
                          this.view.deepNestedParentView.path,
                          instanceId,
                          this.view.deepNestedParentView.deepNestedViewFragment,
                      )
                    : qs.getDataType();

                try {
                    await qs.execute({
                        method: 'post',
                        path,
                        data: new AppendNestedModel({ id: instanceId }),
                    });
                    guiPopUp.success(this.$t(pop_up_msg.instance.success.add, [this.$t(this.view.title)]));
                } catch (error) {
                    let str = this.$app.error_handler.errorToString(error);
                    let srt_to_show = this.$t(pop_up_msg.instance.error.add, [this.$t(this.view.title), str]);
                    this.$app.error_handler.showError(srt_to_show, str);
                }
            },
        },
    };
</script>

<style scoped>
    .btn-operation-add {
        order: -10;
        margin-right: 5px;
    }
</style>
