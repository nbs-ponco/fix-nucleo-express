import { HttpMethod } from "@nucleo-nodejs/server";
import { HandlerType } from "./handler";

export interface EndpointMetadata {
    method: HttpMethod;
    path: string;
    name: string;
    handlerType: HandlerType;
}

export function parseEndpointPath(i: string): { method: HttpMethod; path: string } {
    // Split method and path
    const tmp = i.split(" ", 2);
    if (tmp.length !== 2) {
        throw new Error(`Input endpoint format must be "METHOD /path/". Got "${i}" instead`);
    }

    // Validate method
    const method = tmp[0].toLowerCase();
    switch (method) {
        case "get":
        case "post":
        case "put":
        case "delete":
        case "patch":
        case "options":
        case "head": {
            break;
        }
        default: {
            throw new Error(`unsupported http method "${method}"`);
        }
    }

    return {
        method,
        path: tmp[1],
    };
}
