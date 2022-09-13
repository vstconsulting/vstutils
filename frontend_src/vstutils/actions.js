import { guiPopUp, pop_up_msg } from './popUp';
import { formatPath, parseResponseMessage, getRedirectUrlFromResponse, joinPaths, ViewTypes } from './utils';

export class ActionsManager {
    constructor(app) {
        /** @type {App} */
        this.app = app;
    }

    _t(...args) {
        return this.app.i18n.t(...args);
    }

    requestConfirmation({ title }) {
        return new Promise((resolve) => {
            const root = this.app.application;
            if (typeof root.initConfirmation === 'function') {
                root.initConfirmation(resolve, title);
            } else {
                console.warn('Action confirmation is not available');
            }
        });
    }

    get currentView() {
        return this.app.application?.$refs?.currentViewComponent?.view;
    }

    execute({ action, instance = undefined, skipConfirmation = false, getCustomHandler = undefined }) {
        if (action.confirmationRequired && !skipConfirmation) {
            return this.requestConfirmation({ title: action.title }).then(() =>
                this.execute({ action, instance, skipConfirmation: true, getCustomHandler }),
            );
        }

        if (typeof getCustomHandler === 'function') {
            const customHandler = getCustomHandler(action);
            if (typeof customHandler === 'function') {
                return customHandler(action, instance);
            }
        }

        if (action.isEmpty) {
            return this.executeEmpty({ action, instance });
        }

        if (action.appendFragment) {
            if (this.currentView?.type === ViewTypes.LIST && instance) {
                return this.app.router.push(
                    joinPaths(
                        this.app.router.currentRoute.path,
                        instance.getPkValue(),
                        action.appendFragment,
                    ),
                );
            }
            return this.app.router.push(joinPaths(this.app.router.currentRoute.path, action.appendFragment));
        }

        const path = action.href || action.view?.path;
        if (path) {
            return this.app.router.push(formatPath(path, this.app.router.currentRoute.params, instance));
        }

        throw new Error(`Cannot execute action ${action.name} on instance ${instance}`);
    }

    async executeEmpty({ action, instance = undefined }) {
        const path = formatPath(action.path, this.app.router.currentRoute.params, instance);

        try {
            const response = await this.app.api.makeRequest({ useBulk: true, method: action.method, path });

            guiPopUp.success(
                this._t(pop_up_msg.instance.success.executeEmpty, [
                    this._t(action.title),
                    instance?.getViewFieldString() || this._t(this.currentView?.title),
                    parseResponseMessage(response.data),
                ]),
            );

            if (action.onAfter) {
                action.onAfter({ app: this.app, action, instance, response });
            }

            if (response && response.data) {
                try {
                    const redirectPath = getRedirectUrlFromResponse(
                        this.app,
                        response.data,
                        action.responseModel,
                    );
                    if (redirectPath) {
                        this.app.router.push(redirectPath);
                    }
                } catch (e) {
                    console.log(e);
                }
            }
        } catch (error) {
            let str = this.app.error_handler.errorToString(error);

            let srt_to_show = this._t(pop_up_msg.instance.error.executeEmpty, [
                this._t(action.name),
                this._t(this.currentView?.title),
                str,
                parseResponseMessage(error?.data),
            ]);

            this.app.error_handler.showError(srt_to_show, str);
        }
    }

    async executeWithData({
        action,
        data,
        model = undefined,
        method = undefined,
        path = undefined,
        throwError = false,
    }) {
        if (!model) {
            model = action.requestModel;
        }
        if (!method) {
            method = action.method;
        }
        const instance = new model();
        try {
            instance._validateAndSetData(data);
        } catch (e) {
            this.app.error_handler.defineErrorAndShow(e);
            if (throwError) {
                throw e;
            }
            return;
        }

        try {
            const response = await this.app.api.makeRequest({
                method,
                path,
                data: instance._getInnerData(),
                useBulk: model.shouldUseBulk(method),
            });
            guiPopUp.success(
                this._t(pop_up_msg.instance.success.execute, [
                    this._t(this.currentView?.title),
                    parseResponseMessage(response.data),
                ]),
            );
            if (action.onAfter) {
                action.onAfter({ app: this.app, action, instance, response });
            }
            return response;
        } catch (error) {
            const modelValidationError = instance.parseModelError(error?.data);
            this.app.error_handler.showError(
                this._t(pop_up_msg.instance.error.execute, [
                    this._t(this.currentView?.title),
                    this.app.error_handler.errorToString(modelValidationError || error),
                ]),
            );
            if (throwError) {
                throw modelValidationError || error;
            }
        }
    }
}