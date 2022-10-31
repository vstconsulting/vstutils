interface TabSignal {
    emit(signal: string, ...args: unknown[]): void;
    once(signal: string, handler: (...args: unknown[]) => void): void;
}

export declare const signals: TabSignal;
export default signals;

export declare const APP_CREATED: string;
