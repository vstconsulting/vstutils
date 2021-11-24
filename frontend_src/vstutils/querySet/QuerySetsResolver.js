import { pathToArray, RequestTypes, ViewTypes } from '../utils';

/**
 * @class QuerySetsResolver chooses appropriate queryset for path.
 */
export class QuerySetsResolver {
    /**
     * @param {ViewsTree} viewsTree
     */
    constructor(viewsTree) {
        this.viewsTree = viewsTree;
    }

    findQuerySetForNested(modelName, path) {
        const node = this.viewsTree.root.get(pathToArray(path));
        const qs = this.viewsTree.findInParentsDeep(node, this._getMatcher(modelName));

        if (qs) {
            return qs;
        }
        throw new Error(`Cannot find model ${modelName} for path ${path}`);
    }

    findQuerySet(modelName, path = null) {
        const matcher = this._getMatcher(modelName);

        if (!path) {
            return this.viewsTree.findInFirstLevel(matcher) || this.viewsTree.findInAllPaths(matcher);
        }

        const node = this.viewsTree.root.get(pathToArray(path));
        if (!node) {
            throw new Error('View does not exists in tree: ' + path);
        }

        const qs =
            matcher(node.view) ||
            this.viewsTree.findInChildren(node, matcher) ||
            this.viewsTree.findInNeighbourPaths(node, matcher) ||
            this.viewsTree.findInParentsDeep(node, matcher) ||
            this.viewsTree.findInAllPaths(matcher);

        if (qs) {
            return qs;
        }
        throw new Error(`Cannot find model ${modelName} for path ${path}`);
    }

    /**
     * @param {string} modelName
     * @return {Function}
     */
    _getMatcher(modelName) {
        return (view) => {
            if (view.type !== ViewTypes.LIST) {
                return;
            }
            const listModel = view?.objects?.getResponseModelClass(RequestTypes.LIST);

            if (listModel && listModel.name === modelName) {
                if (view.deepNestedParentView) {
                    // For deep nested views use root view
                    view = view.deepNestedParentView;
                }
                return view.objects.clone();
            }

            return null;
        };
    }
}
