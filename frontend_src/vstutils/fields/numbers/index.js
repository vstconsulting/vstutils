import * as integer from './integer.js';
import * as rating from './rating';
import { FloatField } from './float.js';

class NumberField extends integer.IntegerField {}
class DecimalField extends FloatField {}

export { integer, rating, NumberField, FloatField, DecimalField };
