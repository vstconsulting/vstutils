import IntegerField from './IntegerField.js';
import IntegerFieldContentMixin from './IntegerFieldContentMixin.js';
import IntegerFieldMixin from './IntegerFieldMixin.js';

/**
 * Int32 guiField class.
 */
class Int32Field extends IntegerField {}

/**
 * Int64 guiField class.
 */
class Int64Field extends IntegerField {}

/**
 * Double guiField class.
 */
class DoubleField extends IntegerField {}

/**
 * Number guiField class.
 */
class NumberField extends IntegerField {}

/**
 * Float guiField class.
 */
class FloatField extends IntegerField {}

export {
    IntegerField,
    Int32Field,
    Int64Field,
    DoubleField,
    NumberField,
    FloatField,
    IntegerFieldContentMixin,
    IntegerFieldMixin,
};
