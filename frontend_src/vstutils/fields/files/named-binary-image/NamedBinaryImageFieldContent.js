import ImageBlock from './ImageBlock.vue';

/**
 * Mixin for readonly and editable namedbinimage field.
 */
export const NamedBinaryImageFieldContent = {
    data() {
        return {
            translate_string: 'image n selected',
        };
    },
    components: {
        image_block: ImageBlock,
    },
};

export default NamedBinaryImageFieldContent;
