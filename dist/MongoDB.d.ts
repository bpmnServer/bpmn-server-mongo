declare class MongoDB {
    client: any;
    dbConfig: any;
    logger: any;
    operation: any;
    constructor(dbConfig: any, logger: any);
    profilerStart(operation: any): void;
    profilerEnd(): void;
    private getClient;
    find(dbName: any, collName: any, qry: any, projection?: any, sort?: any): Promise<unknown>;
    createIndex(dbName: any, collName: any, index: any, unique?: {}): Promise<unknown>;
    insert(dbName: any, collName: any, docs: any): Promise<unknown>;
    update(dbName: any, collName: any, query: any, updateObject: any, options?: {}): Promise<unknown>;
    updateDelete(dbName: any, collName: any, query: any, updateObject: any, options?: {}): Promise<unknown>;
    remove(dbName: any, collName: any, query: any): Promise<unknown>;
    removeById(dbName: any, collName: any, id: any): Promise<unknown>;
    private connect;
}
export { MongoDB };
