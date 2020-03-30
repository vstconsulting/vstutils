import { globalComponentsRegistrator } from '../../../ComponentsRegistrator.js';

import Breadcrumbs from './Breadcrumbs.vue';
import GUICustomizer from './GUICustomizer.vue';
import Preloader from './Preloader.vue';

globalComponentsRegistrator.add(Breadcrumbs);
globalComponentsRegistrator.add(GUICustomizer);
globalComponentsRegistrator.add(Preloader);

export { Breadcrumbs, GUICustomizer, Preloader };
