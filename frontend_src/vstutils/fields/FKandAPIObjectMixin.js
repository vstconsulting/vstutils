/**
 * Mixin for fk and api_object guiFields classes.
 * @param Class_name
 */
import { RequestTypes } from '../utils';

const FKandAPIObjectMixin = (Class_name) =>
    class extends Class_name {
        /**
         * Static method, that finds queryset by model's name in views of second nesting level.
         * @param {string} model_name Name Model to which autocomplete field links.
         */
        static findQuerySetSecondLevelPaths(model_name) {
            let views = window.app.views;
            let paths = Array.from(views.values())
                .filter((view) => view.level === 2)
                .sort((a, b) => b.path.length - a.path.length);

            for (const p of paths) {
                const listModel = p.objects?.getModelClass(RequestTypes.LIST);

                if (listModel && listModel.name === model_name) {
                    return p.objects.clone();
                }
            }
        }

        static findQuerySetInAllPaths(model_name) {
            let views = window.app.views;
            let paths = Array.from(views.values()).sort((a, b) => b.path.length - a.path.length);

            for (const p of paths) {
                const listModel = p.objects?.getModelClass(RequestTypes.LIST);

                if (listModel && listModel.name === model_name) {
                    return p.objects.clone();
                }
            }
        }
    };

export default FKandAPIObjectMixin;
