<template>
    <div style="display: inline-block;">
        <Modal v-show="showModal" @close="close" :opt="{ footer: false }">
            <template v-slot:header>
                <h3>{{ $t(info.title.toLowerCase()) | capitalize }}</h3>
            </template>
            <template v-slot:body>
                <h4 class="with_bottom_border">{{ $tc('version', 2) | capitalize }}</h4>
                <ul>
                    <li v-for="(item, idx) in info['x-versions']" :key="idx">
                        <b>{{ $t(idx).toLowerCase() }}:</b>
                        {{ item }}
                    </li>
                </ul>
                <template v-for="(item, idx) in info['x-links']">
                    <h4 class="with_bottom_border" style="margin-top: 20px;" :key="`header-${idx}`">
                        {{ $t(idx.toLowerCase()) | capitalize }}
                    </h4>
                    <ul :key="`list-${idx}`">
                        <template v-if="isArray(item)">
                            <li v-for="(prop, idx) in item" :key="idx">
                                <a :href="prop.url" target="_blank" rel="noreferrer">
                                    {{ $t(prop.name.toLowerCase()) | capitalize }}
                                </a>
                            </li>
                        </template>
                        <template v-else>
                            <li>
                                <a :href="item.url" target="_blank" rel="noreferrer">
                                    {{ $t(item.name.toLowerCase()) | capitalize }}
                                </a>
                            </li>
                        </template>
                    </ul>
                </template>
            </template>
        </Modal>
        <a href="#" @click.stop.prevent="open" class="help-text-data">
            <span class="fa fa-question-circle"></span>
            {{ $t('app info') | capitalize }}
        </a>
    </div>
</template>

<script>
    import ModalWindowAndButtonMixin from '../../../fields/ModalWindowAndButtonMixin.js';
    import Modal from './Modal.vue';

    export default {
        name: 'HelpModal',
        components: { Modal },
        mixins: [ModalWindowAndButtonMixin],
        data() {
            return {
                info: app.api.openapi.info,
            };
        },
        methods: {
            isArray(item) {
                return Array.isArray(item);
            },
        },
    };
</script>

<style scoped></style>
