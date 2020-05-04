## Log Sessions

Logging includes currently running metrics for the last 6 hours, session logs for applications, and build logs.   These are temporarily available, if logging should be persisted (or metrics) a log drain should be added to your application to push logs into a more persistant place (such as paper trail or librato).

### View Build Logs

`GET /apps/{appname}/builds/{build uuid}/result`

Fetch the logs for a specific build.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/builds/999b5ce9-b60c-42c4-bca5-e442cd86df78/result
```

**200 "OK" Response**

```json
{
  "build":{
    "id":"999b5ce9-b60c-42c4-bca5-e442cd86df78",
    "status":"succeeded"
  },
  "lines":[
    "Getting source code for https://github.com/akkeris/some-repo/master SHA 123456... done",
    "...",
    "Deploying ... done",
    "Finshed: SUCCESS"
  ]
}
```

### View App Logs

`POST /apps/{appname}/log-sessions`


`POST /sites/{site}/log-sessions`

Views the specified amount of lines starting from the end of the most recent log output and back.  This is the logging across all servers running the specified application.

|   Name       |       Type      | Description                                                                                   | Example           |
|:------------:|:---------------:|-----------------------------------------------------------------------------------------------|-------------------|
|   lines      | optional int    | The amount of lines to retrieve from the logs                                                 | 10                |
|    tail      | optional bool   | Whether to tail the logs, defaults to false                                                   | false             |


**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/log-sessions \
  -d '{"lines":10,"tail":true}'
```

**201 "Created" Response**

Note: The logplex url can be requested without authentication, allowing for more streamable means, it also may have a different url than alamo's api depending on the region (so don't hard code the result in anything).

```json
{  
   "created_at":"2016-07-19T21:20:22.593Z",
   "id":"dc8e9cca-c9f0-4ee9-9e20-a40e99f4140e",
   "logplex_url":"http://api.alamoapp.akkeris.io/apps/app-space/log-sessions/eyJsaW5lcyI6NTAsInRhaWwiOmZhbHNlfQ==",
   "updated_at":"2016-07-19T21:20:22.593Z"
}
```

### View App Metrics

Returns the cpu, memory and file system usage metrics for the running app, these are averages and 90th percentile across all running servers for the app.

`GET /apps/{appname}/metrics`

Optional query parameters:

|   Name       |       Type         | Description                                                                                   | Example                  |
|:------------:|:------------------:|-----------------------------------------------------------------------------------------------|--------------------------|
| resolution   | optional string    | The resolution to return, 1m = 1 minute, 1h = 1 hour, 15m, 20m, etc                           | 10m                      |
|    from      | optional date      | From date to look from, in ISO string format.  Defaults to one week                           | 2017-06-20T23:30:45.737Z |
|    to        | optional date      | To date to return to, in ISO string format.  Defaults to now                                  | 2017-06-20T23:30:45.737Z |



**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/metrics
```

**200 "OK" Response**

Returns a key-value pair object of metrics where the key is the metric name and unit, each value is also an object comprised of key-value's where the key is the unix epoch beginning time of the sample, and the value is the value in the units specified in the metric name.

```json
{  
  "cpu_system_seconds_total":{
    1471314070:32,
    3488234889:55
  },
  "cpu_usage_seconds_total"..,
  "cpu_user_seconds_total"..,
  "fs_io_time_seconds_total"..,
  "fs_usage_bytes"..,
  "memory_cache"..,
  "memory_rss"..,
  "memory_usage_bytes"..,
  "memory_working_set_bytes"..,
  "network_receive_bytes_total"..,
  "network_receive_errors_total"..,
  "network_transmit_bytes_total"..,
  "network_transmit_errors_total"..
}
```
