import { FKField } from '../fk/FKField';
import DeepFKFieldMixin from './DeepFKFieldMixin';
import { DeepFkArrayFieldMixin } from './array';

/**
 * DeepFKField extends `FkField`, but displays as tree
 */
class DeepFKField extends FKField {
    constructor(options) {
        super(options);
        this.onlyLastChild = this.props.only_last_child;
        this.parentFieldName = this.props.parent_field_name;
        this.limit = 100000;
    }

    makeRequest(offset = 0, results = []) {
        const queryset = this.getAppropriateQuerySet({
            querysets: this.getAllQuerysets(this.constructor.app.getCurrentViewPath()),
        });
        return queryset
            .clone({ prefetchEnabled: false })
            .filter({ offset, limit: this.limit })
            .items()
            .then((instances) => {
                offset += this.limit;
                results = results.concat(instances);
                if (offset >= instances.extra.count) {
                    return results;
                } else {
                    return this.makeRequest(offset, results);
                }
            });
    }

    getParentFieldValue(val) {
        if (val !== null && typeof val === 'object') {
            if (val._data) {
                return val._data[this.parentFieldName];
            } else {
                return val[this.parentFieldName];
            }
        }
        return val;
    }

    createTreeData(rawData) {
        const data = JSON.parse(JSON.stringify(rawData));
        const idxById = new Map();
        const roots = [];

        for (let idx = 0; idx < data.length; idx++) {
            idxById.set(this.getValueFieldValue(rawData[idx]), idx);
            data[idx].children = [];
        }

        for (let i = 0; i < data.length; i++) {
            const node = {
                data: { instance: rawData[i] },
                id: this.getValueFieldValue(rawData[i]),
                text: this.getViewFieldValue(rawData[i]),
                parent: this.getParentFieldValue(rawData[i]),
                children: data[i].children,
                state: {},
            };

            if (![null, node.id].includes(node.parent) && idxById.has(node.parent)) {
                data[idxById.get(node.parent)].children.push(node);
            } else {
                roots.push(node);
            }
        }

        if (this.onlyLastChild) {
            const setIsSelectable = (nodes) => {
                for (const node of nodes) {
                    if (node.children.length > 0) {
                        node.state.selectable = false;
                        setIsSelectable(node.children);
                    }
                }
            };
            setIsSelectable(roots);
        }

        return roots;
    }

    static get mixins() {
        return [DeepFKFieldMixin];
    }

    getArrayComponent() {
        return DeepFkArrayFieldMixin;
    }
}
export default DeepFKField;
