import { globalComponentsRegistrator } from '../../../ComponentsRegistrator.js';

import Logo from './Logo.vue';
import Sidebar from './Sidebar.vue';
import SidebarLinkWrapper from './SidebarLinkWrapper.vue';
import SidebarLink from './SidebarLink.vue';

globalComponentsRegistrator.add(Logo);
globalComponentsRegistrator.add(Sidebar);
globalComponentsRegistrator.add(SidebarLinkWrapper);
globalComponentsRegistrator.add(SidebarLink);

export { Logo, Sidebar, SidebarLinkWrapper, SidebarLink };
