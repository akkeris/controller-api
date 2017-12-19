"use strict"

const url = require('url');
const common = require('./common.js');
const config = require('./config.js');
const httph = require('./http_helper.js');
const formation = require('./formations.js');
const queue = require('./queue.js');
const qs = require('querystring');

let query_metrics = null;
const query_named_pod_template = 'sum(rate(%metric%{namespace="%space%", pod_name=~"%app%-.*"}[%resolution%]))';
const query_template = 'avg(%metric%{namespace="%space%",container_name="%app%",job="kubernetes-nodes"})';
const query_rate_template = 'sum(rate(%metric%{namespace="%space%",container_name="%app%",id=~"/init.scope/.+"}[%resolution%]))';
const prometheus_version = process.env.PROMETHEUS_VERSION || 'v1'
const query_template = prometheus_version === 'v1' ? 'avg(%metric%{namespace="%space%",container_name="%app%",kubernetes_role="node"})' : 'avg(%metric%{namespace="%space%",container_name="%app%",job="kubernetes-nodes"})';

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

function query_prometheus_metrics(fqdn, app_name, space_name, from, to, resolution, formation_type, callback) {
  let received = {dyno:formation_type};
  let alamo_app_name = common.alamo.app_name(app_name, formation_type);
  let resolver = (metric, err, data) => {
    if(err) {
      console.error('ERROR receiving from prometheus:', err);
      return callback(err, null);
    }
    let result = JSON.parse(data).data.result;
    let name = metric.replace(/container\_/, '');

    received[name] = {};
    result.forEach((x) => x.values.forEach(y => received[name][Math.floor(y[0])] = y[1]));
    if(Object.keys(received).length === (prometheus_metrics.length + 1)) {
      callback(null, received);
    } else if(Object.keys(received).length > (prometheus_metrics.length + 1)) {
      console.error('ERROR, for some reason we received more responses than we should have from prometheus:', Object.keys(received), prometheus_metrics);
    }
  };
  prometheus_metrics.forEach(function(metric) {
    let q = metric.indexOf('cpu_') > -1 ? 
          query_rate_template : 
          ( metric.indexOf('network_') > -1 ? 
            query_named_pod_template : 
            query_template );
    let query_url = config.prometheus_metrics_url + 
      '/api/v1/query_range?query=' + 
      encodeURIComponent(q.replace(/%metric%/, metric).replace(/%space%/, space_name).replace(/%app%/, alamo_app_name).replace(/%resolution%/, resolution)) + 
      '&start=' + (from.getTime()/1000) + 
      '&end=' + (to.getTime()/1000) +
      '&step=' + resolution;
    httph.request('get', query_url, {}, null, resolver.bind(null,metric));
  });
}

function query_available_influxdb_metrics(fqdn, app_name, space_name, formation_type, callback) {
  let available_metrics = config.influxdb_metrics_url + "/query?db=opentsdb&q=SHOW%20MEASUREMENTS%20where"
  if(app_name && space_name) {
    available_metrics += "%20app%3D'" + common.alamo.app_name(app_name, formation_type) + '-' + space_name + "'";
  }
  if(fqdn) {
    fqdn = fqdn.replace('https://','').replace('http://','').replace('/','');
    available_metrics += "%20fqdn%3D'" + fqdn + "'"
  }
  httph.request("get", available_metrics, {'X-JSON':true}, null, (err, data) => {
    if(err) {
      return callback(err);
    } else {
      if(data.results && data.results[0] && data.results[0].series && data.results[0].series[0]) {
        callback(null, data.results[0].series[0].values.map((x) => { return x[0]; }).slice(0, 100)); // only support 100 metrics to be returned
      } else {
        callback(null, []);
      }
    }
  });
}

function determine_aggregate(metric_name) {
  if(metric_name.indexOf("sample") === -1 && (metric_name.indexOf("count") !== -1 || metric_name.indexOf("router.status") !== -1) ) {
    return "sum";
  }
  return "mean";
}


function influxdb_array_to_object(data) {
  let obj = {};
  data.forEach((x) => {
    let d = new Date(x[0]);
    obj[(d.getTime() / 1000).toString()] = (x[1] === null || typeof(x[1]) === 'undefined') ? "0" : x[1].toString();
  });
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
    let result = !data.results[0].series[0].values.every((x) => { return x[1] === 0 || x[1] === null; });
    return result;
  } else {
    return false;
  }
}

function query_influxdb_network_metrics(fqdn, from, to, resolution, callback) {
  fqdn = fqdn.replace('https://','').replace('http://','').replace('/','');
  query_available_influxdb_metrics(fqdn, null, null, null, (err, metrics) => {
    if(err) {
      return callback(err);
    }
    let q = queue.create();
    metrics.forEach((metric) => {
      let query = `select ${determine_aggregate(metric)}(value) from "${metric}" where fqdn='${fqdn.replace(/'/g, '')}' and time > '${from.toISOString().replace(/'/g, '')}' and time < '${to.toISOString().replace(/'/g, '')}' group by time(${resolution})`;
      q.add(httph.request.bind(null, 'get', config.influxdb_metrics_url + '/query?db=opentsdb&q=' + encodeURIComponent(query), {'X-JSON':true}, null))
    });
    q.runAsyncParallel((errs, metric_data) => {
      if(errs && errs.length !== 0) {
        console.error('ERROR:', errs);
        return callback(errs, null);
      }
      let result = {};
      metric_data.filter(has_data_influxdb.bind(null, "web")).map(normalize_influxdb.bind(null, "web")).forEach((x) => {
        Object.keys(x).forEach((y) => {
          result[y] = x[y];
        })
      });
      callback(null, result);
    });
  });
}

function query_influxdb_app_metrics(fqdn, app_name, space_name, from, to, resolution, formation_type, callback) {
  console.assert(from, 'The from value on app metrics is not defined.');
  console.assert(from, 'The to value on app metrics is not defined.');
  console.assert(from, 'The resolution value on app metrics is not defined.');
  query_available_influxdb_metrics(null, app_name, space_name, formation_type, (err, metrics) => {
    if(err) {
      return callback(err);
    }
    let q = queue.create();
    metrics.forEach((metric) => {
      let query = `select ${determine_aggregate(metric)}(value) from "${metric}" where app = '${common.alamo.app_name(app_name, formation_type)}-${space_name}' and time > '${from.toISOString().replace(/'/g, '')}' and time < '${to.toISOString().replace(/'/g, '')}' group by time(${resolution})`; 
      q.add(httph.request.bind(null, 'get', config.influxdb_metrics_url + '/query?db=opentsdb&q=' + encodeURIComponent(query), {'X-JSON':true}, null))
    });
    q.runAsyncParallel((errs, metric_data) => {
      if(errs && errs.length !== 0) {
        console.error('ERROR:', errs);
        return callback(errs, null);
      }
      let result = {};
      metric_data.filter(has_data_influxdb.bind(null, formation_type)).map(normalize_influxdb.bind(null, formation_type)).forEach((x) => {
        Object.keys(x).forEach((y) => {
          result[y] = x[y];
        })
      });
      callback(null, result);
    });
  });
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
  let formations = await formation.list_types(pg_pool, app.app_name, app.space_name)
  let q = queue.create();
  q.add(query_influxdb_network_metrics.bind(null, app.url, from, to, resolution));
  formations.forEach((formation) => q.add(query_influxdb_app_metrics.bind(null, app.url, app.app_name, app.space_name, from, to, resolution, formation.type)));
  formations.forEach((formation) => q.add(query_prometheus_metrics.bind(null, app.url, app.app_name, app.space_name, from, to, resolution, formation.type)));
  return new Promise((resolve, reject) => {
    q.runParallel((errs, metric_data) => {
      if(errs.length !== 0) {
        console.error('Error: Unable to get metrics:')
        errs.forEach((err) => { console.error(err); });
        reject(new common.InternalServerError())
      } else {
        resolve(normalize_metrics(metric_data)) 
      }
    })
  })
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
  let data = await get_metrics(pg_pool, app_key, from, to, resolution)
  return httph.ok_response(res, JSON.stringify(data));
}

module.exports = {
  http:{
    get:http_metrics
  }
};
