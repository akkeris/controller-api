## Log Drains

Log drains allow you to push logs for an app or site to another syslogd on another host (such as papertrail or an internal syslogd instance listening on a port).

### Add a Log Drains ##

`POST /apps/{appname}/log-drains`

`POST /sites/{site}/log-drains`


Creates a new log drain, the only required field in the post is the URL to push data to, the data should have one of the following schemas:

* syslog+tls:// - Push to a SSL (TLS technically) end point with syslogd format.
* syslog:// - Push to a unencrypted TCP end point with syslogd format (note this is not secure, and is not recommended).
* syslog+udp:// - Push to an unencrypted UDP end point with syslogd format (note this may result in out of order logs, is not secure and is not recommended).
* https:// - Push to an encrypted https end point, query parameters, basic auth (https://user:pass@host) are supported. Uses octet framed RFC6587.
* http:// - Push to an unencrypted http end point, query parameters, basic auth (http://user:pass@host) are supported. Uses octet framed RFC6587.


|   Name   |       Type      | Description                                                                                                                                                                                                | Example                                                                                                                            |
|:--------:|:---------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
|  url   | required string | The url that contains where to route information to (see above for acceptable schemas). | syslog+tls://logs.app.com:44112 |


**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/{appname}/log-drains \
  -d '{"url":"syslog+tls://logs.app.com:44112"}'
```

**201 "Created" Response**

```json
{  
  "created_at":"2016-07-18T14:55:38.190Z",
  "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77",
  "addon":{  
     "id":"c164e2c4-958b-a141-d5f4-133a33f0688f",
     "name":"logdrain-sci"
  },
  "updated_at":"2016-07-18T14:55:38.190Z",
  "token":"",
  "url":"syslog+tls://logs.papertrialapp.com:44112"
}
```

***Example: Adding a Log Drain to Papertrail***

1. Go to https://www.papertrailapp.com
2. Login
3. Go to the Dashboard
4. Click "Add Systems" (note the host and port thats assigned)
5. Run the following command replacing the host, port and your app/space:

```
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/{appname}/log-drains \
  -d '{"url":"syslog+tls://{papertrail_hostname}:{papertrail_port}"}'
```

### Delete a Log Drain ##

Disconnects a log drain from forwarding.

`DELETE /apps/{appname}/log-drains/{log_drain_id}`


`DELETE /sites/{site}/log-drains/{log_drain_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/apps/{appname}/log-drains/4f739e5e-4cf7-11e6-beb8-9e71128cae77
```

**200 "OK" Response**

```json
{  
  "created_at":"2016-07-18T14:55:38.190Z",
  "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77",
  "addon":{  
     "id":"c164e2c4-958b-a141-d5f4-133a33f0688f",
     "name":"logdrain-sci"
  },
  "updated_at":"2016-07-18T14:55:38.190Z",
  "token":"",
  "url":"syslog+tls://logs.papertrialapp.com:44112"
}
```

### Log Drain Info ##

Gets information on a current log drain.

`GET /apps/{appname}/log-drians/{log_drain_id}`

`GET /sites/{site}/log-drians/{log_drain_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  https://apps.akkeris.io/apps/{appname}/log-drains/4f739e5e-4cf7-11e6-beb8-9e71128cae77
```

**200 "OK" Response**

```json
{  
  "created_at":"2016-07-18T14:55:38.190Z",
  "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77",
  "addon":{  
     "id":"c164e2c4-958b-a141-d5f4-133a33f0688f",
     "name":"logdrain-sci"
  },
  "updated_at":"2016-07-18T14:55:38.190Z",
  "token":"",
  "url":"syslog+tls://logs.papertrialapp.com:44112"
}
```

### Log Drain List ##

Lists all the log drains for an app.

`GET /apps/{appname}/log-drains`

`GET /sites/{site}/log-drains`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  https://apps.akkeris.io/apps/{appname}/log-drains
```

**200 "OK" Response**

```json
[
  {  
    "created_at":"2016-07-18T14:55:38.190Z",
    "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77",
    "addon":{  
       "id":"c164e2c4-958b-a141-d5f4-133a33f0688f",
       "name":"logdrain-sci"
    },
    "updated_at":"2016-07-18T14:55:38.190Z",
    "token":"",
    "url":"syslog+tls://logs.papertrialapp.com:44112"
  }
]
```



