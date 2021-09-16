import { Model, ModelClass } from './Model.js';
import { ModelsResolver } from './ModelsResolver.js';
import { StringField } from '../fields/text';

@ModelClass('NoModel')
class NoModel extends Model {
    static declaredFields = [
        new StringField({
            format: 'string',
            name: 'detail',
            required: false,
            title: 'Detail',
            type: 'string',
        }),
    ];
}

export { Model, ModelClass, ModelsResolver, NoModel };
