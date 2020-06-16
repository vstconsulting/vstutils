// Global libraries
import './libs/tabSignal.js';

import $ from './libs/jquery.js';

import 'select2';
import 'select2/dist/css/select2.css';
import 'select2-theme-bootstrap4/dist/select2-bootstrap.css';
$.fn.select2.defaults.set('theme', 'bootstrap');

import 'jquery.scrollto';

require('jquery-slimscroll');

import iziModal from 'izimodal/js/iziModal';
$.fn.iziModal = iziModal;
import 'izimodal/css/iziModal.css';

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

import iziToast from 'izitoast';
import 'izitoast/dist/css/iziToast.css';
window.iziToast = iziToast;

import FastClick from 'fastclick';
window.FastClick = FastClick;

import autoComplete from 'JavaScript-autoComplete/auto-complete';
window.autoComplete = autoComplete;

import axios from 'axios';
window.axios = axios;

import { createPopper } from '@popperjs/core';
window.createPopper = createPopper;

import './libs/bootstrap-adminlte.js';
import './libs/fontawesome.js';

// Libraries in spa object
import * as colors from './libs/colors.js';

export { colors };

// vstutils code
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
