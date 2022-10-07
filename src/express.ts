import express, { RequestHandler } from "express";
import { UNKNOWN_IP } from "./constants";
import { v4 as uuidv4 } from "uuid";
import { ServerConfiguration } from "@nbsdev/nucleo-server";

export type AsyncHandlerFn = (
    req: express.Request,
    res: express.Response,
    next?: express.NextFunction
) => Promise<void>;

// Wrap Async Handler
export function wrapAsyncHandler(fn: AsyncHandlerFn): RequestHandler {
    return (req, res, next) => {
        fn(req, res)
            .then(() => {
                if (!res.headersSent && next) {
                    next();
                }
            })
            .catch((err) => {
                next(err);
            });
    };
}

export function captureRequestID(req: express.Request): string {
    const requestID = req.headers["x-request-id"];
    if (typeof requestID === "string" && requestID !== "") {
        return requestID;
    }

    // Return random uuid
    return uuidv4();
}

export function captureClientIP(req: express.Request, options: { trustProxy?: boolean } = {}): string {
    // Get client IP from X-Real-IP header
    const clientIP = req.headers["x-real-ip"];

    if (clientIP) {
        if (Array.isArray(clientIP) && clientIP.length > 0) {
            return clientIP[0];
        }

        if (typeof clientIP === "string") {
            return clientIP;
        }
    }

    // If trust proxy, get from x-forwarded-for
    if (options.trustProxy) {
        if (req.ip) {
            return req.ip;
        }

        if (req.ips && req.ips.length > 0) {
            return req.ips[0];
        }
    }

    return req.socket.remoteAddress || UNKNOWN_IP;
}

export function getTrustProxyConfig(config: ServerConfiguration): string[] | boolean {
    if (config.trustProxy.length <= 0) {
        return false;
    }

    if (config.trustProxy[0] === "*") {
        return true;
    }

    return config.trustProxy;
}
