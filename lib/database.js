const mongoose = require('@taluoo/mongoose-helper');
const hostSchema = require('../database/schemas/host');

class Database {
    constructor(uri = 'mongodb://localhost:27018/hosts') {
        this.uri = uri;
    }

    async init() {
        this.connection = await mongoose.initConnection(this.uri);
        this.HostModel = this.connection.model('host', hostSchema);
    }
}

module.exports = Database;