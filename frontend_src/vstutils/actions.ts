import type { IApp, IAppInitialized } from '@/vstutils/app';
import { guiPopUp, pop_up_msg } from './popUp';
import type { HttpMethods } from './utils';
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

export class ActionsManager {
    app: IAppInitialized;

    constructor(app: IApp) {
        /** @type {App} */
        this.app = app as IAppInitialized;
    }

    requestConfirmation({ title }: { title: string }): Promise<void> {
        return new Promise((resolve) => {
            const root = this.app.rootVm;
            if (typeof root.initConfirmation === 'function') {
                root.initConfirmation(() => resolve(), title);
            } else {
                console.warn('Action confirmation is not available');
            }
        });
    }

    get currentView() {
        return this.app.router.currentRoute.meta?.view as IView;
    }

    execute(args: {
        action: Action;
        instance?: Model;
        instances?: Model[];
        skipConfirmation?: boolean;
        fromList?: boolean;
        disablePopUp: boolean;
    }): Promise<void | Route> {
        const {
            action,
            instance = undefined,
            instances = undefined,
            skipConfirmation = false,
            fromList = false,
            disablePopUp = false,
        } = args;

        if (action.confirmationRequired && !skipConfirmation) {
            return this.requestConfirmation({ title: action.title }).then(() => {
                args.skipConfirmation = true;
                return this.execute(args);
            });
        }

        if (instances) {
            if (action.handlerMany) {
                return action.handlerMany({ action, instances, disablePopUp });
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
            return action.handler({ action, instance, fromList, disablePopUp });
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
    }: {
        action: Action;
        instance?: Model;
        redirect?: boolean;
        disablePopUp?: boolean;
    }): Promise<void> {
        const path = formatPath(action.path!, this.app.router.currentRoute.params, instance);

        try {
            const response = await this.app.api.makeRequest({ useBulk: true, method: action.method!, path });

            if (!disablePopUp) {
                guiPopUp.success(
                    i18n.t(pop_up_msg.instance.success.executeEmpty, [
                        i18n.t(action.title),
                        instance?.getViewFieldString() || i18n.t(this.currentView.title),
                        parseResponseMessage(response.data),
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
            const str = this.app.error_handler.errorToString(error);

            const srt_to_show = i18n.t(pop_up_msg.instance.error.executeEmpty, [
                i18n.t(action.name),
                i18n.t(this.currentView.title),
                str,
                parseResponseMessage((error as Record<string, any>).data),
            ]);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            this.app.error_handler.showError(srt_to_show as string, str);
        }
    }

    async executeWithData<T>({
        action,
        data,
        model,
        method,
        path,
        throwError = false,
        disablePopUp = false,
    }: {
        action: NotEmptyAction;
        data?: Record<string, unknown>;
        model?: typeof Model;
        method?: HttpMethods;
        path: string;
        throwError?: boolean;
        disablePopUp?: boolean;
    }): Promise<void | APIResponse<T>> {
        if (!model) {
            model = action.requestModel;
        }
        if (!method) {
            method = action.method!;
        }
        const instance = new model();
        try {
            // @ts-expect-error models have no types
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
            if (!disablePopUp) {
                guiPopUp.success(
                    i18n.t(pop_up_msg.instance.success.execute, [
                        i18n.t(this.currentView.title),
                        parseResponseMessage(response.data),
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
