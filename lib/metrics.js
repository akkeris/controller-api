"use strict"

const assert = require('assert')
const url = require('url');
const common = require('./common.js');
const config = require('./config.js');
const httph = require('./http_helper.js');
const qs = require('querystring');

let query_metrics = null;
const prometheus_version = process.env.PROMETHEUS_VERSION || 'v2'
const query_template = prometheus_version === 'v1' ? 'avg(%metric%{namespace="%space%",container_name="%app%",kubernetes_role="node"})' : 'avg(%metric%{namespace="%space%",container_name="%app%",job="kubernetes-nodes-cadvisor"})';
const query_named_pod_template = 'sum(rate(%metric%{namespace="%space%", pod_name=~"%app%-.*"}[%resolution%]))';
const query_rate_template = 'sum(rate(%metric%{namespace="%space%",container_name="%app%",id=~"/init.scope/.+"}[%resolution%]))';

const prometheus_metrics = [
  'container_memory_usage_bytes',
  'container_memory_cache',
  'container_memory_rss',
  'container_memory_working_set_bytes',
  'container_cpu_user_seconds_total',
  'container_cpu_usage_seconds_total',
  'container_cpu_system_seconds_total',
  'container_network_receive_bytes_total',
  'container_network_transmit_bytes_total',
  'container_fs_usage_bytes'
];

let influxdb_metrics = {
  'router.requests.count':'requests',
  'router.service.ms':'response_time'
}

async function query_prometheus_metrics(pg_pool, fqdn, app_name, space_name, from, to, resolution, formation_type, callback) {
  let received = {dyno:formation_type};
  let alamo_app_name = common.alamo.app_name(app_name, formation_type);
  let prometheus_url = config.prometheus_metrics_url
  if(!prometheus_url) {
    prometheus_url = await common.alamo.region_api_by_space(pg_pool, space_name)
  }
  await Promise.all(prometheus_metrics.map(async function(metric) {
    let q = metric.indexOf('cpu_') > -1 ? 
          query_rate_template : 
          ( metric.indexOf('network_') > -1 ? 
            query_named_pod_template : 
            query_template );
    let query_url = prometheus_url + 
      '/api/v1/query_range?query=' + 
      encodeURIComponent(q.replace(/%metric%/, metric).replace(/%space%/, space_name).replace(/%app%/, alamo_app_name).replace(/%resolution%/, resolution)) + 
      '&start=' + (from.getTime()/1000) + 
      '&end=' + (to.getTime()/1000) +
      '&step=' + resolution;
    let data = await httph.request('get', query_url, {}, null);
    let result = JSON.parse(data).data.result;
    let name = metric.replace(/container\_/, '');
    received[name] = {};
    result.forEach((x) => x.values.forEach(y => received[name][Math.floor(y[0])] = y[1]));
  }));
  return received;
}

async function query_available_influxdb_metrics(pg_pool, fqdn, app_name, space_name, formation_type, callback) {
  let influx_url = config.influxdb_metrics_url
  if(!influx_url) {
    influx_url = await common.alamo.region_api_by_space(pg_pool, space_name)
  }
  let available_metrics = influx_url + "/query?db=opentsdb&q=SHOW%20MEASUREMENTS%20where"
  if(app_name && space_name) {
    available_metrics += "%20app%3D'" + common.alamo.app_name(app_name, formation_type) + '-' + space_name + "'";
  }
  if(fqdn) {
    fqdn = fqdn.replace('https://','').replace('http://','').replace('/','');
    available_metrics += "%20fqdn%3D'" + fqdn + "'"
  }
  let data = await httph.request("get", available_metrics, {'X-JSON':true}, null) 
  if(data.results && data.results[0] && data.results[0].series && data.results[0].series[0]) {
    return data.results[0].series[0].values.map((x) => { return x[0]; }).slice(0, 100); // only support 100 metrics to be returned
  } else {
    return [];
  }
}

function determine_aggregate(metric_name) {
  if(metric_name.indexOf("sample") === -1 && (metric_name.indexOf("count") !== -1 || metric_name.indexOf("router.status") !== -1) ) {
    return "sum";
  }
  return "mean";
}


function influxdb_array_to_object(data) {
  let obj = {};
  data.forEach((x) => obj[((new Date(x[0])).getTime() / 1000).toString()] = (x[1] === null || typeof(x[1]) === 'undefined') ? "0" : x[1].toString());
  return obj;
}

function normalize_influxdb(dyno, data) {
  let result = {"dyno":dyno};
  if(data.results && data.results[0] && data.results[0].series && data.results[0].series[0]) {
    let name = data.results[0].series[0].name;
    if(influxdb_metrics[name]) {
      name = influxdb_metrics[name];
    }
    result[name.replace(/\./g, '_')] = influxdb_array_to_object(data.results[0].series[0].values);
  }
  return result;
}

function has_data_influxdb(dyno, data) {
  if(data.results && data.results[0] && data.results[0].series && data.results[0].series[0]) {
    return !data.results[0].series[0].values.every((x) => { return x[1] === 0 || x[1] === null; });
  } else {
    return false;
  }
}

async function query_influxdb_network_metrics(pg_pool, space_name, fqdn, from, to, resolution) {
  let influx_url = config.influxdb_metrics_url
  if(!influx_url) {
    influx_url = await common.alamo.region_api_by_space(pg_pool, space_name)
  }
  fqdn = fqdn.replace('https://','').replace('http://','').replace('/','');
  let metrics = await query_available_influxdb_metrics(pg_pool, fqdn, null, space_name, null)
  let metrics_data = await Promise.all(metrics.map((metric) => {
    let query = `select ${determine_aggregate(metric)}(value) from "${metric}" where fqdn='${fqdn.replace(/'/g, '')}' and time > '${from.toISOString().replace(/'/g, '')}' and time < '${to.toISOString().replace(/'/g, '')}' group by time(${resolution})`;
    return httph.request('get', influx_url + '/query?db=opentsdb&q=' + encodeURIComponent(query), {'X-JSON':true}, null)
  }))
  let result = {};
  metrics_data
    .filter(has_data_influxdb.bind(null, "web"))
    .map(normalize_influxdb.bind(null, "web"))
    .forEach((x) => Object.keys(x).forEach((y) => result[y] = x[y] ) );
  return result
}

async function query_influxdb_app_metrics(pg_pool, fqdn, app_name, space_name, from, to, resolution, formation_type) {
  assert.ok(from, 'The from value on app metrics is not defined.');
  assert.ok(from, 'The to value on app metrics is not defined.');
  assert.ok(from, 'The resolution value on app metrics is not defined.');

  let influx_url = config.influxdb_metrics_url
  if(!influx_url) {
    influx_url = await common.alamo.region_api_by_space(pg_pool, space_name)
  }

  let metrics = await query_available_influxdb_metrics(pg_pool, null, app_name, space_name, formation_type)
  let metrics_data = await Promise.all(metrics.map((metric) => {
    let query = `select ${determine_aggregate(metric)}(value) from "${metric}" where app = '${common.alamo.app_name(app_name, formation_type)}-${space_name}' and time > '${from.toISOString().replace(/'/g, '')}' and time < '${to.toISOString().replace(/'/g, '')}' group by time(${resolution})`; 
    return httph.request('get', influx_url + '/query?db=opentsdb&q=' + encodeURIComponent(query), {'X-JSON':true}, null)
  }));
  let result = {};
  metrics_data
    .filter(has_data_influxdb.bind(null, formation_type))
    .map(normalize_influxdb.bind(null, formation_type))
    .forEach((x) => Object.keys(x).forEach((y) => result[y] = x[y] ));
  return result;
}

function normalize_metrics(metric_data) {
  let metrics = {};
  if(metric_data) {
    metric_data.forEach(entry => {
      if(entry.dyno) {
        metrics[entry.dyno] = metrics[entry.dyno] || {};
        Object.keys(entry).forEach(key => {
          if(key !== 'dyno') {
            metrics[entry.dyno][key] = entry[key];
          }
        });
      }
    });
  }
  return metrics;
}

async function get_metrics(pg_pool, app_key, from, to, resolution) {
  let app = await common.app_exists(pg_pool, app_key);
  let formations = await common.formations_exists(pg_pool, app.app_uuid)
  return normalize_metrics(await Promise.all([query_influxdb_network_metrics(pg_pool, app.space_name, app.url, from, to, resolution)]
    .concat(formations.map((formation) => query_influxdb_app_metrics(pg_pool, app.url, app.app_name, app.space_name, from, to, resolution, formation.type)))
    .concat(formations.map((formation) => query_prometheus_metrics(pg_pool, app.url, app.app_name, app.space_name, from, to, resolution, formation.type)))));
}

async function http_metrics(pg_pool, req, res, regex) {
  let app_key = httph.first_match(req.url, regex);
  let params = qs.parse(url.parse(req.url).query);
  let to = params.to ? new Date(params.to) : new Date();
  let from = params.from ? new Date(params.from) : new Date(to);
  if(to.getTime() === from.getTime()) {
    from.setDate(from.getDate() - 1)
  }
  let resolution = params.resolution || '30m';
  if(/^[0-9]+[monidahuryea]+$/.exec(resolution) === null) {
    throw new common.BadRequestError("Invalid request, resolution must be [0-9][resolution]");
  }
  return httph.ok_response(res, JSON.stringify(await get_metrics(pg_pool, app_key, from, to, resolution)));
}

module.exports = {
  http:{
    get:http_metrics
  }
};
