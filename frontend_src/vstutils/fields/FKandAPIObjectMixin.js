/**
 * Mixin for fk and api_object guiFields classes.
 * @param Class_name
 */
const FKandAPIObjectMixin = (Class_name) =>
    class extends Class_name {
        /**
         * Static method, that finds queryset by model's name in views of second nesting level.
         * @param {string} model_name Name Model to which autocomplete field links.
         */
        static findQuerySetSecondLevelPaths(model_name) {
            let views = window.app.views;
            let paths = Object.keys(views)
                .filter((item) => {
                    if (views[item].schema.level === 2) {
                        return item;
                    }
                })
                .sort((a, b) => {
                    return b.length - a.length;
                });

            for (let index = 0; index < paths.length; index++) {
                let p = paths[index];
                if (views[p].objects.model.name === model_name) {
                    return views[p].objects.clone();
                }
            }
        }
    };

export default FKandAPIObjectMixin;
