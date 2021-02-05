// Global libraries
import TabSignal from '@vstconsulting/tabsignal';
import signals from './vstutils/signals.js';

import './libs/jquery.js';

import 'select2';
import 'select2/dist/css/select2.css';
import 'select2-theme-bootstrap4/dist/select2-bootstrap.css';
window.SELECT2_THEME = 'bootstrap';

import 'jquery.scrollto';

require('jquery-slimscroll');

require('jquery-touchswipe/jquery.touchSwipe.js');

import './libs/vue.js';

import moment from 'moment';
window.moment = moment;
import 'moment-timezone/builds/moment-timezone-with-data-2012-2022.js';

import md5 from 'md5';
window.md5 = md5;

import Visibility from 'visibilityjs';
window.Visibility = Visibility;

import IMask from 'imask';
window.IMask = IMask;

import 'croppie/croppie.css';

import iziToast from 'izitoast';
import 'izitoast/dist/css/iziToast.css';
window.iziToast = iziToast;

import autoComplete from 'JavaScript-autoComplete/auto-complete';
window.autoComplete = autoComplete;

import './libs/bootstrap-adminlte.js';
import './libs/fontawesome.js';

export { TabSignal, signals };

import * as colors from './libs/colors.js';
export { colors };

// vstutils code
import AppRoot from './vstutils/AppRoot.vue';
import * as utils from './vstutils/utils';
import * as guiCustomizer from './vstutils/guiCustomizer';
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
import * as dashboard from './vstutils/dashboard.js';

export * from './vstutils/ComponentsRegistrator.js';

export {
    AppRoot,
    utils,
    guiCustomizer,
    setupVue,
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
    dashboard,
};

// vstutils styles
import './vstutils/gui.css';
