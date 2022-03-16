<template>
    <BaseListModal
        class="add-child-modal"
        :qs="queryset"
        :title="$u.capitalize($t('add') + ' ' + $t('child instances'))"
        apply-button-text="Add"
        @apply="addSelected"
    >
        <template #activator="{ openModal }">
            <OperationButton
                :title="$u.capitalize($t('add'))"
                classes="btn btn-primary btn-operation-add"
                icon-classes="fa fa-folder-open"
                @click.native="openModal"
            />
        </template>
    </BaseListModal>
</template>

<script>
    import { formatPath } from '../../utils';
    import OperationButton from '../common/OperationButton.vue';
    import { guiPopUp, pop_up_msg } from '../../popUp';
    import { Model, makeModel } from '../../models';
    import StringField from '../../fields/text/StringField.js';
    import BaseListModal from './BaseListModal';

    const AppendNestedModel = makeModel(
        class AppendNestedModel extends Model {
            static declaredFields = [new StringField({ name: 'id' })];
        },
        'AppendNestedModel',
    );

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
                queryset: this.view.nestedQueryset.formatPath(this.$route.params),
            };
        },
        methods: {
            addSelected(instances) {
                for (const instance of instances) {
                    this.addChildToParent(instance.getPkValue());
                }
            },
            async addChildToParent(instanceId) {
                const qs = this.view.objects.formatPath(this.$route.params);
                const path = formatPath(this.view.path, this.queryset.pathParamsValues);
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
