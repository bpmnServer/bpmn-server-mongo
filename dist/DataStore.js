"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStore = exports.Archive_collection = exports.Locks_collection = exports.Instance_collection = void 0;
console.log('bpmn-server-mongo.DataStore');
const bpmn_server_1 = require("bpmn-server");
const bpmn_server_2 = require("bpmn-server");
const InstanceLocker_1 = require("./InstanceLocker");
const QueryTranslator_1 = require("./QueryTranslator");
const fs = require('fs');
const MongoDB = require('./MongoDB').MongoDB;
exports.Instance_collection = 'wf_instances';
exports.Locks_collection = 'wf_locks';
exports.Archive_collection = 'wf_archives';
class DataStore extends bpmn_server_2.ServerComponent {
    constructor(server) {
        super(server);
        this.isModified = false;
        this.isRunning = false;
        this.inSaving = false;
        this.promises = [];
        this.enableSavePoints = false;
        this.dbConfiguration = this.configuration.database.MongoDB;
        this.db = new MongoDB(this.dbConfiguration, this.logger);
        this.locker = new InstanceLocker_1.InstanceLocker(this);
    }
    /*monitorExecution(execution: Execution) {
        this.execution = execution;
        const listener = execution.listener;
    } */
    save(instance_1) {
        return __awaiter(this, arguments, void 0, function* (instance, options = {}) {
            return yield this.saveInstance(instance);
        });
    }
    loadInstance(instanceId_1) {
        return __awaiter(this, arguments, void 0, function* (instanceId, options = {}) {
            const recs = yield this.findInstances({ id: instanceId }, 'full');
            if (recs.length == 0) {
                this.logger.error("Instance is not found for this item");
                return null;
            }
            const instanceData = recs[0];
            //		this.logger.log(" instance obj found" + instanceData.id);
            return { instance: instanceData, items: this.getItemsFromInstances([instanceData]) };
        });
    }
    /*
    Since MongoDB returns the wholde doc (all items), we have to filter only what user asked for
    and transform the data
*/
    getItemsFromInstances(instances, condition = null, trans = null) {
        const items = [];
        instances.forEach(instance => {
            instance.items.forEach(i => {
                let pass = true;
                if (trans)
                    pass = trans.filterItem(i, condition);
                if (pass) {
                    let data;
                    if (instance.tokens[i.tokenId]) {
                        let dp = instance.tokens[i.tokenId].dataPath;
                        if (dp !== '')
                            data = bpmn_server_1.DataHandler.getData(instance.data, dp);
                        else
                            data = instance.data;
                    }
                    else
                        data = instance.data;
                    i['processName'] = instance.name;
                    i['data'] = data;
                    i['instanceId'] = instance.id;
                    i['instanceVersion'] = instance.version;
                    items.push(i);
                }
            });
        });
        return items.sort(function (a, b) { return (a.seq - b.seq); });
    }
    saveInstance(instance_1) {
        return __awaiter(this, arguments, void 0, function* (instance, options = {}) {
            //		this.logger.log("Saving...");
            let saveObject = { version: instance.version, endedAt: instance.endedAt, status: instance.status, saved: instance.saved,
                tokens: instance.tokens, items: instance.items, loops: instance.loops,
                logs: instance.logs, data: instance.data, parentItemId: instance.parentItemId
            };
            if (instance.version == null)
                instance.version = 0;
            else
                instance.version++;
            if (this.enableSavePoints) {
                let lastItem = instance.items[instance.items.length - 1].id;
                let savePoint = { id: lastItem, items: instance.items, loop: instance.loops, tokens: instance.tokens, data: instance.data };
                if (!instance['savePoints'])
                    instance['savePoints'] = {};
                instance['savePoints'][lastItem] = savePoint;
                saveObject['savePoints'] = instance['savePoints'];
            }
            var recs;
            if (!instance.saved) {
                instance.saved = new Date();
                yield this.db.insert(this.dbConfiguration.db, exports.Instance_collection, [instance]);
            }
            else {
                this.promises.push(this.db.update(this.dbConfiguration.db, exports.Instance_collection, { id: instance.id }, {
                    $set: saveObject
                }));
            }
            yield Promise.all(this.promises);
            this.logger.log('..DataStore:saving Complete');
        });
    }
    findItem(query) {
        return __awaiter(this, void 0, void 0, function* () {
            let results = yield this.findItems(query);
            if (results.length == 0)
                throw Error(" No items found for " + JSON.stringify(query));
            else if (results.length > 1)
                throw Error(" More than one record found " + results.length + JSON.stringify(query));
            else
                return results[0];
        });
    }
    findInstance(query, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let results = yield this.findInstances(query, options);
            if (results.length == 0)
                throw Error(" No instance found for " + JSON.stringify(query));
            else if (results.length > 1)
                throw Error(" More than one record found " + results.length + JSON.stringify(query));
            const rec = results[0];
            /*this.convertColl(rec.authorizations, Authorization);
            this.convertColl(rec.involvements, Involvement);
            rec.items.forEach(item => {
                this.convertColl(item.authorizations, Authorization);
                this.convertColl(item.assignments, Assignment);
                this.convertColl(item.notifications, Notification);
    
            }); */
            return rec;
        });
    }
    convertObj(obj, cls) {
        return Object.assign(new cls, obj);
    }
    convertColl(coll, cls) {
        if (coll) {
            for (let i = 0; i < coll.length; i++) {
                const el = coll[i];
                coll[i] = Object.assign(new cls, el);
            }
        }
    }
    /**
     *
     * @param query
     * @param option
     * 		-'summary'	minimal data
     * 		- 'full'
     * 		- {projection,sort}
     * @returns
     */
    findInstances(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, option = 'summary') {
            let projection = null;
            let sort = null;
            if (option == 'summary')
                projection = { source: 0, logs: 0 };
            else if (option['projection'])
                projection = option['projection'];
            if (option['sort'])
                sort = option['sort'];
            var records = yield this.db.find(this.dbConfiguration.db, exports.Instance_collection, query, projection, sort);
            return records;
        });
    }
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
    findItems(query) {
        return __awaiter(this, void 0, void 0, function* () {
            // let us rebuild the query form {status: value} to >  "tokens.items.status": "wait" 
            const trans = new QueryTranslator_1.QueryTranslator('items');
            const result = trans.translateCriteria(query);
            const projection = { id: 1, data: 1, name: 1, version: 1, "items": 1, "tokens": 1 };
            var records = yield this.db.find(this.dbConfiguration.db, exports.Instance_collection, result, projection);
            // console.log('...find items for query:', query, " translated to :", JSON.stringify(result),  " recs:" , records.length)
            const items = this.getItemsFromInstances(records, result, trans);
            //		this.logger.log('...find items for ' + JSON.stringify(query) + " result :" + JSON.stringify(result) + " instances:" + records.length+ " items: "+items.length);
            return items;
        });
    }
    deleteInstances(query) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.cache.shutdown();
            return yield this.db.remove(this.dbConfiguration.db, exports.Instance_collection, query);
        });
    }
    // db.collection.createIndex({ "a.loc": 1, "a.qty": 1 }, { unique: true })
    /**
     * first time installation of DB
     *
     * creates a new collection and add an index
     *
     * */
    install() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.createIndex(this.dbConfiguration.db, exports.Instance_collection, { id: 1 }, { unique: true });
            yield this.db.createIndex(this.dbConfiguration.db, exports.Instance_collection, { "items.id": 1 });
            yield this.db.createIndex(this.dbConfiguration.db, exports.Locks_collection, { id: 1 }, { unique: true });
        });
    }
    archive(query) {
        return __awaiter(this, void 0, void 0, function* () {
            let docs = yield this.db.find(this.dbConfiguration.db, exports.Instance_collection, query, {});
            if (docs.length > 0) {
                yield this.db.insert(this.dbConfiguration.db, exports.Archive_collection, docs);
                yield this.deleteInstances(query);
            }
            console.log('total of ', docs.length, ' archived');
        });
    }
    /**
     *
     * @param model
     * @param afterNodeIds
     */
    updateSource(inst, source) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.db.update(this.dbConfiguration.db, exports.Instance_collection, { id: inst.id }, {
                    $set: { source }
                });
            }
            catch (exc) {
                return { errors: exc };
            }
        });
    }
}
exports.DataStore = DataStore;
// save instance to DB
DataStore.seq = 0;
//# sourceMappingURL=DataStore.js.map