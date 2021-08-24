import { since, toUnixEpoch } from "@nucleo-nodejs/epoch";
import express, { NextFunction, RequestHandler } from "express";
import {
    ERROR_INTERNAL,
    Manifest,
    ERROR_NOT_FOUND,
    Response,
    ErrorResponse,
    getResponseBody,
} from "@nucleo-nodejs/server";
import { getLogger, Logger } from "@nucleo-nodejs/logger";
import { captureClientIP, captureRequestID } from "./express";
import { UNKNOWN_IP } from "./constants";
import { wrapRESTHandler } from "./rest-handler";

export interface RequestWithMetadata extends express.Request {
    __startTime?: number;
    __clientIP?: string;
    __requestID?: string;
}

/**
 * Common Request Handler
 */
export class CommonHandler {
    debug: boolean;
    logger: Logger;
    trustProxy: boolean;

    constructor(options: { trustProxy?: boolean } = {}) {
        // Set members
        this.logger = getLogger();
        this.debug = process.env.DEBUG === "true";
        this.trustProxy = options.trustProxy === true;
    }

    private logRequest = (req: RequestWithMetadata, httpStatus: number): void => {
        // Get request metadata
        const reqMeta = req as RequestWithMetadata;

        // Get Client IP
        const clientIP = reqMeta.__clientIP || UNKNOWN_IP;
        const elapsedTime = reqMeta.__startTime ? since(reqMeta.__startTime) : "-";
        const requestID = reqMeta.__requestID || "-";

        this.logger.info(
            `Path="${req.method.toUpperCase()} ${
                req.path
            }", ClientIP="${clientIP}", HttpStatus="${httpStatus}", ElapsedTime="${elapsedTime}"`,
            { metadata: { requestID } }
        );
    };

    handleGetAPIStatus = (manifest: Manifest): RequestHandler => {
        // Init start time
        const startedAt = toUnixEpoch(new Date());

        return wrapRESTHandler(
            async (_req: express.Request): Promise<Response> => {
                return {
                    data: {
                        appVersion: manifest.appVersion,
                        buildSignature: manifest.buildSignature,
                        uptime: since(startedAt),
                    },
                };
            }
        );
    };

    handleCaptureRequestMetadata = (req: RequestWithMetadata, _res: express.Response, next: NextFunction): void => {
        req.__clientIP = captureClientIP(req, { trustProxy: this.trustProxy });
        req.__startTime = toUnixEpoch(new Date());
        req.__requestID = captureRequestID(req);
        next();
    };

    handleNotFound = (req: express.Request, res: express.Response, _next: NextFunction): void => {
        // If response has not been sent, then returns resource not found
        if (!res.headersSent) {
            res.status(404).json(ERROR_NOT_FOUND);
        }

        // Log Request result
        this.logRequest(req, res.statusCode);
    };

    handleError = (err: Error, req: express.Request, res: express.Response, _next: express.NextFunction): void => {
        if (!res.headersSent) {
            // Check err
            let errResp: Response;
            if (err instanceof ErrorResponse) {
                errResp = (err as ErrorResponse).compose();
            } else {
                getLogger().error(`unhandled error: ${err.message}`, { error: err });
                errResp = ERROR_INTERNAL.compose();
            }

            // Compose error response body
            const respBody = getResponseBody(errResp);

            // Send response
            res.status(errResp.httpStatus || 500).json(respBody);

            // Log Request
            this.logRequest(req, res.statusCode);
        }
    };
}
