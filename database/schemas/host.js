let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let hostSchema = mongoose.Schema({
    host: String,
    ip: String,
    title: {
        type: String,
        default: ''
    },
    robotsTxt: String,
    crossDomainXML: String,
    crossDomainPolicy: Schema.Types.Mixed
}, {minimize: false});

module.exports = hostSchema;