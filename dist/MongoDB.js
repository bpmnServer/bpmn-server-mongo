'use strict';
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
exports.MongoDB = void 0;
const MongoClient = require('mongodb').MongoClient;
const MongoDb = require('mongodb');
const assert = require('assert');
class MongoDB {
    constructor(dbConfig, logger) {
        this.dbConfig = dbConfig;
        this.logger = logger;
    }
    profilerStart(operation) {
        if (process.env.ENABLE_PROFILER === 'true')
            console.time(operation);
        this.operation = operation;
    }
    profilerEnd() {
        if (process.env.ENABLE_PROFILER === 'true')
            console.timeEnd(this.operation);
    }
    getClient() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.client == null) {
                this.client = yield this.connect();
            }
            return this.client;
        });
    }
    find(dbName_1, collName_1, qry_1) {
        return __awaiter(this, arguments, void 0, function* (dbName, collName, qry, projection = null, sort = null) {
            var client = yield this.getClient();
            const db = client.db(dbName);
            const collection = db.collection(collName);
            const self = this;
            return new Promise(function (resolve, reject) {
                // Use connect method to connect to the Server
                let cursor;
                self.profilerStart('>mongo.find:' + collName);
                if (projection)
                    cursor = collection.find(qry).project(projection);
                else if (sort)
                    cursor = collection.find(qry).sort(sort);
                else
                    cursor = collection.find(qry);
                self.profilerEnd();
                cursor.toArray(function (err, docs) {
                    // Do async job
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(docs);
                    }
                });
            });
        });
    }
    // db.collection.createIndex( { "a.loc": 1, "a.qty": 1 }, { unique: true } )
    createIndex(dbName_1, collName_1, index_1) {
        return __awaiter(this, arguments, void 0, function* (dbName, collName, index, unique = {}) {
            var client = yield this.getClient();
            const db = client.db(dbName);
            const collection = db.collection(collName);
            return new Promise(function (resolve, reject) {
                collection.createIndex(index, unique, function (err, result) {
                    if (err) {
                        if (err.code == 85)
                            console.log('index for ' + JSON.stringify(index) + ' already exists for collection "' + collName + '"');
                        else
                            console.log('error', err);
                        resolve(null);
                    }
                    else {
                        //  self.logger.log(" inserted " + result.result);
                        console.log('index named "' + result + '" was created for collection "' + collName + '"');
                        resolve(result);
                    }
                });
            });
        });
    }
    insert(dbName, collName, docs) {
        return __awaiter(this, void 0, void 0, function* () {
            var client = yield this.getClient();
            // Get the documents collection
            const db = client.db(dbName);
            const collection = db.collection(collName);
            // Insert some documents
            let self = this;
            return new Promise(function (resolve, reject) {
                self.profilerStart('>mongo.insert:' + collName);
                collection.insertMany(docs, function (err, result) {
                    self.profilerEnd();
                    if (err) {
                        reject(err);
                    }
                    else {
                        // self.logger.log(" inserted " + result.result.n);
                        //                console.log(result);
                        resolve(result.result.n);
                    }
                });
            });
        });
    }
    update(dbName_1, collName_1, query_1, updateObject_1) {
        return __awaiter(this, arguments, void 0, function* (dbName, collName, query, updateObject, options = {}) {
            var client = yield this.getClient();
            // Get the documents collection
            const db = client.db(dbName);
            const collection = db.collection(collName);
            // Insert some documents
            let self = this;
            return new Promise(function (resolve, reject) {
                self.profilerStart('>mongo.update:' + collName);
                collection.updateOne(query, updateObject, options, function (err, result) {
                    self.profilerEnd();
                    if (err) {
                        reject(err);
                    }
                    else {
                        self.logger.log(" updated " + JSON.parse(result).n);
                        resolve(JSON.parse(result).n);
                    }
                });
            });
        });
    }
    updateDelete(dbName_1, collName_1, query_1, updateObject_1) {
        return __awaiter(this, arguments, void 0, function* (dbName, collName, query, updateObject, options = {}) {
            var client = yield this.getClient();
            // Get the documents collection
            const db = client.db(dbName);
            const collection = db.collection(collName);
            // Insert some documents
            let self = this;
            return new Promise(function (resolve, reject) {
                self.profilerStart('>mongo.update:' + collName);
                collection.update(query, updateObject, options, function (err, result) {
                    self.profilerEnd();
                    if (err) {
                        reject(err);
                    }
                    else {
                        self.logger.log(" updated " + JSON.parse(result).n);
                        resolve(JSON.parse(result).n);
                    }
                });
            });
        });
    }
    remove(dbName, collName, query) {
        return __awaiter(this, void 0, void 0, function* () {
            var client = yield this.getClient();
            // Get the documents collection
            const db = client.db(dbName);
            const collection = db.collection(collName);
            // Insert some documents
            let self = this;
            return new Promise(function (resolve, reject) {
                self.profilerStart('>mongo.remove:' + collName);
                collection.deleteMany(query, function (err, result) {
                    self.profilerEnd();
                    if (err) {
                        self.logger.log("error " + err);
                        reject(err);
                    }
                    else {
                        self.logger.log("remove done for  " + JSON.parse(result).n + " docs in " + collName);
                        resolve(result);
                    }
                });
            });
        });
    }
    removeById(dbName, collName, id) {
        return __awaiter(this, void 0, void 0, function* () {
            var client = yield this.getClient();
            // Get the documents collection
            const db = client.db(dbName);
            const collection = db.collection(collName);
            // Insert some documents
            let self = this;
            return new Promise(function (resolve, reject) {
                collection.deleteOne({ _id: new MongoDb.ObjectID(id) }, function (err, result) {
                    if (err) {
                        self.logger.log("error " + err);
                        reject(err);
                    }
                    else {
                        self.logger.log("remove done for " + id + " >" + JSON.parse(result).n);
                        resolve(result);
                    }
                });
            });
        });
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            // Return new promise 
            const client = new MongoClient(this.dbConfig.db_url, { useUnifiedTopology: true });
            return new Promise(function (resolve, reject) {
                // Use connect method to connect to the Server
                client.connect(function (err) {
                    // Do async job
                    if (err) {
                        reject(err);
                        client.close();
                    }
                    else {
                        resolve(client);
                    }
                });
            });
        });
    }
}
exports.MongoDB = MongoDB;
//# sourceMappingURL=MongoDB.js.map