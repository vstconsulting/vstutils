import $ from 'jquery';
import HTMLFieldContentReadonly from './HTMLFieldContentReadonly.vue';

const HTMLFieldMixin = {
    data() {
        return {
            link_path: '',
        };
    },
    components: {
        field_content_readonly: HTMLFieldContentReadonly,
    },
    mounted() {
        this.setLinksInsideField();
    },
    methods: {
        /**
         * Method, that adds handlers to links from html field value.
         */
        setLinksInsideField() {
            let links_array = $(this.$el).find('a');

            for (let i = 0; i < links_array.length; i++) {
                let link = links_array[i];

                if (!(link.href && link.href.search(window.app.api.getHostUrl()) !== -1)) {
                    link.setAttribute('target', '_blank');
                    link.setAttribute('rel', 'noreferrer');
                    continue;
                }

                let match = link.href.match(/#([A-z0-9,-]+)$/);

                if (match && link.href.search(window.location.href) === -1 && $('*').is(match[0])) {
                    link.onclick = function () {
                        $('body,html').animate(
                            {
                                scrollTop: $(match[0]).offset().top,
                            },
                            600,
                        );
                        return false;
                    };

                    continue;
                }

                if (link.href.search(window.location.href) === -1) {
                    link.href =
                        window.location.href +
                        this.link_path +
                        link.href.split(window.app.api.getHostUrl())[1];
                }
            }
        },
    },
};

export default HTMLFieldMixin;
