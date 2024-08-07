import type { IApp, IAppInitialized } from '#vstutils/app';
import { guiPopUp, pop_up_msg } from './popUp';
import { downloadResponse, emptyInnerData } from './utils';
import {
    formatPath,
    parseResponseMessage,
    getRedirectUrlFromResponse,
    joinPaths,
    ViewTypes,
    openPage,
} from './utils';
import type { Action, IView, NotEmptyAction } from './views';
import { i18n } from './translation';
import type { Model } from './models';
import type { Route } from 'vue-router';
import type { APIResponse } from './api';
import type { HttpMethod, InnerData } from './utils';

export class ActionsManager {
    app: IAppInitialized;

    constructor(app: IApp) {
        this.app = app as IAppInitialized;
    }

    get currentView() {
        return this.app.router.currentRoute.meta?.view as IView;
    }

    async execute(args: {
        action: Action;
        instance?: Model;
        instances?: Model[];
        skipConfirmation?: boolean;
        fromList?: boolean;
        disablePopUp?: boolean;
    }): Promise<void | Route> {
        const {
            action,
            instance = undefined,
            instances = undefined,
            skipConfirmation = false,
            fromList = false,
            disablePopUp = false,
        } = args;

        if (action.onBefore) {
            const { prevent } = (await action.onBefore({ operation: action })) ?? {};
            if (prevent) {
                return;
            }
        }

        if (action.confirmationRequired && !skipConfirmation) {
            return this.app.initActionConfirmationModal({ title: action.title }).then(() => {
                args.skipConfirmation = true;
                return this.execute(args);
            });
        }

        if (instances) {
            if (action.handlerMany) {
                action.handlerMany({ action, instances, disablePopUp });
                return Promise.resolve();
            }

            if (action.isEmpty) {
                return Promise.all(
                    instances.map((instance) =>
                        this.executeEmpty({ action, instance, redirect: false, disablePopUp }),
                    ),
                ) as unknown as Promise<void>;
            }

            throw new Error(`Cannot execute action ${action.name} on ${instances.length} instances`);
        }

        if (typeof action.handler === 'function') {
            action.handler({ action, instance, fromList, disablePopUp });
            return Promise.resolve();
        }

        if (action.isEmpty) {
            return this.executeEmpty({ action, instance, disablePopUp });
        }

        if (action.appendFragment) {
            if (this.currentView.type === ViewTypes.LIST && instance) {
                return openPage(
                    joinPaths(
                        this.app.router.currentRoute.path,
                        instance.getPkValue(),
                        action.appendFragment,
                    ),
                );
            }
            return openPage(joinPaths(this.app.router.currentRoute.path, action.appendFragment));
        }

        const path = action.href || action.view?.path;
        if (path) {
            return this.app.router.push(formatPath(path, this.app.router.currentRoute.params, instance));
        }

        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Cannot execute action ${action.name} on instance ${instance}`);
    }

    async executeEmpty({
        action,
        instance,
        redirect = true,
        disablePopUp = false,
        auth,
    }: {
        action: Action;
        instance?: Model;
        redirect?: boolean;
        disablePopUp?: boolean;
        auth?: boolean;
    }): Promise<void> {
        const path = formatPath(action.path!, this.app.router.currentRoute.params, instance);
        auth = auth || action.auth;

        try {
            let response: APIResponse<InnerData> | undefined;

            if (action.isFileResponse) {
                const response = await this.app.api.makeRequest({
                    method: action.method!,
                    path,
                    rawResponse: true,
                    auth,
                });
                await downloadResponse(response);
            } else {
                response = await this.app.api.makeRequest({
                    useBulk: true,
                    method: action.method!,
                    path,
                    auth,
                });
            }

            if (!disablePopUp) {
                guiPopUp.success(
                    i18n.t(pop_up_msg.instance.success.executeEmpty, [
                        i18n.t(action.title),
                        instance?.getViewFieldString() || i18n.t(this.currentView.title),
                        parseResponseMessage(response?.data),
                    ]) as string,
                );
            }

            if (action.onAfter) {
                action.onAfter({ app: this.app, action, instance, response });
            }

            if (redirect) {
                if (response && response.data) {
                    try {
                        const redirectPath = getRedirectUrlFromResponse(response.data, action.responseModel);
                        if (redirectPath) {
                            return void openPage(redirectPath);
                        }
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const str = this.app.error_handler.errorToString(error) as string;

            const srt_to_show = i18n.ts(pop_up_msg.instance.error.executeEmpty, [
                i18n.t(action.name),
                i18n.t(this.currentView.title),
                str,
                parseResponseMessage((error as Record<string, any>).data),
            ]);

            this.app.error_handler.showError(srt_to_show, str);
        }
    }

    async executeWithData<T extends string | Record<string, unknown>>({
        action,
        instance,
        method,
        path,
        throwError = false,
        disablePopUp = false,
        sendAll,
        auth,
    }: {
        action: NotEmptyAction;
        instance: Model;
        method?: HttpMethod;
        path?: string;
        throwError?: boolean;
        disablePopUp?: boolean;
        sendAll?: boolean;
        auth?: boolean;
    }): Promise<void | APIResponse<T>> {
        if (!method) {
            method = action.method!;
        }
        let data: InnerData;
        try {
            data = instance.sandbox.validate();
        } catch (e) {
            this.app.error_handler.defineErrorAndShow(e);
            if (throwError) {
                throw e;
            }
            return;
        }

        const dataToSend = emptyInnerData();
        for (const field of instance._fields.values()) {
            if (sendAll || field.required || instance.sandbox.changedFields.has(field.name)) {
                dataToSend[field.name] = data[field.name];
            }
        }

        try {
            let response: APIResponse<T> | undefined;
            if (action.isFileResponse) {
                const response = await this.app.api.makeRequest({
                    method,
                    path: path ?? formatPath(action.path!, this.app.router.currentRoute.params),
                    data,
                    rawResponse: true,
                    auth,
                });
                await downloadResponse(response);
            } else {
                response = await this.app.api.makeRequest({
                    method,
                    path: path ?? formatPath(action.path!, this.app.router.currentRoute.params),
                    data,
                    useBulk: instance.shouldUseBulk(method),
                    auth,
                });
            }

            if (!disablePopUp) {
                guiPopUp.success(
                    i18n.t(pop_up_msg.instance.success.execute, [
                        i18n.t(this.currentView.title),
                        parseResponseMessage(response?.data),
                    ]) as string,
                );
            }
            if (action.onAfter) {
                action.onAfter({ app: this.app, action, instance, response });
            }
            return response;
        } catch (error) {
            const modelValidationError = instance.parseModelError((error as APIResponse).data);
            this.app.error_handler.showError(
                i18n.t(pop_up_msg.instance.error.execute, [
                    i18n.t(this.currentView.title),
                    this.app.error_handler.errorToString(modelValidationError || error),
                ]) as string,
            );
            if (throwError) {
                throw modelValidationError || error;
            }
        }
    }
}
