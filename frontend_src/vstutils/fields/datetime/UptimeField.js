import moment from 'moment';
import { getTimeInUptimeFormat } from '../../utils';
import { BaseField } from '../base';
import UptimeFieldMixin from './UptimeFieldMixin.js';

/**
 * Uptime guiField class.
 * Field that gets time in seconds as value and shows it in convenient way for user.
 * Due to size of time field selects one of the most appropriate pattern from these templates:
 * - 23:59:59
 * - 01d 00:00:00
 * - 01m 30d 00:00:00
 * - 99y 11m 30d 22:23:24
 */
class UptimeField extends BaseField {
    constructor(options = {}) {
        super(options);
        /**
         * Array of regexps for current field.
         * These regexps are needed for converting value from seconds to uptime format.
         */
        this.reg_exp_arr = [
            /(?<y>[0-9]+)[y] (?<m>[0-9]+)[m] (?<d>[0-9]+)[d] (?<hh>[0-9]+):(?<mm>[0-9]+):(?<ss>[0-9]+)/,
            /(?<m>[0-9]+)[m] (?<d>[0-9]+)[d] (?<hh>[0-9]+):(?<mm>[0-9]+):(?<ss>[0-9]+)/,
            /(?<d>[0-9]+)[d] (?<hh>[0-9]+):(?<mm>[0-9]+):(?<ss>[0-9]+)/,
            /(?<hh>[0-9]+):(?<mm>[0-9]+):(?<ss>[0-9]+)/,
        ];
    }

    toInner(data) {
        const value = super.toInner(data);
        if (!value) return;

        // TODO think about this 'if', during making decision about what type of data to save in store
        // toInner or to Represent.
        if (!isNaN(Number(value))) {
            return Number(value);
        }

        let uptime_in_seconds = 0;

        for (const regexp of this.reg_exp_arr) {
            const match = regexp.exec(value);
            if (!match) {
                continue;
            }

            const time_parts = match.groups;

            let duration_obj = {
                seconds: Number(time_parts.ss),
                minutes: Number(time_parts.mm),
                hours: Number(time_parts.hh),
                days: Number(time_parts.d || 0),
                months: Number(time_parts.m || 0),
                years: Number(time_parts.y || 0),
            };

            uptime_in_seconds = moment.duration(duration_obj).asSeconds();

            return uptime_in_seconds;
        }

        return uptime_in_seconds;
    }

    toRepresent(data) {
        return getTimeInUptimeFormat(super.toRepresent(data));
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(UptimeFieldMixin);
    }
}

export default UptimeField;
