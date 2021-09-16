import TabSignal from '@vstconsulting/tabsignal';

const signals = new TabSignal('application');
export default signals;
export { signals };

/**
 * Signal that emitted after App constructor initialized. For example can bu used to register custom field
 * using {@link FieldsResolver} (default fields will be already registered).
 *
 * Parameter: {@link App} instance
 * @type {string}
 */
export const APP_CREATED = 'APP_CREATED';
