import "reflect-metadata";
import { HandlerType } from "./handler";
import { EndpointMetadata, parseEndpointPath } from "./endpoint";
import { ENDPOINTS_KEY } from "./constants";

export function RESTEndpoint(endpointPath: string): PropertyDecorator {
    return annotate(endpointPath, HandlerType.RESTHandler);
}

export function AsyncExpressEndpoint(endpointPath: string): PropertyDecorator {
    return annotate(endpointPath, HandlerType.AsyncExpressHandler);
}

export function ExpressEndpoint(endpointPath: string): PropertyDecorator {
    return annotate(endpointPath, HandlerType.ExpressHandler);
}

function annotate(endpointPath: string, handlerType: HandlerType): PropertyDecorator {
    return (target, propertyKey) => {
        // Get existing endpoint list;
        let endpoints: EndpointMetadata[] = Reflect.getMetadata(ENDPOINTS_KEY, target);

        // Init endpoint array if empty
        if (!endpoints) {
            endpoints = [];
        }

        // Push property to endpoints list
        const { method, path } = parseEndpointPath(endpointPath);
        endpoints.push({
            name: String(propertyKey),
            handlerType,
            method,
            path,
        });

        // Re-set attribute
        Reflect.defineMetadata(ENDPOINTS_KEY, endpoints, target);
    };
}
