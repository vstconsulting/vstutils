<template>
    <li class="nav-item" :class="{ 'menu-open': isOpen }" @click.stop="clickHandler">
        <!-- Internal link -->
        <router-link v-if="to" :to="to" class="nav-link" exact-active-class="active">
            <i v-if="icon" class="nav-icon" :class="icon" />
            <p>
                {{ $st(name) }}
                <i v-if="hasSublinks" class="right fas fa-angle-left" />
            </p>
        </router-link>

        <!-- External link -->
        <a v-else-if="href" :href="href" class="nav-link">
            <i v-if="icon" class="nav-icon" :class="icon" />
            <p>
                {{ $st(name) }}
                <i v-if="hasSublinks" class="right fas fa-angle-left" />
            </p>
        </a>

        <!-- Empty action -->
        <a v-else-if="emptyAction" href="#" class="nav-link" @click.prevent="executeEmptyAction">
            <i v-if="icon" class="nav-icon" :class="icon" />
            <p>
                {{ $st(name) }}
                <i v-if="hasSublinks" class="right fas fa-angle-left" />
            </p>
        </a>

        <!-- Item that has nothing -->
        <a v-else class="nav-link cursor-pointer">
            <i v-if="icon" class="nav-icon" :class="icon" />
            <p>
                {{ $st(name) }}
                <i v-if="hasSublinks" class="right fas fa-angle-left" />
            </p>
        </a>

        <!-- Children -->
        <ul v-if="hasSublinks" class="nav nav-treeview">
            <SidebarItem v-for="(link, idx) in sublinks" :key="idx" v-bind="link" @open="onOpen" />
        </ul>
    </li>
</template>

<script setup lang="ts">
    import { computed, ref, onMounted } from 'vue';
    import { MenuItem, hideSidebar } from './utils';
    import { RawLocation } from 'vue-router';
    import type { Action } from '../../../views';
    import { getApp } from '../../../utils';

    const props = defineProps<{
        name: string;
        to?: RawLocation;
        href?: string;
        sublinks?: MenuItem[];
        icon?: string | string[];
        emptyAction?: Action;
    }>();

    const emit = defineEmits(['open']);

    const app = getApp();

    const hasSublinks = computed(() => (props.sublinks?.length || 0) > 0);
    const isOpen = ref(false);

    onMounted(() => {
        if (props.to) {
            // Open parent links if current link is active
            const router = app.router;
            if (router.resolve(props.to).route.fullPath === router.currentRoute.fullPath) {
                emit('open');
            }
        }
    });

    function onOpen() {
        if (!isOpen.value) {
            isOpen.value = true;
        }
        emit('open');
    }

    function clickHandler() {
        if (hasSublinks.value) {
            isOpen.value = !isOpen.value;
        } else {
            hideSidebar();
        }
    }

    function executeEmptyAction() {
        app.actions.executeEmpty({ action: props.emptyAction });
    }
</script>
