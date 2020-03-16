import ErrorHandler from "./ErrorHandler.js";
window.ErrorHandler = ErrorHandler;

import { PopUp, guiPopUp, pop_up_msg } from "./PopUp.js";
window.PopUp = PopUp;
window.guiPopUp = guiPopUp;
window.pop_up_msg = pop_up_msg;

export { ErrorHandler, PopUp, guiPopUp, pop_up_msg };
