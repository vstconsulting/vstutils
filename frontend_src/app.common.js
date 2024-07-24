// Global libraries
import TabSignal from '@vstconsulting/tabsignal';
export * from './vstutils/signals';

import './libs/jquery.js';

import 'select2/dist/js/select2.full.min.js';
import 'select2/dist/css/select2.css';
import 'select2-bootstrap-5-theme/dist/select2-bootstrap-5-theme.min.css';
window.SELECT2_THEME = 'bootstrap-5';

import 'jquery.scrollto';

import 'jquery-slimscroll';

import 'jquery-touchswipe/jquery.touchSwipe.js';

import './libs/vue.js';

import { register } from 'swiper/element/bundle';
register();

import moment from 'moment-timezone';
window.moment = moment;

import md5 from 'md5';
window.md5 = md5;

import Visibility from 'visibilityjs';
window.Visibility = Visibility;

import IMask from 'imask';
window.IMask = IMask;

import 'cropperjs/dist/cropper.css';

import iziToast from 'izitoast';
import 'izitoast/dist/css/iziToast.css';
window.iziToast = iziToast;

import autoComplete from '#libs/auto-complete.js';
window.autoComplete = autoComplete;

import './libs/bootstrap-adminlte.js';
import './libs/fontawesome.js';

export { TabSignal };

import * as colors from './libs/colors.js';
export { colors };

// vstutils code
import AppRoot from './vstutils/AppRoot.vue';
import * as autoupdate from './vstutils/autoupdate';
import * as utils from './vstutils/utils';
import * as setupVue from './vstutils/setupVue.js';
import * as popUp from './vstutils/popUp';
import * as fields from './vstutils/fields';
import * as components from './vstutils/components';
import * as models from './vstutils/models';
import * as querySet from './vstutils/querySet';
import * as views from './vstutils/views';
import * as store from './vstutils/store';
import * as router from './vstutils/router';
import * as api from './vstutils/api';
import * as users from './vstutils/users';
import './vstutils/local-settings';

export * from './vstutils/ComponentsRegistrator.js';
export * from './vstutils/schema';
export { i18n } from './vstutils/translation';

export {
    AppRoot,
    utils,
    setupVue,
    autoupdate,
    popUp,
    fields,
    components,
    models,
    querySet,
    views,
    store,
    router,
    api,
    users,
};

export const getApp = utils.getApp;

// vstutils styles
import './gui.css';

import './vstutils/styles/scrollbar.css';
import './vstutils/styles/common.css';
import './vstutils/dark.scss';
