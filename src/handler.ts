import express from "express";

export enum HandlerType {
    ExpressHandler,
    AsyncExpressHandler,
    RESTHandler,
}

export interface HandlerSequenceOptions {
    preRequest?: express.RequestHandler[];
    main: express.RequestHandler;
}

export interface PreRequestHandlerMetadata {
    handlerPropKey: string;
    handlerOptions: unknown;
}

export function PreRequest(handlerPropKey: string, handlerOptions: unknown): PropertyDecorator {
    return (target, propertyKey) => {
        const endpointName = String(propertyKey);
        const metaPropKey = `onRegisterRoute:${endpointName}`;

        // Get existing
        let metaValues: PreRequestHandlerMetadata[] = Reflect.getMetadata(metaPropKey, target);

        // If empty, then init a new preRequest
        if (!metaValues) {
            metaValues = [];
        }

        // Push to
        metaValues.push({
            handlerPropKey,
            handlerOptions,
        });

        // Re-set meta
        Reflect.defineMetadata(metaPropKey, metaValues, target);
    };
}
