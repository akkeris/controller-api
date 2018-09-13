"use strict"

module.exports = require('./alamo-addons.js')(
    'Alamo InfluxDB',
    'influxdb',
    'alamo-influxdb',
    'influxdb',
    {
        'shared':1 * 1,
    },
    'Time series database ');
