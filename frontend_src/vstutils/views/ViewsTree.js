import { pathToArray } from '../utils';

class Node {
    /**
     * @param {string|null} fragment - Part of view path
     * @param {import('./View').View} view
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

export class ViewsTree {
    constructor(views) {
        this.views = views;
        /**
         * @type {Node}
         */
        this.root = this.constructor.buildViewsTree(views);
    }

    /**
     * @param {Map<string, import('./View').View>} views
     * @return {Node}
     */
    static buildViewsTree(views) {
        const root = new Node(null, views.get('/'));

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
     * @callback ViewMatcher
     * @param {import('./View').View} view
     * @return {boolean}
     */

    /**
     * @param {(view: import('./View').IView) => T} matcher
     * @return {Exclude<T, false> | null}
     * @template T
     */
    findInAllPaths(matcher) {
        for (const view of this.views.values()) {
            const result = matcher(view);
            if (result) {
                return result;
            }
        }
        return null;
    }

    /**
     * @param {Node} node
     * @param {ViewMatcher} matcher
     * @return {*}
     */
    findInNeighbourPaths(node, matcher) {
        for (const sibling of node.siblings()) {
            const result = sibling.view && matcher(sibling.view);
            if (result) {
                return result;
            }
        }
        return null;
    }

    /**
     * @param {Node} node
     * @param {ViewMatcher} matcher
     * @return {*}
     */
    findInChildren(node, matcher) {
        for (const child of node.children.values()) {
            const result = child.view && matcher(child.view);
            if (result) {
                return result;
            }
        }
        return null;
    }

    /**
     * @param {Node} node
     * @param {ViewMatcher} matcher
     * @return {*}
     */
    findInParentsDeep(node, matcher) {
        for (const parent of node.parents()) {
            const result = parent.view && matcher(parent.view);
            if (result) {
                return result;
            }

            for (const sibling of parent.siblings()) {
                const result = sibling.view && matcher(sibling.view);
                if (result) {
                    return result;
                }
            }
        }
        return null;
    }

    /**
     * @param {ViewMatcher} matcher
     * @return {*}
     */
    findInFirstLevel(matcher) {
        for (const child of this.root.children.values()) {
            const result = child.view && matcher(child.view);
            if (result) {
                return result;
            }
        }
    }
}
