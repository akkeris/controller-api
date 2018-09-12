"use strict"

module.exports = require('./alamo-addons.js')(
    'Alamo Cassandra',
    'cassandra',
    'alamo-cassandra',
    'cassandra',
    {
        'small':1000 * 5,
        'medium':1000 * 10,
        'large':1000 * 30,
    },
    'Dedicated Keyspace on Multi-Tenant Cassandra Cluster ');
