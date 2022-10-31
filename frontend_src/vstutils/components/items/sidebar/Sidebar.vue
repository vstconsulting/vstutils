<template>
    <div class="sidebar">
        <nav class="mt-2">
            <slot name="top" />

            <ul
                ref="treeview"
                class="nav nav-pills nav-sidebar flex-column"
                data-widget="treeview"
                role="menu"
            >
                <SidebarItem v-for="(item, idx) in menu" :key="idx" v-bind="item" />
            </ul>

            <slot name="bottom" />
        </nav>
    </div>
</template>

<script setup lang="ts">
    import * as $ from 'jquery';
    import SidebarItem from './SidebarItem.vue';
    import { hideSidebar, MenuItem, openSidebar } from './utils';
    import { onMounted } from 'vue';

    defineProps<{
        menu: MenuItem[];
    }>();

    onMounted(() => {
        if ('ontouchstart' in window) {
            // @ts-expect-error jquery has no types
            $('body').swipe({
                swipe: (_event: any, direction: string) => {
                    if (direction === 'right') {
                        openSidebar();
                    } else if (direction === 'left') {
                        hideSidebar();
                    }
                    return true;
                },
                threshold: 150,
                preventDefaultEvents: false,
            });
        }
    });
</script>
