declare module 'mssql' {
    export interface config {
        server?: string;
        port?: number;
        user?: string;
        password?: string;
        database?: string;
        options?: {
            encrypt?: boolean;
            trustServerCertificate?: boolean;
            [key: string]: any;
        };
        pool?: {
            max?: number;
            min?: number;
            idleTimeoutMillis?: number;
        };
        [key: string]: any;
    }

    export interface IResult<T = any> {
        recordsets: T[][];
        recordset: T[];
        output: { [key: string]: any };
        rowsAffected: number[];
    }

    export interface IRequest {
        input(name: string, type: any, value: any): IRequest;
        input(name: string, value: any): IRequest;
        output(name: string, type: any): IRequest;
        query<T = any>(command: string): Promise<IResult<T>>;
        execute<T = any>(procedure: string): Promise<IResult<T>>;
    }

    export class ConnectionPool {
        constructor(config: config);
        connect(): Promise<ConnectionPool>;
        close(): Promise<void>;
        request(): IRequest;
        query<T = any>(command: string): Promise<IResult<T>>;
    }

    export class Transaction {
        constructor(pool: ConnectionPool);
        begin(): Promise<void>;
        commit(): Promise<void>;
        rollback(): Promise<void>;
    }

    export class Request implements IRequest {
        constructor(pool?: ConnectionPool | Transaction);
        input(name: string, type: any, value: any): this;
        input(name: string, value: any): this;
        output(name: string, type: any): this;
        query<T = any>(command: string): Promise<IResult<T>>;
        execute<T = any>(procedure: string): Promise<IResult<T>>;
    }

    // SQL Types
    export const Int: any;
    export const NVarChar: (length?: number | typeof MAX) => any;
    export const VarChar: (length?: number | typeof MAX) => unknown;
    export const Float: any;
    export const DateTime: any;
    export const MAX: unique symbol;

    // Connection function
    export function connect(config: config): Promise<ConnectionPool>;

    const sql: {
        config: config;
        ConnectionPool: typeof ConnectionPool;
        Transaction: typeof Transaction;
        Request: typeof Request;
        Int: any;
        NVarChar: any;
        VarChar: typeof VarChar;
        Float: any;
        DateTime: any;
        MAX: typeof MAX;
        connect: typeof connect;
    };

    export default sql;
}
