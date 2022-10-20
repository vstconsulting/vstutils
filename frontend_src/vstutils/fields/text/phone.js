import { MaskedField, MaskedFieldMixin } from './masked';
import PhoneFieldContentEdit from './PhoneFieldContentEdit';
import { ChoicesField } from '../choices';
import { BaseFieldContentReadonlyMixin, BaseFieldListView } from '../base';
import IMask from 'imask';
import { X_OPTIONS } from '../../utils';

const FormattedPhoneMixin = {
    data() {
        return {
            justNumber: '',
            countryCode: '1',
        };
    },
    mounted() {
        this.justNumber = this.trimCode(this.value);
    },
    methods: {
        trimCode(phone) {
            if (!phone) {
                return phone;
            }
            if (!phone.startsWith(this.countryCode)) {
                const code = this.field.codes.find((code) => phone.startsWith(code));
                if (!code) {
                    this.setValue(null);
                    return '';
                }
                this.countryCode = code;
            }
            return phone.slice(this.countryCode.length);
        },
    },
};
const FormattedPhoneReadonlyMixin = {
    mixins: [FormattedPhoneMixin],
    computed: {
        preparedValue() {
            if (!this.justNumber) return '';
            return `+${this.countryCode} ${IMask.pipe(this.justNumber, this.field.mask)}`;
        },
    },
};

export const PhoneFieldMixin = {
    mixins: [MaskedFieldMixin],
    components: {
        field_content_edit: {
            mixins: [PhoneFieldContentEdit, FormattedPhoneMixin],
        },
        field_content_readonly: {
            mixins: [BaseFieldContentReadonlyMixin, FormattedPhoneReadonlyMixin],
        },
        field_list_view: {
            mixins: [BaseFieldListView, FormattedPhoneReadonlyMixin],
        },
    },
};

// eslint-disable-next-line prettier/prettier
const CODES = [ '5999', '4779', '1939', '1876', '1869', '1868', '1849', '1829', '1809', '1787', '1784', '1767', '1758', '1721', '1684', '1671', '1670', '1664', '1649', '1473', '1441', '1345', '1340', '1284', '1268', '1264', '1246', '1242', '998', '996', '995', '994', '993', '992', '977', '976', '975', '974', '973', '972', '971', '970', '968', '967', '966', '965', '964', '963', '962', '961', '960', '886', '880', '856', '855', '853', '852', '850', '692', '691', '690', '689', '688', '687', '686', '685', '683', '682', '681', '680', '679', '678', '677', '676', '675', '674', '673', '672', '670', '598', '597', '596', '595', '594', '593', '592', '591', '590', '509', '508', '507', '506', '505', '504', '503', '502', '501', '500', '423', '421', '420', '389', '387', '386', '385', '383', '382', '381', '380', '379', '378', '377', '376', '375', '374', '373', '372', '371', '370', '359', '358', '357', '356', '355', '354', '353', '352', '351', '350', '299', '298', '297', '291', '269', '268', '267', '266', '265', '264', '263', '262', '261', '260', '258', '257', '256', '255', '254', '253', '252', '251', '250', '249', '248', '246', '245', '244', '243', '242', '241', '240', '239', '238', '237', '236', '235', '234', '233', '232', '231', '230', '229', '228', '227', '226', '225', '224', '223', '222', '221', '220', '218', '216', '213', '212', '211', '98', '95', '94', '93', '92', '91', '90', '86', '84', '82', '81', '77', '76', '66', '65', '64', '63', '62', '61', '60', '58', '57', '56', '55', '54', '53', '52', '51', '49', '48', '47', '46', '45', '44', '43', '41', '40', '39', '36', '34', '33', '32', '31', '30', '27', '20', '7', '1'];
const countryCodeField = new ChoicesField({
    name: 'countryCode',
    enum: CODES.slice().reverse(),
});
countryCodeField.customMatcher = (params, data) => {
    if (!params.term || data.text.startsWith(params.term)) {
        return data;
    }
    return null;
};

export class PhoneField extends MaskedField {
    constructor(options) {
        options[X_OPTIONS] = {
            mask: {
                mask: [
                    { mask: '(000) 000-000' },
                    { mask: '(000) 000-00-00' },
                    { mask: '(000) 000-000-00' },
                    { mask: '(000) 000-000-000' },
                ],
            },
        };
        super(options);
        this.codes = CODES;
        this.countryCodeField = countryCodeField;
    }

    static get mixins() {
        return [PhoneFieldMixin];
    }

    getEmptyValue() {
        return null;
    }
}
