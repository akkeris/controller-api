"use strict";

const crypto = require('crypto');
const http = require('http');
const url = require('url')
const uuid = require('uuid');
const config = require('./config.js');
const common = require('./common.js');
const httph = require('./http_helper.js');

let curl = url.parse(config.log_session_url);
let log_session_url = curl.protocol + "//" + curl.host;
let log_session_token = curl.auth ? curl.auth : '';
let log_session_headers = {"content-type":"application/json","authorization":log_session_token}

async function create(pg_pool, app_name, space_name, lines, tail) {
  if(lines < 1 || !Number.isInteger(lines)) {
    throw new common.UnprocessibleEntityError("The specified lines was either not a number or less than 1.")
  } else if(lines > 250) {
    throw new common.UnprocessibleEntityError("The specified lines field was larger than allowed (250 is the maximum).")
  }
  let session_payload = {
    app:app_name,
    space:space_name,
    lines:lines,
    tail:(tail ? true : false)
  };
  let data = await httph.request('post',  log_session_url + '/log-sessions', log_session_headers, session_payload)
  data = JSON.parse(data.toString('utf8'))
  data.created_date = (new Date()).toISOString();
  return data
}

async function http_create(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex)
  let app = await common.app_exists(pg_pool, app_key)
  let payload = await httph.buffer_json(req, res)
  let data = await create(pg_pool, app.app_name, app.space_name, payload.lines, payload.tail)
  return httph.created_response(res, JSON.stringify({
    "created_at":data.created_date,
    "id":data.id,
    "logplex_url":log_session_url + '/log-sessions/' + data.id,
    "updated_at":data.created_date
  }));
}

module.exports = {
  http:{
    create:http_create
  },
  create:create
};