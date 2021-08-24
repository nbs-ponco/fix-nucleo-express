import express from "express";

export class QueryParser {
    private readonly query: any;

    constructor(req: express.Request) {
        this.query = req.query;
    }

    getInt = (k: string): number | undefined => {
        const v = this.query[k];
        if (!v) {
            return undefined;
        }

        const x = parseInt(v);
        if (Number.isFinite(x)) {
            return x;
        }

        return undefined;
    };

    getString = (k: string): string | undefined => {
        return this.query[k];
    };

    getIntArray = (k: string): number[] | undefined => {
        // Get raw value
        const v = this.query[k] as string;

        // If empty, return undefined
        if (!v) {
            return undefined;
        }

        // Split by comma
        return v
            .split(",")
            .map<number>((str) => parseInt(str))
            .filter((n) => Number.isFinite(n));
    };

    getBoolean = (k: string): boolean | undefined => {
        // Get value
        const v = this.query[k];

        if (!v) {
            return undefined;
        }
        return v.toLowerCase() === "true";
    };
}
