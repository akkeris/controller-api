
## App Setups

App setups provide a one-click end-point for creating an application, builds, releases, addons and environment variables.  The payload submitted is referred to as a "blueprint".  Since provisioning this many resources via an API can take considerable time the request is given an id that can be used to query its progress.

### Create a new app setup

`POST /app-setups`

Immediately creates a new application and all specified resources described in the blue print.

|   Name   | Type | Description | Example |
|:--------:|:----:|-------------|---------|
| app:name | required string | The name of the application (alpha numeric, no dashes or spaces or special characters) | events |
| app:organization | required string | The organization name that owns this app | performance |
| app:space | required string | The name of the existing space to add the app too. For the default space use "default".  | perf-dev-us |
| app:stack | optional string | The stack to place the app on | alamo-1 |      
| env | optional object | A key value pair of environment variables to set on the application | `{"FOO":{"value":"BAR"}}` | 
| env[key]:value | optional string | The value for the environment variable | "BAR" |
| env[key]:required | optional boolean | Whether the environment variable is required | true |                                                                                     
| env[key]:description | optional string | Optional string describing its purpose | "Some description" |                                                                                     
| formation | optional object | A key value pair of dyno types and their definitions | `{"web":..., "worker":...}` | 
| formation[key]:quantity | optional number | How many of this dyno type is requested | `{"web":{"quantity":1}}` |
| formation[key]:size | optional string | The size requested for this dyno type (see sizes below) | `{"web":{"size":"gp1"}}` |
| formation[key]:health-check | optional string | The relative URI for checking if the health of the dyno is ok. (web dyno type only) | {"web":{"health-check":"/octhc"}} |
| formation[key]:port | optional number | The port in which the paplication will listne for web traffic (web dyno type only) | `{"web":{"port":5000}}` |
| formation[key]:command | optional string | The command to use to start this dyno from the image, defaults to command specified in docker build. | {"web":{"command":"./start.sh"}} |
| addons | optional object | A key value pair of addons and their plans to provision | {"alamo-postgresql":{"plan": "alamo-postgresql:small"}} | 
| addons[name]:plan | optional string | The name of the plan to provision |  "alamo-postgresql:small" | 
| attachments | optional array | An array of attachments to add to this app |  [{"name":"alamo-postgresql-fire-3242", "app":"event-perf-dev", "id":"392482-32223-344234-232231"}] | 
| attachments[].name | optional string | The name of the addon to attach |  "alamo-postgresql-fire-3242" | 
| attachments[].id | optional string | The id of the addon to attach |  "392482-32223-344234-232231" | 
| attachments[].app | optional string | The name of the app that owns the addon |  "event-perf-dev" | 
| source_blob | required object | A description of the sources to build |  {"checksum":..., "url":..., "version":...} |
| source_blob:checksum | optional string | The hash or checksum of the the build |  "sha1:34982342da32bcacdefeffa32321" |
| source_blob:url | required string | The docker, https or data uri for a docker image, tgz, or zip file containing the source blob or slug. |  "https://somehost/somebuild.zip" |
| source_blob:version | optional string | Metadata as to what version of this is in |  "v12" | 
| log-drains | optional array | An array of objects with the uri to send logs to | [{"url":"https://logdrain/endpoint"}] |
| log-drains[].url | optional string | The syslog+tls, syslog, or https end point to deliver http and app logs to | "syslog+tls://somehost.com:53242/" |
| log-drains[].token | optional string | The token to add when forwarding logs | "123456abcdef" |
| pipeline-couplings | optional array | An array of pipeline couplings which the app should be attached to. | [{"pipeline":"my-pipeline", "stage":"development}] |
| pipeline-couplings[].pipeline | optional string | The name of the pipeline to attach to. | "pipeline-name" |
| pipeline-couplings[].stage | optional string | The stage of the pipeline to attach to | "development" |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/app-setups \
  -d '{"app":{"org":"akkeris", "name":"events", "space":"dev-us"},"source_blob":{"url":"https://host.com/source.zip"}}'
```

**201 "Created" Response**

```json
{
  "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77",
  "created_at":"2016-07-18T14:55:38.190Z",
  "updated_at":"2016-07-18T14:55:38.190Z",
  "app":{
  	  "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae73",
  	  "name":"events"
  },
  "progress":0.3,
  "status":"pending",
  "failure_message":"",
  "manifest_errors":[],
  "postdeploy":null,
  "resolved_success_url":"",
  "build":{
    "id":"11739e5e-4cf7-11e6-beb8-9e71128cae11",
    "status":"queued",
    "output_stream_url":"https://logplex-uri"
  }
}
```

### Check an app setups status

Since requests for creation of an app setup may take some time depending on their complexity the app setup status can be queried to see when its finished or if any errors has occured.

`GET /app-setups/:app_setup_id`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/app-setups/4f739e5e-4cf7-11e6-beb8-9e71128cae77
```

**200 "Created" Response**

```json
{
  "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77",
  "created_at":"2016-07-18T14:55:38.190Z",
  "updated_at":"2016-07-18T14:55:38.190Z",
  "app":{
  	  "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae73",
  	  "name":"events"
  },
  "progress":1,
  "status":"successful",
  "failure_message":"",
  "manifest_errors":[],
  "postdeploy":null,
  "resolved_success_url":"",
  "build":{
    "id":"11739e5e-4cf7-11e6-beb8-9e71128cae11",
    "status":"successful",
    "output_stream_url":"https://logplex-uri"
  }
}
```


### Get an apps blueprint (app setup)

To get an existing apps blue print it can be fetched and subsequently modifed, then resubmitted to `/app-setups` to create a clone of the application easily. The response to the app-setups blue print is the same as the request body to `/app-setups` make cloning or forking an app more convenient.

`GET /apps/{app_name_or_id}/app-setups`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/app-setups
```

**200 "Created" Response**

```json
{
  "app": {
    "locked": false,
    "name": "event",
    "organization": "someorg",
    "region": "us-seattle",
    "personal": false,
    "space": "space",
    "stack": "ds1"
  },
  "env": {
    "JAVA_OPTS": {
      "description": "",
      "required": false,
      "value": "-Duser.timezone=America/Denver -Xmx1024M -Xms512M -XX:+PrintCommandLineFlags"
    },
    "APP_LOG_LEVEL": {
      "description": "",
      "required": false,
      "value": "DEBUG"
    },
    "DB_DRIVER": {
      "description": "",
      "required": false,
      "value": "org.postgresql.Driver"
    },
    "USER_URL": {
      "description": "",
      "required": false,
      "value": "https://foo.com/api/users"
    },
    "PORT": {
      "description": "",
      "required": false,
      "value": "9000"
    }
  },
  "formation": {
    "web": {
      "quantity": 2,
      "size": "galaxy",
      "command": null
    }
  },
  "addons": {
    "alamo-memcached": {
      "plan": "alamo-memcached:medium"
    },
  },
  "attachments": [],
  "source_blob": {
    "checksum": "already-validated-auto-build",
    "url": "docker://docker.io/akkeris/event-6c69f59f-7d19-47ec-8cb8-126607f29232:0.88",
    "version": "https://github.com/akkeris/events-api/commit/c9d3f7166ba35f23a7d0f70e9c76c936093d1d73"
  },
  "log-drains": [
    {
      "url": "syslog+tls://logs.app.com:40841",
      "token": "app-space"
    },
    {
      "url": "syslog://metrics.akkeris.io:9000",
      "token": "app-space"
    }
  ],
  "pipeline-couplings": [],
  "sites": {
    "perf-dev.akkeris.io": {
      "routes": [
        {
          "source_path": "/api/wall/",
          "target_path": "/"
        },
        {
          "source_path": "/api/wall",
          "target_path": "/"
        }
      ]
    }
  }
}
```