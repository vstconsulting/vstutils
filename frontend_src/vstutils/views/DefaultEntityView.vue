<template>
    <div style="display: contents;">
        <preloader :show="loading"></preloader>

        <div class="content-wrapper-2" v-if="error">
            <section class="content-header">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-lg-6">
                            <h1>
                                <span
                                    @click="goToHistoryRecord(-1)"
                                    class="btn btn-default btn-previous-page"
                                >
                                    <span class="fa fa-arrow-left"></span>
                                </span>
                                <span class="h1-header">
                                    {{ $t('error') | capitalize }} {{ error.status }}
                                </span>
                            </h1>
                        </div>
                        <div class="col-lg-6">
                            <breadcrumbs :breadcrumbs="breadcrumbs"></breadcrumbs>
                        </div>
                    </div>
                </div>
            </section>
            <section class="content">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-lg-12">
                            <div class="error-text-wrapper">
                                <p class="text-center error-p">{{ error_data }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <div class="content-wrapper-2" v-if="response">
            <section class="content-header">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-lg-6">
                            <h1>
                                <span
                                    @click="goToHistoryRecord(-1)"
                                    class="btn btn-default btn-previous-page"
                                >
                                    <span class="fa fa-arrow-left"></span>
                                </span>
                                <span class="h1-header">
                                    {{ $t(title.toLowerCase()) | capitalize | split }}
                                </span>
                            </h1>
                        </div>
                        <div class="col-lg-6">
                            <breadcrumbs :breadcrumbs="breadcrumbs"></breadcrumbs>
                        </div>
                    </div>
                </div>
            </section>
            <section class="content">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-lg-12 buttons-row-wrapper">
                            <gui_buttons_row :view="view" :data="data" :opt="opt"></gui_buttons_row>
                        </div>
                    </div>
                    <div class="row">
                        <section class="col-lg-12">
                            <template v-if="view.schema.type == 'list'">
                                <component
                                    :is="content_body_component"
                                    :data="data"
                                    :view="view"
                                    :opt="opt"
                                ></component>
                                <template v-if="multi_actions_button_component">
                                    <component
                                        :is="multi_actions_button_component"
                                        :data="data"
                                        :view="view"
                                        :opt="opt"
                                    ></component>
                                </template>
                            </template>
                            <template v-else>
                                <div class="card card-info">
                                    <div class="card-header with-border card-header-custom">
                                        <component
                                            :is="content_header_component"
                                            :data="data"
                                            :view="view"
                                            :opt="opt"
                                        ></component>
                                        <button
                                            type="button"
                                            class="btn btn-card-tool btn-sm btn-light btn-icon btn-right"
                                            @click="toggleCardCollapsed"
                                            aria-label="toggle"
                                            v-if="card_collapsed_button"
                                        >
                                            <i
                                                class="fa"
                                                :class="card_collapsed ? 'fa-plus' : 'fa-minus'"
                                            ></i>
                                        </button>
                                    </div>
                                    <transition name="fade">
                                        <div
                                            class="card-body card-body-custom"
                                            :class="'card-body-' + view.schema.type"
                                            v-show="!card_collapsed"
                                        >
                                            <component
                                                :is="content_body_component"
                                                :data="data"
                                                :view="view"
                                                :opt="opt"
                                            ></component>
                                        </div>
                                    </transition>
                                    <transition name="fade">
                                        <div
                                            class="card-footer clearfix"
                                            v-if="content_footer_component && !card_collapsed"
                                        >
                                            <component
                                                :is="content_footer_component"
                                                :data="data"
                                                :view="view"
                                                :opt="opt"
                                            ></component>
                                        </div>
                                    </transition>
                                </div>
                                <component
                                    :is="content_additional"
                                    :data="data"
                                    :view="view"
                                    :opt="opt"
                                    v-if="content_additional"
                                ></component>
                            </template>
                        </section>
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>

<script>
    export default {};
</script>
