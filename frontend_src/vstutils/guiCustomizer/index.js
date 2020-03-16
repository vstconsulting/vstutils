import { guiLocalSettings } from "../utils";
import GuiCustomizer from "./GuiCustomizer.js";
import skinDefault from "./skinDefault.js";
import skinDark from "./skinDark.js";

/**
 * Object, that stores application skins settings.
 */
let guiSkins = {
  default: skinDefault,
  dark: skinDark
};

/**
 * Instance of GuiCustomizer class.
 */
let guiCustomizer = new GuiCustomizer(
  {
    name: guiLocalSettings.get("skin") || "default",
    settings: {}
  },
  guiSkins,
  guiLocalSettings.get("skins_settings") || {}
);

window.guiSkins = guiSkins;
window.guiCustomizer = guiCustomizer;

export { GuiCustomizer, guiSkins, guiCustomizer };
