<template>
    <div class="input-group d-flex flex-column">
        <div class="input-group-sm mb-1 d-flex">
            <input
                v-model="treeFilter"
                type="text"
                class="form-control"
                :placeholder="$t('Search')"
                aria-label="Search"
                style="border-radius: 3px 0px 0px 3px"
            />
            <div class="input-group-append">
                <button
                    class="btn btn-outline-secondary"
                    style="border-radius: 0 3px 3px 0"
                    @click="treeFilter = ''"
                >
                    <i class="fa fa-times" />
                </button>
            </div>
        </div>
        <h5 v-if="selectedText" class="mb-1">
            <span class="badge badge-info">
                {{ $t('Selected') }}: {{ selectedText }}
                <i class="fa fa-times ml-2" style="cursor: pointer" @click="removeValue" />
            </span>
        </h5>
        <LiquorTree
            v-if="loaded"
            ref="tree"
            :options="treeOptions"
            :filter="treeFilter"
            :data="treeData"
            @node:selected="selected"
        />
    </div>
</template>

<script>
    import { BaseFieldContentEdit } from '../../base';
    import LiquorTree from 'liquor-tree';

    export default {
        name: 'DeepFK',
        components: {
            LiquorTree,
        },
        mixins: [BaseFieldContentEdit],
        data() {
            return {
                class_list: ['form-control'],
                treeData: [],
                loaded: false,
                treeFilter: '',
                selectedText: '',
                treeOptions: {
                    filter: {
                        emptyText: this.$t('Nothing found!'),
                    },
                },
                onlyLastChild: this.field.onlyLastChild,
                selectedNode: null,
            };
        },
        mounted() {
            this.field.makeRequest().then((results) => {
                this.treeData = this.field.createTreeData(results);
                this.loaded = true;
                if (this.value) {
                    const pk = this.field.getValueFieldValue(this.value);
                    this.setValue(results.find((instance) => this.field.getValueFieldValue(instance) === pk));
                }
                this.$nextTick().then(() => {
                    this.selectOnLoad();
                });
            });
        },
        methods: {
            selectOnLoad() {
                if (!this.value) return;
                this.selectedNode = this.$refs.tree
                    .findAll(this.field.getViewFieldValue(this.value))
                    .find((node) => node.id === this.field.getValueFieldValue(this.value));
                this.selectedNode.select();
                let node = this.selectedNode;
                while (node.parent) {
                    node = node.parent;
                    node.expand();
                }
            },
            selected(node) {
                if (!this.onlyLastChild || !node.children.length) {
                    this.setValue(node.data.instance);
                    this.selectedNode = node;
                    this.selectedText = node.data.text;
                }
            },
            removeValue() {
                this.setValue(this.field.getInitialValue());
                this.selectedNode.unselect();
                this.selectedNode = null;
                this.selectedText = '';
            },
        },
    };
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
</style>
