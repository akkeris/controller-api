"use strict"

module.exports = require('./alamo-addons.js')(
    'Alamo Cassandra',
    'cassandra',
    'alamo-cassandra',
    'cassandra',
    {
        'small':100 * 50,
        'medium':100 * 100,
        'large':100 * 300,
    },
    'Dedicated Keyspace on Multi-Tenant Cassandra Cluster ');
