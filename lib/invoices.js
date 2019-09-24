"use strict"

const crypto = require('crypto');
const httph = require('./http_helper.js');
const fs = require('fs');
const query = require('./query.js');
const uuid = require('uuid');
const common = require('./common.js');

function calc_prorated_amount(id, item) {
  let base = new Date(id);
  let from = Date.UTC(base.getFullYear(), base.getUTCMonth(), 1);
  let to = Date.UTC(base.getFullYear(), base.getUTCMonth() + 1, 0, 23, 59, 59);
  let start = new Date(item.created_at).getTime();
  let original_start = start;
  if(start < from) {
    start = from;
  }
  let end = item.deleted_at ? new Date(item.deleted_at).getTime() : new Date().getTime();
  let original_end = end;
  if(end > to) {
    end = to;
  }
  // break if were outside of our range
  if(end < start) {
    item.billed_price = 0;
    return item;
  }
  let prorate = (end - start)/(to - from);
  item.billed_price = item.price_per_unit * item.quantity * prorate;
  item.billed_price = Math.floor((Math.round(item.billed_price * 100) / 100) * 100) / 100;
  return item;
}

function to_response(id, items) {
  let now = new Date();
  let from = new Date(id);
  from = new Date(from.getFullYear(), from.getUTCMonth(), 1);
  let to = new Date(from.getFullYear(), from.getUTCMonth() + 1, 0, 23, 59, 59);
  if(to.getTime() > now.getTime()) {
    to = now;
  }
  let state = (from.getMonth() === now.getMonth() && from.getFullYear() === now.getFullYear()) ? 2 : 1;
  if (from.getFullYear() > now.getFullYear() || (from.getFullYear() === now.getFullYear() && from.getMonth() > now.getMonth())) {
    state = 2;
  }
  items = items.map(calc_prorated_amount.bind(null, id));

  return {
    "addons_total": items.reduce((a, c) => { return a + (c.type === 'addon' ? c.billed_price : 0) }, 0),
    "database_total": items.reduce((a, c) => { return a + (c.description.indexOf('postgresql') > -1 ? c.billed_price : 0) }, 0),
    "charges_total": items.reduce((a, c) => { return a + c.billed_price; }, 0),
    "created_at": from.toISOString(),
    "credits_total": 0,
    "dyno_units": items.reduce((a, c) => { return a + (c.type === 'dyno' ? c.quantity : 0) }, 0),
    "id": id,
    "number": from.getTime().toString(),
    "payment_status": state === 1 ? 'Paid' : 'Pending',
    "period_end": to.toISOString(),
    "period_start": from.toISOString(),
    "platform_total": items.reduce((a, c) => { return a + (c.type === 'dyno' ? c.billed_price : 0) }, 0),
    state,
    "total": items.reduce((a, c) => { return a + c.billed_price; }, 0),
    "updated_at": from.toISOString(),
    "weighted_dyno_hours": items.reduce((a, c) => { return a + (c.type === 'dyno' ? c.quantity : 0) }, 0) * 24 * to.getDate(),
    items,
  }
}

function to_response_items(invoice) {
  return {
    "organization":invoice.organization,
    "app":{
      "name":invoice.app + '-' + invoice.space
    },
    "description":invoice.item,
    "type":invoice.type,
    "quantity":invoice.quantity,
    "price_per_unit":invoice.monthly_price,
    "created_at":invoice.created_on,
    "deleted_at":invoice.deleted_on
  };
}

let insert_invoice_cache = query.bind(query, fs.readFileSync('./sql/insert_invoice_cache.sql').toString('utf8'), (r) => { return r; });
let get_invoice_cache = query.bind(query, fs.readFileSync('./sql/get_invoice_cache.sql').toString('utf8'), (r) => { return r; });

let list_invoices = query.bind(query, fs.readFileSync('./sql/invoices.sql').toString('utf8'), (r) => { return r; });
let get_invoice = query.bind(query, fs.readFileSync('./sql/invoice.sql').toString('utf8'), to_response_items);
let list_invoices_by_org = query.bind(query, fs.readFileSync('./sql/invoices_by_org.sql').toString('utf8'), (r) => { return r; });
let get_invoice_by_org = query.bind(query, fs.readFileSync('./sql/invoice_by_org.sql').toString('utf8'), to_response_items);
let list_invoices_by_space = query.bind(query, fs.readFileSync('./sql/invoices_by_space.sql').toString('utf8'), (r) => { return r; });
let get_invoice_by_space = query.bind(query, fs.readFileSync('./sql/invoice_by_space.sql').toString('utf8'), to_response_items);

async function get(pg_pool, req, res, regex) {
  let invoice_id = httph.first_match(req.url, regex)

  let invoice = await get_invoice_cache(pg_pool, [invoice_id, null, null])
  if (!invoice || invoice.length === 0) {
    invoice = await get_invoice(pg_pool, [invoice_id])
    let resp = to_response(invoice_id, invoice);
    if (resp.state === 1) {
      await insert_invoice_cache(pg_pool, [invoice_id, null, null, JSON.stringify(invoice)])
    }
  } else {
    invoice = JSON.parse(invoice[0].cache)
  }
  if (!invoice || invoice.length === 0) {
    throw new common.NotFoundError('The specified invoice was not found.')
  }
  return httph.ok_response(res, JSON.stringify(to_response(invoice_id, invoice)));
}

function invoice_format(base, date) {
  return {
    "$ref":base + date.getFullYear() + '-' + ((date.getMonth() + 1) > 9 ? '' : '0') + (date.getMonth() + 1) + '-01'
  };
}

async function list(pg_pool, req, res, regex) {
  let invoices = await list_invoices(pg_pool, [])
  let start = new Date(invoices[0].start);
  let end = new Date();
  let dates = [invoice_format('/account/invoices/',new Date(start.toISOString()))]
  while(start.getTime() < end.getTime()) {
    start.setMonth(start.getMonth() + 1);
    dates.push(invoice_format('/account/invoices/',new Date(start.toISOString())))
  }
  return httph.ok_response(res, JSON.stringify(dates));
}

async function list_by_org(pg_pool, req, res, regex) {
  let org = httph.first_match(req.url, regex);
  let invoices = await list_invoices_by_org(pg_pool, [org])
  if (!invoices || invoices.length === 0) {
    throw new common.NotFoundError('The specified invoice was not found.')
  }
  let start = new Date(invoices[0].start);
  let end = new Date();
  let dates = [invoice_format('/organizations/' + org + '/invoices/',new Date(start.toISOString()))]
  while(start.getTime() < end.getTime()) {
    start.setMonth(start.getMonth() + 1);
    dates.push(invoice_format('/organizations/' + org + '/invoices/',new Date(start.toISOString())))
  }
  return httph.ok_response(res, JSON.stringify(dates));
}

async function get_by_org(pg_pool, req, res, regex) {
  let org = httph.first_match(req.url, regex)
  let invoice_id = httph.second_match(req.url, regex)

  let invoice = await get_invoice_cache(pg_pool, [invoice_id, null, org])
  if (!invoice || invoice.length === 0) {
    invoice = await get_invoice_by_org(pg_pool, [invoice_id, org])
    let resp = to_response(invoice_id, invoice);
    if (resp.state === 1) {
      await insert_invoice_cache(pg_pool, [invoice_id, null, org, JSON.stringify(invoice)])
    }
  } else {
    invoice = JSON.parse(invoice[0].cache)
  }
  if (!invoice || invoice.length === 0) {
    throw new common.NotFoundError('The specified invoice was not found.')
  }
  return httph.ok_response(res, JSON.stringify(to_response(invoice_id, invoice)))
}

async function list_by_space(pg_pool, req, res, regex) {
  let space = httph.first_match(req.url, regex)
  let invoices = await list_invoices_by_space(pg_pool, [space])
  if (!invoices || invoices.length === 0) {
    throw new common.NotFoundError('The specified invoice was not found.')
  }
  let start = new Date(invoices[0].start)
  let end = new Date();
  let dates = [invoice_format('/spaces/' + space + '/invoices/',new Date(start.toISOString()))]
  while(start.getTime() < end.getTime()) {
    start.setMonth(start.getMonth() + 1);
    dates.push(invoice_format('/spaces/' + space + '/invoices/',new Date(start.toISOString())))
  }
  return httph.ok_response(res, JSON.stringify(dates))
}

async function get_by_space(pg_pool, req, res, regex) {
  let space = httph.first_match(req.url, regex);
  let invoice_id = httph.second_match(req.url, regex);
  
  let invoice = await get_invoice_cache(pg_pool, [invoice_id, space, null])
  if (!invoice || invoice.length === 0) {
    invoice = await get_invoice_by_space(pg_pool, [invoice_id, space])
    let resp = to_response(invoice_id, invoice);
    if (resp.state === 1) {
      await insert_invoice_cache(pg_pool, [invoice_id, space, null, JSON.stringify(invoice)])
    }
  } else {
    invoice = JSON.parse(invoice[0].cache)
  }
  if (!invoice || invoice.length === 0) {
    throw new common.NotFoundError('The specified invoice was not found.')
  }
  return httph.ok_response(res, JSON.stringify(to_response(invoice_id, invoice)))
}

module.exports = {
  get, 
  list, 
  list_by_org, 
  get_by_org, 
  list_by_space, 
  get_by_space,
  calc_prorated_amount,
}