// TabSignal
import './libs/tabSignal.js';

import $ from './libs/jquery.js';

import 'select2';
import 'select2/dist/css/select2.css';

import 'jquery.scrollto';

require('jquery-slimscroll');

import iziModal from 'izimodal/js/iziModal';
$.fn.iziModal = iziModal;
import 'izimodal/css/iziModal.css';

import './libs/vue.js';

// Other
import moment from 'moment';
window.moment = moment;
import 'moment-timezone/builds/moment-timezone-with-data-1970-2030.js';

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

import Chart from 'chart.js';
window.Chart = Chart;

import { createPopper } from '@popperjs/core';
window.createPopper = createPopper;

import './libs/bootstrap.js';
import './libs/bootstrap-select.js';
import './libs/adminlte.js';
import './libs/fontawesome.js';

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
};

import './vstutils/gui.css';
