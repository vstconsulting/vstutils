import { defineComponent } from 'vue';
import HTMLFieldContentReadonly from './HTMLFieldContentReadonly.vue';
import { TextAreaField, TextAreaFieldMixin } from './TextAreaField';
import type { IFileField } from '../files/file/utils';

export function replaceHashLinks(el: Element, linkPath: string) {
    const links = el.querySelectorAll('a');

    const currentHref = document.location.href; // For example http://localhost/#/some_path/9/
    const currentOrigin = document.location.origin; // For example http://localhost

    for (const link of links) {
        if (!(link.href && link.href.search(currentOrigin) !== -1)) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noreferrer');
            continue;
        }

        if (!link.href.includes(currentHref)) {
            const match = link.href.match(/#([A-z0-9,-]+)$/);
            const targetElement = match && document.querySelector(match[0]);

            if (targetElement) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                });

                continue;
            }

            link.href = currentHref + linkPath + link.href.split(currentOrigin)[1];
        }
    }
}

export const HTMLFieldMixin = defineComponent({
    components: {
        field_content_readonly: HTMLFieldContentReadonly,
    },
    extends: TextAreaFieldMixin,
    data() {
        return {
            link_path: '',
        };
    },
    mounted() {
        this.setLinksInsideField();
    },
    methods: {
        /**
         * Method, that adds handlers to links from html field value.
         */
        setLinksInsideField() {
            replaceHashLinks(this.$el, this.link_path);
        },
    },
});

export class HTMLField extends TextAreaField implements IFileField {
    allowedMediaTypes = ['text/html'];

    static get mixins() {
        return [HTMLFieldMixin];
    }
}
