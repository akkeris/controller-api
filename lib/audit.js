"use strict"

const url = require('url');
const common = require('./common.js');
const httph = require('./http_helper.js');
const elasticsearch=require('elasticsearch');

async function get(req, res, regex) {
    let uri = new url.URL(req.url, 'http://'+req.headers.host)
    let audits = await common.query_audits(uri)
    return httph.ok_response(res, JSON.stringify(audits.hits.hits.map((x) => {
        return x["_source"]
    }
    )));
}

module.exports = {
    get
}