import { BaseField } from './base';
import EmptyComponent from '../components/EmptyComponent.js';

export class HiddenField extends BaseField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(EmptyComponent);
    }
}
