"use strict"

const config = require('../config.js');

if(config.anomaly_metrics_drain) {
  module.exports = require('./logging-endpoint.js')(
    config.anomaly_metrics_drain, 
    'anomaly', 
    'Anomaly Metrics Scanner', 
    'Track custom metrics emitted in your logs, graph results and setup alerts.', 
    ''
  );
} else {
  console.warn('Environment variable for ANOMALY_METRICS_DRAIN was not found. You will not be able to use the anomaly addon.');
  module.exports = function() {}
}