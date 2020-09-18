<template>
    <div style="display: contents;">
        <preloader :show="loading" />

        <div v-if="error" class="content-wrapper-2">
            <section class="content-header">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-lg-6">
                            <h1>
                                <span
                                    class="btn btn-default btn-previous-page"
                                    @click="goToHistoryRecord(-1)"
                                >
                                    <span class="fa fa-arrow-left" />
                                </span>
                                <span class="h1-header">
                                    {{ $t('error') | capitalize }} {{ error.status }}
                                </span>
                            </h1>
                        </div>
                        <div class="col-lg-6">
                            <breadcrumbs :breadcrumbs="breadcrumbs" />
                        </div>
                    </div>
                </div>
            </section>
            <section class="content">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-lg-12">
                            <div class="error-text-wrapper">
                                <p class="text-center error-p">
                                    {{ error_data }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <div v-if="response" class="content-wrapper-2">
            <section class="content-header">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-lg-6">
                            <h1>
                                <span
                                    class="btn btn-default btn-previous-page"
                                    @click="goToHistoryRecord(-1)"
                                >
                                    <span class="fa fa-arrow-left" />
                                </span>
                                <span class="h1-header">
                                    {{ $t(title.toLowerCase()) | capitalize | split }}
                                    <span v-if="totalNumberOfInstances > -1" class="badge bg-info">
                                        {{ totalNumberOfInstances }}
                                    </span>
                                </span>
                            </h1>
                        </div>
                        <div class="col-lg-6">
                            <breadcrumbs :breadcrumbs="breadcrumbs" />
                        </div>
                    </div>
                </div>
            </section>
            <section class="content">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-lg-12 buttons-row-wrapper">
                            <gui_buttons_row :view="view" :opt="opt" :datastore="datastore" />
                        </div>
                    </div>
                    <div class="row">
                        <section class="col-lg-12">
                            <template v-if="view.schema.type === 'list'">
                                <component
                                    :is="content_body_component"
                                    :view="view"
                                    :opt="opt"
                                    :datastore="datastore"
                                />
                                <template v-if="multi_actions_button_component">
                                    <component
                                        :is="multi_actions_button_component"
                                        :view="view"
                                        :opt="opt"
                                        :datastore="datastore"
                                    />
                                </template>
                            </template>
                            <template v-else>
                                <div class="card card-info">
                                    <div class="card-header with-border card-header-custom">
                                        <component
                                            :is="content_header_component"
                                            :view="view"
                                            :opt="opt"
                                            :datastore="datastore"
                                        />
                                        <button
                                            v-if="card_collapsed_button"
                                            type="button"
                                            class="btn btn-card-tool btn-sm btn-light btn-icon btn-right"
                                            aria-label="toggle"
                                            @click="toggleCardCollapsed"
                                        >
                                            <i class="fa" :class="card_collapsed ? 'fa-plus' : 'fa-minus'" />
                                        </button>
                                    </div>
                                    <transition name="fade">
                                        <div
                                            v-show="!card_collapsed"
                                            class="card-body card-body-custom"
                                            :class="'card-body-' + view.schema.type"
                                        >
                                            <component
                                                :is="content_body_component"
                                                :view="view"
                                                :opt="opt"
                                                :datastore="datastore"
                                            />
                                        </div>
                                    </transition>
                                    <transition name="fade">
                                        <div
                                            v-if="content_footer_component && !card_collapsed"
                                            class="card-footer clearfix"
                                        >
                                            <component
                                                :is="content_footer_component"
                                                :view="view"
                                                :opt="opt"
                                                :datastore="datastore"
                                            />
                                        </div>
                                    </transition>
                                </div>
                                <component
                                    :is="content_additional"
                                    v-if="content_additional"
                                    :view="view"
                                    :opt="opt"
                                    :datastore="datastore"
                                />
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
