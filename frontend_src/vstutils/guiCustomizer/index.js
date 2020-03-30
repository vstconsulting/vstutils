import { guiLocalSettings } from '../utils';
import GuiCustomizer from './GuiCustomizer.js';
import skinDefault from './skinDefault.js';
import skinDark from './skinDark.js';

/**
 * Object, that stores application skins settings.
 */
let skins = {
    default: skinDefault,
    dark: skinDark,
};

/**
 * Instance of GuiCustomizer class.
 */
let guiCustomizer = new GuiCustomizer(
    {
        name: guiLocalSettings.get('skin') || 'default',
        settings: {},
    },
    skins,
    guiLocalSettings.get('skins_settings') || {},
);

window.guiSkins = skins;
window.guiCustomizer = guiCustomizer;

export { GuiCustomizer, skins, guiCustomizer };
