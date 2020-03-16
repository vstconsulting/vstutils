// TabSignal
import "./libs/tabSignal.js";

import $ from "./libs/jquery.js";

import "select2";
import "select2/dist/css/select2.css";

import "jquery.scrollto";

require("jquery-slimscroll");

import iziModal from "izimodal/js/iziModal";
$.fn.iziModal = iziModal;
import "izimodal/css/iziModal.css";

import "./libs/vue.js";

// Other
import moment from "moment";
window.moment = moment;
import "moment-timezone/builds/moment-timezone-with-data-1970-2030.js";

import md5 from "md5";
window.md5 = md5;

import Visibility from "visibilityjs";
window.Visibility = Visibility;

import IMask from "imask";
window.IMask = IMask;

import iziToast from "izitoast";
import "izitoast/dist/css/iziToast.css";
window.iziToast = iziToast;

import XRegExp from "xregexp/lib/xregexp";
window.XRegExp = XRegExp;

import FastClick from "fastclick";
window.FastClick = FastClick;

import autoComplete from "JavaScript-autoComplete/auto-complete";
window.autoComplete = autoComplete;

import axios from "axios";
window.axios = axios;

import Chart from "chart.js";
window.Chart = Chart;

import { createPopper } from "@popperjs/core";
window.createPopper = createPopper;

import "./libs/bootstrap.js";
import "./libs/adminlte.js";
import "./libs/fontawesome.js";

import "./vstutils/utils";
import "./vstutils/guiCustomizer";
import "./vstutils/setupVue.js";
import "./vstutils/popUp";
import "./vstutils/fields";
import "./vstutils/items";
import "./vstutils/models";
import "./vstutils/querySet";
import "./vstutils/views";
import "./vstutils/store";
import "./vstutils/router";
import "./vstutils/api";
import "./vstutils/users";

import "./vstutils/gui.css";
