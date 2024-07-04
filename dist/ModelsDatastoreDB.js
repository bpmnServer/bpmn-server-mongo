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
exports.ModelsDatastoreDB = void 0;
const bpmn_server_1 = require("bpmn-server");
const fs = require('fs');
const Path = require('path');
const BpmnModdle = require('bpmn-moddle');
const bpmn_server_2 = require("bpmn-server");
const bpmn_server_3 = require("bpmn-server");
const QueryTranslator_1 = require("./QueryTranslator");
const MongoDB = require('./MongoDB').MongoDB;
const Definition_collection = 'wf_models';
const Events_collection = 'wf_events';
class ModelsDatastoreDB extends bpmn_server_2.ServerComponent {
    constructor(server) {
        super(server);
        this.dbConfiguration = this.configuration.database.MongoDB;
        this.db = new MongoDB(this.dbConfiguration, this.logger);
    }
    get() {
        return __awaiter(this, arguments, void 0, function* (query = {}) {
            const list = yield this.db.find(this.dbConfiguration.db, Definition_collection, query, {});
            return list;
        });
    }
    getList() {
        return __awaiter(this, arguments, void 0, function* (query = {}) {
            var records = yield this.db.find(this.dbConfiguration.db, Definition_collection, query, {});
            //        this.logger.log('find events for ' + " recs:" + records.length);
            const list = [];
            records.forEach(r => { list.push({ name: r.name }); });
            return list;
        });
    }
    /*
     *	loads a definition
     *
     */
    load(name_1) {
        return __awaiter(this, arguments, void 0, function* (name, owner = null) {
            console.log('loading ', name, 'from db');
            let data = yield this.loadModel(name);
            const definition = new bpmn_server_1.Definition(name, data.source, this.server);
            yield definition.load();
            return definition;
        });
    }
    getSource(name_1) {
        return __awaiter(this, arguments, void 0, function* (name, owner = null) {
            let model = yield this.loadModel(name);
            return model.source;
        });
    }
    getSVG(name_1) {
        return __awaiter(this, arguments, void 0, function* (name, owner = null) {
            let model = yield this.loadModel(name);
            return model.svg;
        });
    }
    /*
     *	loads a definition data record from DB
     *
     */
    loadModel(name_1) {
        return __awaiter(this, arguments, void 0, function* (name, owner = null) {
            var records = yield this.db.find(this.dbConfiguration.db, Definition_collection, { name: name }, {});
            this.logger.log('find model for  ' + name + " recs:" + records.length);
            return records[0];
        });
    }
    save(name_1, source_1, svg_1) {
        return __awaiter(this, arguments, void 0, function* (name, source, svg, owner = null) {
            let bpmnModelData = new bpmn_server_3.BpmnModelData(name, source, svg, null, null);
            let definition = new bpmn_server_1.Definition(bpmnModelData.name, bpmnModelData.source, this.server);
            try {
                yield definition.load();
                bpmnModelData.parse(definition);
                yield this.saveModel(bpmnModelData, owner);
                return bpmnModelData;
            }
            catch (exc) {
                console.log('error in save', exc);
                throw exc;
                return null;
            }
        });
    }
    findEvents(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, owner = null) {
            let projection = {}; // this.getProjection(query);
            const events = [];
            let trans;
            let newQuery = query;
            if (query) {
                trans = new QueryTranslator_1.QueryTranslator('events');
                newQuery = trans.translateCriteria(query);
            }
            var records = yield this.db.find(this.dbConfiguration.db, Definition_collection, newQuery, projection);
            //        this.logger.log('...find events for ' + JSON.stringify(query) + "=>" + JSON.stringify(newQuery) + " recs:" + records.length);
            records.forEach(rec => {
                rec.events.forEach(ev => {
                    let pass = true;
                    if (query) {
                        pass = trans.filterItem(ev, newQuery);
                    }
                    if (pass) {
                        ev.modelName = rec.name;
                        ev._id = rec._id;
                        events.push(ev);
                    }
                });
            });
            return events;
        });
    }
    getProjection(query) {
        let match = {};
        let projection = {};
        {
            Object.keys(query).forEach(key => {
                if (key.startsWith('events.')) {
                    let val = query[key];
                    key = key.replace('events.', '');
                    match[key] = val;
                }
            });
            if (Object.keys(match).length == 0)
                projection = { id: 1, name: 1 };
            else
                projection = { id: 1, name: 1, "events": { $elemMatch: match } };
        }
        return projection;
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
            return yield this.db.createIndex(this.dbConfiguration.db, Definition_collection, { name: 1, owner: 1 }, { unique: true });
        });
    }
    import(data_1) {
        return __awaiter(this, arguments, void 0, function* (data, owner = null) {
            return yield this.db.insert(this.dbConfiguration.db, Definition_collection, data);
        });
    }
    updateTimer(name_1) {
        return __awaiter(this, arguments, void 0, function* (name, owner = null) {
            const source = yield this.getSource(name, owner);
            let model = new bpmn_server_3.BpmnModelData(name, source, null, null, null);
            let definition = new bpmn_server_1.Definition(model.name, model.source, this.server);
            yield definition.load();
            model.parse(definition);
            yield this.db.update(this.dbConfiguration.db, Definition_collection, { name: model.name }, {
                $set: {
                    events: model.events
                }
            }, { upsert: false });
            this.logger.log("updating model");
            this.logger.log('DataStore:saving Complete');
            return true;
        });
    }
    saveModel(model_1) {
        return __awaiter(this, arguments, void 0, function* (model, owner = null) {
            this.logger.log("Saving Model " + model.name);
            var recs;
            model.saved = new Date();
            yield this.db.update(this.dbConfiguration.db, Definition_collection, { name: model.name, owner: owner }, {
                $set: {
                    name: model.name, owner: owner, saved: model.saved, source: model.source, svg: model.svg, processes: model.processes, events: model.events
                }
            }, { upsert: true });
            return true;
        });
    }
    deleteModel(name_1) {
        return __awaiter(this, arguments, void 0, function* (name, owner = null) {
            yield this.db.remove(this.dbConfiguration.db, Definition_collection, { name: name });
        });
    }
    renameModel(name_1, newName_1) {
        return __awaiter(this, arguments, void 0, function* (name, newName, owner = null) {
            yield this.db.update(this.dbConfiguration.db, Definition_collection, { name: name }, {
                $set: {
                    name: newName
                }
            }, { upsert: false });
            this.logger.log("updating model");
            this.logger.log('DataStore:saving Complete');
            return true;
        });
    }
    export(name_1, folderPath_1) {
        return __awaiter(this, arguments, void 0, function* (name, folderPath, owner = null) {
            let model = yield this.loadModel(name, owner);
            let fullpath = folderPath + "/" + name + ".bpmn";
            fs.writeFile(fullpath, model.source, function (err) {
                if (err)
                    throw err;
                console.log(`Saved bpmn to ${fullpath}`);
            });
            fullpath = folderPath + "/" + name + ".svg";
            fs.writeFile(fullpath, model.svg, function (err) {
                if (err)
                    throw err;
                console.log(`Saved svg to ${fullpath}`);
            });
        });
    }
    rebuild() {
        return __awaiter(this, arguments, void 0, function* (model = null) {
        });
    }
}
exports.ModelsDatastoreDB = ModelsDatastoreDB;
//# sourceMappingURL=ModelsDatastoreDB.js.map