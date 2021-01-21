import IntegerField from './IntegerField.js';
import IntegerFieldContentMixin from './IntegerFieldContentMixin.js';
import IntegerFieldMixin from './IntegerFieldMixin.js';

/**
 * Number guiField class.
 */
class NumberField extends IntegerField {}

/**
 * Float guiField class.
 */
class FloatField extends IntegerField {}

class DecimalField extends FloatField {}

export { IntegerField, NumberField, FloatField, DecimalField, IntegerFieldContentMixin, IntegerFieldMixin };
