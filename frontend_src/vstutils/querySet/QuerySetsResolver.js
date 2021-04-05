import { RequestTypes } from '../utils';

function pathToArray(path) {
    return path.replace(/^\/|\/$/g, '').split('/');
}

class Node {
    /**
     * @param {string|null} fragment - Part of view path
     * @param {View} view
     */
    constructor(fragment = null, view = null) {
        this.fragment = fragment;
        this.view = view;
        /** @type {Map<string, Node>} */
        this.children = new Map();
        /** @type {Node|null} */
        this.parent = null;
    }

    /**
     * @param {string[]} dt
     * @return {Node|null}
     */
    get(dt) {
        let node = this;
        for (const fragment of dt) {
            if (node.children.has(fragment)) {
                node = node.children.get(fragment);
            } else {
                return null;
            }
        }
        return node;
    }

    *siblings() {
        if (!this.parent) return;
        for (const sibling of this.parent.children.values()) {
            if (sibling !== this) {
                yield sibling;
            }
        }
    }

    *parents() {
        if (!this.parent) return;
        yield this.parent;
        yield* this.parent.parents();
    }

    /**
     * @param {Node} node
     * @return {Node}
     */
    add(node) {
        this.children.set(node.fragment, node);
        node.parent = this;
        return node;
    }

    ensureExists(fragment) {
        if (!this.children.has(fragment)) {
            return this.add(new Node(fragment));
        }
        return this.children.get(fragment);
    }
}

/**
 * @param {Map<string, View>} views
 * @return {Node}
 */
function buildViewsTree(views) {
    const root = new Node();

    for (const [path, view] of views) {
        const dt = pathToArray(path);
        let node = root;
        for (let i = 0; i < dt.length - 1; i++) {
            node = node.ensureExists(dt[i]);
        }
        node.add(new Node(dt[dt.length - 1], view));
    }

    return root;
}

/**
 * @class QuerySetsResolver choses appropriate queryset for path.
 */
export class QuerySetsResolver {
    constructor(models, views) {
        this.models = models;
        this.views = views;
        this.root = buildViewsTree(views);
    }

    findQuerySetForNested(modelName, path) {
        const node = this.root.get(pathToArray(path));
        const qs = this.findInParents(node, modelName);

        if (qs) {
            return qs;
        }
        throw new Error(`Cannot find model ${modelName} for path ${path}`);
    }

    findQuerySet(modelName, path = null) {
        if (!path) {
            return this.findInAllPaths(modelName);
        }

        const node = this.root.get(pathToArray(path));
        if (!node) {
            throw new Error('View does not exists in tree: ' + path);
        }

        const qs =
            this._checkView(node.view, modelName) ||
            this.findInChildren(node, modelName) ||
            this.findInNeighbourPaths(node, modelName) ||
            this.findInParents(node, modelName) ||
            this.findInAllPaths(modelName);

        if (qs) {
            return qs;
        }
        throw new Error(`Cannot find model ${modelName} for path ${path}`);
    }

    /**
     * @param {Node} node
     * @param {string} modelName
     * @return {QuerySet|null}
     */
    findInChildren(node, modelName) {
        for (const child of node.children.values()) {
            const qs = this._checkView(child.view, modelName);
            if (qs) return qs;
        }
        return null;
    }

    /**
     * @param {Node} node
     * @param {string} modelName
     * @return {QuerySet|null}
     */
    findInNeighbourPaths(node, modelName) {
        for (const sibling of node.siblings()) {
            const qs = this._checkView(sibling.view, modelName);
            if (qs) return qs;
        }
        return null;
    }

    /**
     * @param {Node} node
     * @param {string} modelName
     * @return {QuerySet|null}
     */
    findInParents(node, modelName) {
        for (const parent of node.parents()) {
            const qs = this._checkView(parent.view, modelName);
            if (qs) return qs;

            for (const sibling of parent.siblings()) {
                const qs = this._checkView(sibling.view, modelName);
                if (qs) return qs;
            }
        }
        return null;
    }

    /**
     * @param {string} modelName
     * @return {QuerySet|null}
     */
    findInAllPaths(modelName) {
        for (const view of this.views.values()) {
            const qs = this._checkView(view, modelName);
            if (qs) return qs;
        }
        return null;
    }

    /**
     * @param {View} view
     * @param {string} modelName
     * @return {QuerySet|null}
     */
    _checkView(view, modelName) {
        const listModel = view?.objects?.getModelClass(RequestTypes.LIST);

        if (listModel && listModel.name === modelName) {
            return view.objects.clone();
        }

        return null;
    }
}
