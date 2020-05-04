## Dynos

Dynos represent a running process or server (or multiple instances of a process).  Dynos are created by formation changes and deployed code. If no deployments exist, no dynos will exist. Dynos provide the ability to query what the current state of an individual server is, to reboot it, etc.

### Dynos Info

Get information on whats currently running (servers/dynos) for the specified app, and its current state.  The "state" can be one of the possible values: start-failure, app-crashed, waiting, pending, probe-failure, stopping, stopped, running. The "ready" column indicates if the dyno is still actively having traffic routed to it (if its a web) or if its process is showing up otherwise.  Additional info may contain the reason for the app being in this state, additional info is a human readable string.

`GET /apps/{appname}/dynos`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/apps/app-space/dynos
```

**200 "OK" Response**

```json
[
  {
    "attach_url": "",
    "command": "npm start",
    "created_at": "2016-09-27T16:27:20Z",
    "id": "9d3546db-2909-ca8d-d35d-4ae0f848195e",
    "name": "2281474389-1cu1o",
    "release": {
      "id": "93e173a5-5be9-4df2-8345-233d77f99d90",
      "version": 142
    },
    "app": {
      "name": "app-space",
      "id": "62dc0fd3-2cba-4925-8fca-d1129d296d2c"
    },
    "size": "gp2",
    "state": "running",
    "ready": true,
    "type": "web",
    "additional_info":"",
    "updated_at": "2016-09-27T16:27:21Z"
  }
]
```

### Dyno Info

Get information on a specific dyno running.

`GET /apps/{appname}/dyno/{dyno_id_or_name}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/apps/someapp-default/dyno/9d3546db-2909-ca8d-d35d-4ae0f848195e
```

**200 "OK" Response**

```json
{
  "attach_url": "",
  "command": "npm start",
  "created_at": "2016-09-27T16:27:20Z",
  "id": "9d3546db-2909-ca8d-d35d-4ae0f848195e",
  "name": "2281474389-1cu1o",
  "release": {
    "id": "93e173a5-5be9-4df2-8345-233d77f99d90",
    "version": 142
  },
  "app": {
    "name": "app-space",
    "id": "62dc0fd3-2cba-4925-8fca-d1129d296d2c"
  },
  "size": "gp2",
  "state": "Running",
  "ready": true,
  "type": "web",
  "additional_info":"",
  "updated_at": "2016-09-27T16:27:21Z"
}
```

### Dynos Restart (yes plural)

Restarts all dynos (docker containers, servers, what have you) within the application. This is done in a rolling fashion to prevent downtime or outages.

`DELETE /apps/{appname}/dynos`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/apps/someapp-default/dynos
```

**202 "Accepted" Response**

```json
{
  "status":"pending"
}
```

### Dyno Restart

Restarts one dyno type (web, worker, etc) within the application. This is done in a rolling fashion to prevent downtime or outages.

`DELETE /apps/{appname}/dynos/{dyno_type}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/apps/someapp-default/dynos/web
```

**202 "Accepted" Response**

```json
{
  "status":"pending"
}
```


### Dyno Attach

Executes (white listed) commands on a dyno, the provided command is ran on the same server under the same context under the same memory and CPU limitations. The output of the stdout and stderr is returned. An error is returned if the command takes more than one minute. 

White listed commands are hard coded and cannot be changed dynamically.  The current white list is:

* `/^sh -c kill \-[0-9]+ \-1$/`

`POST /apps/{appname}/dynos/{dyno_id_or_name}/actions/attach`

|   Name   |       Type      | Description                                                                                                                                                                                                | Example                                                                                                                            |
|:--------:|:---------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
|   command      | required array of strings | The command to execute (as an array of strings where the first entry is the executable) |  ["echo", "hello"] |
|   stdin        | string | The initial set of stdin  | "" |


**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/someapp-default/web.12333ns-nda11/actions/attach \
  -d '{"command":["echo","Hello"], "stdin":""}'
```

**202 "Accepted" Response**

```json
{
  "stdout":"Hello",
  "stderr":""
}
```
