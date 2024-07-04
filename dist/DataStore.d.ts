import { Execution } from "bpmn-server";
import { IDataStore, IBPMNServer, IInstanceData, IItemData } from "bpmn-server";
import { ServerComponent } from "bpmn-server";
export declare const Instance_collection = "wf_instances";
export declare const Locks_collection = "wf_locks";
export declare const Archive_collection = "wf_archives";
declare class DataStore extends ServerComponent implements IDataStore {
    dbConfiguration: any;
    db: any;
    execution: Execution;
    isModified: boolean;
    isRunning: boolean;
    inSaving: boolean;
    promises: any[];
    locker: any;
    enableSavePoints: boolean;
    constructor(server: IBPMNServer);
    save(instance: any, options?: {}): Promise<void>;
    loadInstance(instanceId: any, options?: {}): Promise<{
        instance: IInstanceData;
        items: any[];
    }>;
    private getItemsFromInstances;
    static seq: number;
    private saveInstance;
    findItem(query: any): Promise<IItemData>;
    findInstance(query: any, options: any): Promise<IInstanceData>;
    convertObj(obj: any, cls: any): any;
    convertColl(coll: any, cls: any): void;
    /**
     *
     * @param query
     * @param option
     * 		-'summary'	minimal data
     * 		- 'full'
     * 		- {projection,sort}
     * @returns
     */
    findInstances(query: any, option?: 'summary' | 'full' | any): Promise<IInstanceData[]>;
    /**
        * scenario:
        *
        * ```
        * itemId			{ items { id : value } }
        * itemKey			{ items {key: value } }
        * instance, task	{ instance: { id: instanceId }, items: { elementId: value }}
        * message			{ items: { messageId: nameofmessage, key: value } {}
        * status			{ items: {status: 'wait' } }
        * custom: { query: query, projection: projection }
        * ```
        * New approach:
        * just like MongoDB
        * ```
        * itemId			{ items { id : value } }
        * itemKey			{ items {key: value } }
        * instance, task	{  id: instanceId , items.elementId: value }
        * message			{ items.messageId: nameofmessage, key: value } {}
        * status			{ items.status: 'wait' } }
        * custom: { query: query, projection: projection }
        * ```

        * Problem with Mongodb:	`projection $elematch returns only the first record`
     *
     * @param query
     */
    findItems(query: any): Promise<IItemData[]>;
    deleteInstances(query: any): Promise<any>;
    /**
     * first time installation of DB
     *
     * creates a new collection and add an index
     *
     * */
    install(): Promise<void>;
    archive(query: any): Promise<void>;
    /**
     *
     * @param model
     * @param afterNodeIds
     */
    updateSource(inst: any, source: any): Promise<string[] | {
        errors: any;
    }>;
}
export { DataStore };
