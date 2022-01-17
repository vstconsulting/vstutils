import { Model, ModelClass, makeModel } from './Model.js';
import { ModelsResolver } from './ModelsResolver.js';
import { StringField } from '../fields/text';

const NoModel = makeModel(
    class extends Model {
        static declaredFields = [
            new StringField({
                format: 'string',
                name: 'detail',
                required: false,
                title: 'Detail',
                type: 'string',
            }),
        ];
    },
    'NoModel',
);

export { Model, makeModel, ModelClass, ModelsResolver, NoModel };
