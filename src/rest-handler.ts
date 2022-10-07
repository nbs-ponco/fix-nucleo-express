import express, { RequestHandler } from "express";
import { getResponseBody, Response } from "@nbsdev/nucleo-server";

export type RESTHandlerFn = (req: express.Request) => Promise<Response | true>;

export function wrapRESTHandler(fn: RESTHandlerFn): RequestHandler {
    return (req, res, next) => {
        fn(req)
            .then((result) => {
                // If result is true, then skip writing response
                if (result === true) {
                    next();
                    return;
                }

                // If response has been written, then return
                if (res.headersSent) {
                    next();
                    return;
                }

                // Write headers if set in response
                if (result.httpHeaders) {
                    res.set(result.httpHeaders);
                }

                // Get resp body
                const respBody = getResponseBody(result, true);

                // Set http status
                res.status(result.httpStatus || 200).json(respBody);

                // Continue hit next middleware
                next();
            })
            .catch((err: Error) => {
                return next(err);
            });
    };
}
