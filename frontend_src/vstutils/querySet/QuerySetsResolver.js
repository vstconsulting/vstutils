import { findClosestPath, RequestTypes } from '../utils';

export class QuerySetsResolver {
    constructor(models, views) {
        this.models = models;
        this.views = views;
    }

    /**
     * Static method, that finds queryset by view's path and model's name.
     * @param {string} path Name of View path.
     * @param {string} modelName Name Model to which fk field links.
     */
    findQuerySet(modelName, path = undefined) {
        const qs =
            (path && this.findQuerySetInCurrentPath(path, modelName)) ||
            (path && this.findQuerySetInNeighbourPaths(path, modelName)) ||
            this.findQuerySetSecondLevelPaths(modelName) ||
            this.findQuerySetInAllPaths(modelName);

        if (qs) {
            return qs;
        }
        throw new Error(`Cannot find model ${modelName} for path ${path}`);
    }

    /**
     * Static method, that finds queryset by model's name in views of second nesting level.
     * @param {string} model_name Name Model to which autocomplete field links.
     */
    findQuerySetSecondLevelPaths(model_name) {
        let paths = Array.from(this.views.values())
            .filter((view) => view.level === 2)
            .sort((a, b) => b.path.length - a.path.length);

        for (const p of paths) {
            const listModel = p.objects?.getModelClass(RequestTypes.LIST);

            if (listModel && listModel.name === model_name) {
                return p.objects.clone();
            }
        }
    }

    findQuerySetInAllPaths(model_name) {
        let paths = Array.from(this.views.values()).sort((a, b) => b.path.length - a.path.length);

        for (const p of paths) {
            const listModel = p.objects?.getModelClass(RequestTypes.LIST);

            if (listModel && listModel.name === model_name) {
                return p.objects.clone();
            }
        }
    }

    /**
     * Static method, that finds queryset by view's path and model's name in current path.
     * @param {string} path Name of View path.
     * @param {string} model_name Name Model to which fk field links.
     */
    findQuerySetInCurrentPath(path, model_name) {
        const view = this.views.get(path);
        if (view.objects?.getModelClass(RequestTypes.LIST)?.name === model_name) {
            return view.objects.clone();
        }
    }

    /**
     * Static method, that finds queryset by view's path and model's name
     * in views with neighbour paths.
     * @param {string} path Name of View path.
     * @param {string} model_name Name Model to which fk field links.
     */
    findQuerySetInNeighbourPaths(path, model_name) {
        let num = path.replace(/^\/|\/$/g, '').split('/').length;
        // let level = views[path].schema.level + 2;
        let level = this.views.get(path).params.level;
        let path1 = path.split('/').slice(0, -2).join('/') + '/';
        function func(item) {
            if (
                item.indexOf(path1) !== -1 &&
                this.views.get(item)?.schema.type === 'list' &&
                this.views.get(item)?.schema.level <= level
            ) {
                return item;
            }
        }
        function func1(item) {
            if (this.views.get(item)?.objects?.getModelClass(RequestTypes.LIST).name === model_name) {
                return item;
            }
        }

        for (num; num > 0; num--) {
            path1 = path1.split('/').slice(0, -2).join('/') + '/';

            let paths = Object.keys(this.views)
                .filter(func)
                .sort((a, b) => b.length - a.length);

            let paths_with_model = paths.filter(func1);

            let closest_path = findClosestPath(paths_with_model, path);

            if (closest_path) {
                return this.views.get(closest_path)?.objects.clone();
            }
        }
    }
}
