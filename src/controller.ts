import "reflect-metadata";

import { getLogger, Logger } from "@nucleo-nodejs/logger";
import express from "express";
import { ENDPOINTS_KEY } from "./constants";
import { EndpointMetadata } from "./endpoint";
import { HandlerSequenceOptions, HandlerType, PreRequestHandlerMetadata } from "./handler";
import { wrapAsyncHandler } from "./express";
import { wrapRESTHandler } from "./rest-handler";

export abstract class Controller {
    readonly name: string;
    protected readonly debug: boolean;
    protected readonly logger: Logger;

    [k: string]: any;

    protected constructor(name: string, options: { debug?: boolean; logger?: Logger } = { debug: false }) {
        // Set name
        this.name = name;

        // Get debug from options, then fallback to env
        this.debug = options.debug != null ? options.debug : process.env.DEBUG === "true" || false;

        // Create child logger from existing
        const parentLogger = options.logger || getLogger();
        this.logger = parentLogger.createChild(name);
    }

    getRouter = (): express.Router => {
        const router = express.Router();

        // Get endpoints metadata
        const endpoints: EndpointMetadata[] = Reflect.getMetadata(ENDPOINTS_KEY, this);

        endpoints.forEach(({ method, path, handlerType, name }) => {
            // Wrap handler
            let h: express.RequestHandler;
            switch (handlerType) {
                case HandlerType.ExpressHandler: {
                    h = this[name];
                    break;
                }
                case HandlerType.AsyncExpressHandler: {
                    h = wrapAsyncHandler(this[name]);
                    break;
                }
                case HandlerType.RESTHandler: {
                    h = wrapRESTHandler(this[name]);
                    break;
                }
                default: {
                    throw new Error(`unknown handler type of ${name}. HandlerType = ${handlerType}`);
                }
            }

            // Modify route on register
            const handlers: HandlerSequenceOptions = { main: h };
            this.onRegisterRoute(name, handlers);

            // Register handler
            if (handlers.preRequest) {
                router[method](path, handlers.preRequest, handlers.main);
            } else {
                router[method](path, handlers.main);
            }
            this.logger.debug(`Endpoint ${name} added`);
        });

        // Handle custom routing
        this.route(router);

        return router;
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    route = (router: express.Router): void => {
        // Do nothing
    };

    protected onRegisterRoute = (endpointName: string, handlers: HandlerSequenceOptions): void => {
        const metaPropKey = `onRegisterRoute:${endpointName}`;

        // Get metadata
        const preRequestMeta: PreRequestHandlerMetadata[] = Reflect.getMetadata(metaPropKey, this);

        // If empty then return
        if (!preRequestMeta) {
            return;
        }

        // Create preRequest handlers
        const preRequest = [] as express.RequestHandler[];
        preRequestMeta.forEach((middlewareMeta) => {
            // If middleware function not found or is not a function, then return
            const { handlerPropKey, handlerOptions } = middlewareMeta;
            const fn = this[handlerPropKey];
            if (!fn || typeof fn !== "function") {
                this.logger.warn(`"${handlerPropKey}" is not set in ${this.name}. Skipping...`);
                return;
            }

            // Create middleware function and push to preRequest
            preRequest.push(fn(handlerOptions));
            this.logger.debug(`adding preRequest "${handlerPropKey}" to "${endpointName}"`);
        });

        handlers.preRequest = preRequest;
    };
}
