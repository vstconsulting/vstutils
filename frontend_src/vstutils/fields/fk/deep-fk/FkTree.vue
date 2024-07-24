<template>
    <div class="input-group d-flex flex-column">
        <div class="input-group-sm mb-1 d-flex">
            <input
                v-model="treeFilter"
                type="text"
                class="form-control"
                :placeholder="$ts('Search')"
                aria-label="Search"
                style="border-radius: 3px 0px 0px 3px"
            />
            <div class="input-group-append">
                <button
                    class="btn btn-outline-secondary"
                    style="border-radius: 0 3px 3px 0"
                    type="button"
                    @click="treeFilter = ''"
                >
                    <i class="fa fa-times" />
                </button>
            </div>
        </div>
        <div class="selected-items">
            <div
                v-for="selectedItem in selectedItems"
                :key="String(selectedItem.id)"
                class="badge badge-info"
            >
                <span v-for="(part, index) in selectedItem.path" :key="index">
                    {{ part }}
                    <span v-if="index < selectedItem.path.length - 1" class="path-separator">/</span>
                </span>
                <button type="button" class="btn" @click="removeValue(selectedItem.id)">
                    <i class="fa fa-times ml-2" />
                </button>
            </div>
        </div>
        <Tree
            v-if="treeData.length > 0"
            ref="tree"
            :options="treeOptions"
            :filter="treeFilter"
            :data="treeData"
            @click.native.capture="handleClick"
            @node:selected="selected"
            @node:unselected="unselected"
        />
    </div>
</template>

<script setup lang="ts">
    import { ref, computed, onMounted, nextTick, shallowRef } from 'vue';
    // @ts-expect-error liquor-tree has no types
    import * as LiquorTree from 'liquor-tree';
    import { i18n } from '#vstutils/translation';
    import { type Model } from '#vstutils/models';
    import type DeepFKField from './DeepFKField';
    import { type SetFieldValueParams } from '../../base';

    // imports in tests are broken
    const Tree = LiquorTree.default || LiquorTree;

    const props = withDefaults(
        defineProps<{
            value: (number | string | Model)[];
            field: DeepFKField;
            multiple?: boolean;
            minItems?: number;
            maxItems?: number;
        }>(),
        {
            minItems: 0,
            maxItems: Number.POSITIVE_INFINITY,
        },
    );
    const emit = defineEmits<{
        (e: 'update:value', value: (number | string | Model)[], options?: SetFieldValueParams): void;
    }>();

    const initialized = ref(false);
    const tree = ref();
    const treeData = shallowRef<any[]>([]);
    const treeFilter = ref('');
    const treeOptions = {
        multiple: props.multiple,
        filter: {
            emptyText: i18n.t('Nothing found!'),
        },
    };

    function updateValue(value: (number | string | Model)[], options?: SetFieldValueParams) {
        emit('update:value', value, options);
    }

    const selectedItems = computed(() => {
        if (!initialized.value) {
            return [];
        }
        return props.value.map((item) => {
            const id = props.field.getValueFieldValue(item);

            const path: string[] = [];
            let node = tree.value.find((node: any) => node.id === id)[0];
            while (node) {
                path.unshift(String(props.field.getViewFieldValue(node.data.instance)));
                node = node.parent;
            }

            return { id, path };
        });
    });

    function selectOnLoad() {
        for (const item of props.value) {
            const itemId = props.field.getValueFieldValue(item);
            const selection = tree.value.find((node: any) => node.id === itemId);

            let node = selection[0];
            if (node) {
                node.select(true);
                while (node.parent) {
                    node = node.parent;
                    node.expand();
                }
            } else {
                console.warn('Have no node for value', props.field.model, props.field.name, itemId);
            }
        }
        initialized.value = true;
    }

    function handleClick(e: MouseEvent) {
        if (e.target && e.target instanceof Element && !e.target.classList.contains('tree-arrow')) {
            e.stopPropagation();
            const nodeEl = e.target.closest('.tree-node');
            if (nodeEl) {
                const nodeElId = nodeEl.getAttribute('data-id');
                const selection = tree.value.find((node: any) => String(node.id) === nodeElId);
                const node = selection[0];
                if (node) {
                    const isAlreadySelected = props.value.some(
                        (item) => props.field.getValueFieldValue(item) === node.id,
                    );
                    if (isAlreadySelected) {
                        node.unselect();
                        return;
                    }
                    if (props.value.length < props.maxItems) {
                        node.select(props.multiple);
                        return;
                    }
                }
            }
        }
    }

    function selected(node: any) {
        if (!initialized.value) {
            return;
        }
        updateValue(node.tree.selectedNodes.map((node: any) => node.data.instance));
    }

    function unselected(node: any) {
        if (!initialized.value) {
            return;
        }
        updateValue(node.tree.selectedNodes.map((node: any) => node.data.instance));
    }

    function removeValue(id: any) {
        tree.value.find((node: any) => node.id === id).unselect();
    }

    onMounted(async () => {
        const results = await props.field.makeRequest();
        treeData.value = props.field.createTreeData(results);
        if (props.value.length !== 0) {
            updateValue(
                props.value.map((item) => {
                    const pk = props.field.getValueFieldValue(item);
                    return results.find((instance: any) => props.field.getValueFieldValue(instance) === pk);
                }),
                { markChanged: false },
            );
        }
        await nextTick();
        selectOnLoad();
    });
</script>

<style lang="scss" scoped>
    .tree {
        max-height: 500px;
        width: 100%;
        overflow: scroll;
    }

    .dark-mode .tree::v-deep {
        .tree-anchor {
            color: white;
        }
        .has-child:after {
            border-right-color: white;
            border-bottom-color: white;
        }
        .tree-node.selected > .tree-content {
            background-color: #616161;
        }
        .tree-content:hover {
            background-color: #424242;
        }
    }

    .selected-items {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;

        .btn {
            padding: 0;
            line-height: normal;
        }
    }
</style>
