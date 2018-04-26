# Overview

The Platform Apps API empowers developers to build, extend and combine Akkeris functionality with other services, tooling and systems. You can use this API to programmatically create apps, provision add-ons, promote pipelines and any other tasks you can complete with the CLI or UI. In-fact the CLI and UI use this API for all of their interactions, commands and operations.

## Authentication

OAuth should be used to authorize and revoke access to your account to yourself and third parties. You can either setup a new OAuth2 application with the Akkeris Auth API to retrieve tokens dynamically from end users or may use your own personal access token to authenticate against this API.  To setup a service others can use, see the article Auth API.

For personal scripts you may use your personal access token, note that you should never give this token to anyone. To get a personal access token run `aka token`, this value is along string of numbers and letters similar to `2173f7b4a07be08543e113a47c33b617771f5329`.  This is your bearer token that can be passed in to the `Authorization` header to authenticate any request.  

```bash
curl -H "Authorization: Bearer `aka token`" https://apps.akkeris.io/apps
```

> **tip**
> Remember to replace `apps.akkeris.io` with your Akkeris API host.


## Apps

An application is a collection of servers (or dynos) which run builds represented as releases once deployed.

### Create a new app

`POST /apps`

Immediately creates a new application container in the specified space requested. Once you've created an application you should have fun, because no one will do it for you; you should do it for yourself. Note that the space, name, org and port cannot be reassigned or updated once created.

|   Name   |       Type      | Description                                                                                                                                                                                                | Example                                                                                                                            |
|:--------:|:---------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
|    org   | required string | Organization name, alphanumeric only                                                                                                                                                                       | akkeris                                                                                                                           |
|   name   | required string | The name of the application (alpha numeric, no dashes or spaces or special characters)                                                                                                                     | events                                                                                                                             |
|   space  | required string | The name of the existing space to add the app too. For the default space use "default".                                                                                                                    | perf-dev-us                                                                                                                        |
                                                                                                                             |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps \
  -d '{"org":"akkeris", "name":"events", "space":"perf-dev-us"}'
```

**201 "Created" Response**

```json
{  
  "archived_at":"2016-07-18T14:55:38.190Z",
  "buildpack_provided_description":"default",
  "build_stack":{  
     "id":"6875216c-d683-060a-a133-ff770775833e",
     "name":"alamo-1"
  },
  "created_at":"2016-07-18T14:55:38.190Z",
  "git_url":"",
  "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77",
  "maintenance":false,
  "name":"events",
  "key":"events-perf-dev-us",
  "owner":{  
     "email":"",
     "id":"09eac4cd-4824-f569-bdc4-420656e65ce2"
  },
  "organization":{  
     "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
     "name":"akkeris"
  },
  "preview":{
    "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
  },
  "region":{  
     "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
     "name":"us-seattle"
  },
  "released_at":"2016-07-18T14:55:38.190Z",
  "repo_size":0,
  "slug_size":0,
  "space":{  
     "id":"c164e2c4-958b-a141-d5f4-133a33f0688f",
     "name":"perf-dev-us",
     "compliance":""
  },
  "stack":{  
     "id":"6875216c-d683-060a-a133-ff770775833e",
     "name":"ds1"
  },
  "updated_at":"2016-07-18T14:55:38.190Z",
  "web_url":"https://events-perf-dev-us.alamoapp.akkeris.io"
}
```

### Update an app

`PATCH /apps`

Updates the maintenance mode of an application, note that build_stack and name are not currently updatable but are there for future use.

|   Name   |       Type      | Description                                                                                                                                                                                                | Example                                                                                                                            |
|:--------:|:---------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
|    maintenance   | boolean | True or false value indicating whether to place the app into maintenance mode. | true                                                                                                                           |
|   name   | required string | Updates the app name (note currently does not work, placeholder for future feature) | events                                                                                                                             |
|   build_stack  | required string | Updates the build stack to use for this app (note this currently does not work place holder for future feature) | ds1 | |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X PATCH \
  https://apps.akkeris.io/apps/events-perf-dev-us \
  -d '{"maintenance":true, "name":"events", "build_stack":"ds1"}'
```

**200 "OK" Response**

```json
{  
  "archived_at":"2016-07-18T14:55:38.190Z",
  "buildpack_provided_description":"default",
  "build_stack":{  
     "id":"6875216c-d683-060a-a133-ff770775833e",
     "name":"alamo-1"
  },
  "created_at":"2016-07-18T14:55:38.190Z",
  "git_url":"",
  "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77",
  "maintenance":true,
  "name":"events",
  "key":"events-perf-dev-us",
  "owner":{  
     "email":"",
     "id":"09eac4cd-4824-f569-bdc4-420656e65ce2"
  },
  "organization":{  
     "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
     "name":"akkeris"
  },
  "region":{  
     "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
     "name":"us-seattle"
  },
  "released_at":"2016-07-18T14:55:38.190Z",
  "repo_size":0,
  "slug_size":0,
  "space":{  
     "id":"c164e2c4-958b-a141-d5f4-133a33f0688f",
     "name":"perf-dev-us",
     "compliance":""
  },
  "stack":{  
     "id":"6875216c-d683-060a-a133-ff770775833e",
     "name":"ds1"
  },
  "updated_at":"2016-07-18T14:55:38.190Z",
  "web_url":"https://events-perf-dev-us.alamoapp.akkeris.io"
}
```


**400 "Bad Request" Response**

This is returned if the build stack or name attempts to be changed.


### List Apps

`GET /apps`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps
```

**200 "OK" Response**

```json
[
  {  
    "archived_at":"2016-07-18T14:55:38.190Z",
    "buildpack_provided_description":"default",
    "build_stack":{  
       "id":"6875216c-d683-060a-a133-ff770775833e",
       "name":"alamo-1"
    },
    "created_at":"2016-07-18T14:55:38.190Z",
    "git_url":"",
    "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77",
    "maintenance":false,
    "name":"events",
    "key":"events-perf-dev-us",
    "owner":{  
       "email":"",
       "id":"09eac4cd-4824-f569-bdc4-420656e65ce2"
    },
    "organization":{  
       "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
       "name":"akkeris"
    },
    "region":{  
       "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
       "name":"us-seattle"
    },
    "released_at":"2016-07-18T14:55:38.190Z",
    "repo_size":0,
    "slug_size":0,
    "space":{  
       "id":"c164e2c4-958b-a141-d5f4-133a33f0688f",
       "name":"perf-dev-us",
       "compliance":""
    },
    "stack":{  
       "id":"6875216c-d683-060a-a133-ff770775833e",
       "name":"alamo-1"
    },
    "updated_at":"2016-07-18T14:55:38.190Z",
    "web_url":"https://events-perf-dev-us.alamoapp.akkeris.io"
  }
]
```

### App Info

`GET /apps/{app_name_or_id}`

Fetches the application information.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/events-perf-dev-us
```

**200 "OK" Response**

```json
{  
  "archived_at":"2016-07-18T14:55:38.190Z",
  "buildpack_provided_description":"default",
  "build_stack":{  
     "id":"6875216c-d683-060a-a133-ff770775833e",
     "name":"alamo-1"
  },
  "created_at":"2016-07-18T14:55:38.190Z",
  "git_url":"",
  "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77",
  "maintenance":false,
  "name":"events",
  "key":"events-perf-dev-us",
  "owner":{  
     "email":"",
     "id":"09eac4cd-4824-f569-bdc4-420656e65ce2"
  },
  "organization":{  
     "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
     "name":"akkeris"
  },
  "region":{  
     "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
     "name":"us-seattle"
  },
  "released_at":"2016-07-18T14:55:38.190Z",
  "repo_size":0,
  "slug_size":0,
  "space":{  
     "id":"c164e2c4-958b-a141-d5f4-133a33f0688f",
     "name":"perf-dev-us",
     "compliance":""
  },
  "stack":{  
     "id":"6875216c-d683-060a-a133-ff770775833e",
     "name":"alamo-1"
  },
  "updated_at":"2016-07-18T14:55:38.190Z",
  "web_url":"https://events-perf-dev-us.alamoapp.akkeris.io"
}
```


### App Delete

`DELETE /apps/{appname}`

Permenantly and immediately shutdown and remove the application forever.  Note that once an application is deleted it is not recoverable and all of its history is lost, use this with caution.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/apps/events-perf-dev-us
```

**200 "OK" Response**

```json
{  
  "archived_at":"2016-07-18T14:55:38.190Z",
  "buildpack_provided_description":"default",
  "build_stack":{  
     "id":"6875216c-d683-060a-a133-ff770775833e",
     "name":"alamo-1"
  },
  "created_at":"2016-07-18T14:55:38.190Z",
  "git_url":"",
  "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77",
  "maintenance":false,
  "name":"events",
  "key":"events-perf-dev-us",
  "result":"successful",
  "owner":{  
     "email":"",
     "id":"09eac4cd-4824-f569-bdc4-420656e65ce2"
  },
  "organization":{  
     "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
     "name":"akkeris"
  },
  "region":{  
     "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
     "name":"us-seattle"
  },
  "released_at":"2016-07-18T14:55:38.190Z",
  "repo_size":0,
  "slug_size":0,
  "space":{  
     "id":"c164e2c4-958b-a141-d5f4-133a33f0688f",
     "name":"perf-dev-us",
     "compliance":""
  },
  "stack":{  
     "id":"6875216c-d683-060a-a133-ff770775833e",
     "name":"alamo-1"
  },
  "updated_at":"2016-07-18T14:55:38.190Z",
  "web_url":"https://events-perf-dev-us.alamoapp.akkeris.io"
}
```

### List App Previews

`GET /apps/{appname}/previews`

Preview apps are forked applications that are running a feature branch of code proposed to be merged into the source application.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/events-perf-dev/previews
```

**200 "OK" Response**

```json
[
  {
    "id":"6115216c-d683-060a-a133-ff7707758311",
    "app":{
      "id":"73764651-4cf7-11e6-beb8-1121128ca377"
    },
    "source":{
      "app":{
        "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77",
        "name":"events-perf-dev"
      },
      "app-setup":{
        "id":"55739e5e-4cf7-1155-beb8-9e711222ae11"
      },
      "trigger":{
        "type":"github-pull-request",
        "id":"feature-branch-name"
      }
    },
    "created_at":"2016-07-18T14:55:38.190Z",
    "updated_at":"2016-07-18T14:55:38.190Z"
  }
]
```


## App Setup

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
| formation[key]:size | optional string | The size requested for this dyno type (see sizes below) | `{"web":{"size":"scout"}}` |
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
  -d '{"app":{"org":"akkeris", "name":"events", "space":"perf-dev-us"},"source_blob":{"url":"https://host.com/source.zip"}}'
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
  https://apps.akkeris.io/apps/event-perf-dev/app-setups
```

**200 "Created" Response**

```json
{
  "app": {
    "locked": false,
    "name": "event",
    "organization": "performance",
    "region": "us-seattle",
    "personal": false,
    "space": "perf-dev",
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
    "platformjws-tokens": {
      "plan": "platformjws-tokens:qa"
    },
    "alamo-memcached": {
      "plan": "alamo-memcached:medium"
    },
    "lang-db": {
      "plan": "lang-db:dev"
    },
    "perf-db": {
      "plan": "perf-db:dev"
    }
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
      "token": "event-perf-dev"
    },
    {
      "url": "syslog://metrics-syslog-collector-ds1.akkeris.io:9000",
      "token": "event-perf-dev"
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





## Formations

The formation of processes that should be maintained for an app. Update the formation to scale processes or change dyno sizes. Available process type names and commands are defined by the process_types attribute for the slug currently released on an app.

### Formation Create

`POST /apps/{appname}/formation`

Create a new process or formation type. Note that formations can be automatically created/removed based on the Procfile at the root of your build.

|   Name   |       Type      | Description                                                                                                                                                                                                | Example                                                                                                                            |
|:--------:|:---------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
|   size   | required string | The size of server requested. defaults to constellation on autodeploy | constellation |
| quantity | requred string  | The quantity of servers or instances for this app. | 1 |
|   type   | required string | The type of server requested, note that "web" has a special meaning as its the only process with an exposed port to take incoming web traffic (specified by the PORT env). | web |
|   port   | optional integer| The port number to run on. | 9000 |
| command  | optional string | The command to run when the build image spins up, this if left off will default to the RUN command in the docker image. | null |
| healthcheck | option string | A relative URL that will be used to inspect the running app to determine if its healthy, this should be a relative url. | /health |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/formation
  -d '{"size":"constellation", "quantity":1, "type":"web", "command":null, "healthcheck":null}'
```

**200 "OK" Response**

```json
{
  "app": {
    "name": "api",
    "id": "62dc0fd3-2cba-4925-8fca-d1129d296d2c"
  },
  "command": null,
  "created_at": "2016-07-26T15:47:33.411Z",
  "id": "62dc0fd3-2cba-4925-8fca-d1129d296d2c",
  "quantity": 1,
  "size": "constellation",
  "type": "web",
  "updated_at": "2016-07-26T15:47:36.676Z"
}
```


### Formation Info

`GET /apps/{appname}/formation/{formation_type}`

Get information on a specific formation type.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/formation/web
```

**200 "OK" Response**

```json
{
  "app": {
    "name": "api",
    "id": "62dc0fd3-2cba-4925-8fca-d1129d296d2c"
  },
  "command": null,
  "created_at": "2016-07-26T15:47:33.411Z",
  "id": "62dc0fd3-2cba-4925-8fca-d1129d296d2c",
  "quantity": 1,
  "size": "constellation",
  "type": "web",
  "port": 9000,
  "updated_at": "2016-07-26T15:47:36.676Z"
}
```

### Formation Size List

`GET /sizes`

Get information on a specific formation type.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/sizes
```

**200 "OK" Response**

```json
[
  {
    "name": "scout-prod",
    "resources": {
      "requests": {
        "memory": "256Mi"
      },
      "limits": {
        "memory": "256Mi"
      }
    }
  },
  {
    "name": "scout",
    "resources": {
      "requests": {
        "memory": "256Mi"
      },
      "limits": {
        "memory": "256Mi"
      }
    }
  }
]
```

### Formation List

`GET /apps/{appname}/formation`

Get a list of all server types or processes running for an application.  Note the command portion if set is the startup command, if the command is null it is pulled from the RUN command in the dockerfile or procfile.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/formation
```

**200 "OK" Response**

```json
[
  {
    "app": {
      "name": "api",
      "id": "62dc0fd3-2cba-4925-8fca-d1129d296d2c"
    },
    "command": null,
    "created_at": "2016-07-26T15:47:33.411Z",
    "id": "62dc0fd3-2cba-4925-8fca-d1129d296d2c",
    "quantity": 1,
    "size": "constellation",
    "type": "web",
    "port": 9000,
    "updated_at": "2016-07-26T15:47:36.676Z"
  }
]
```

### Formation Batch Update

`PATCH /apps/{appname}/formation`

Update an server, change its formation or size and quantity.  Note that valid sizes can be found from the`/sizes`endpoint, the quantity can be anything up to 20, setting the quantity to 0 will place the app in "maintenance mode".  The payload is an array of the following fields:

|   Name   |       Type      | Description                                                                                                                                                                                                | Example                                                                                                                            |
|:--------:|:---------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
|   size   | required string | The size of server requested.                                                                                                                                     | constellation                                                                                                                       |
| quantity | requred string  | The quantity of servers or instances for this app.                                                                                                                                                         | 1                                                                                                                                  |
|   type   | required string | The type of server requested, for now the only available option is "web"                                                                                                                                   | web                                                                                                                                |
|   port   | optional string | The optional port to use during a batch update| 9000 |
| command  | optional string | The optional command to use during a batch update, or specify null to use the default command | npm start |
| healthcheck | option string | A relative URL that will be used to inspect the running app to determine if its healthy, this should be a relative url. | /health |
| removeHealthcheck | option bool | A true or false value to set whether to remove the health check | true |
| remove-command | option bool | A true or false value to set whether to remove the set command and default to what is specified in the docker file | true |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X PATCH \
  https://apps.akkeris.io/apps/app-space/formation \
  -d '[{"size":"constellation", "quantity":1, "type":"web"}]'
```

**200 "OK" Response**

```json
[
  {
    "app": {
      "name": "api",
      "id": "62dc0fd3-2cba-4925-8fca-d1129d296d2c"
    },
    "command": null,
    "created_at": "2016-07-26T15:47:33.411Z",
    "id": "62dc0fd3-2cba-4925-8fca-d1129d296d2c",
    "quantity": 1,
    "size": "constellation",
    "type": "web",
    "command": null,
    "port":9000,
    "updated_at": "2016-07-26T15:47:36.676Z"
  }
]
```

### Formation Update

`PATCH /apps/{appname}/formation/{formation_type}`

Update an server, change its formation or size and quantity.  Note that valid sizes can be found from the`/sizes`endpoint, the quantity can be anything up to 20, setting the quantity to 0 will place the app in "maintenance mode". 

|   Name   |       Type      | Description                                                                                                                                                                                                | Example                                                                                                                            |
|:--------:|:---------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
|   size   | required string | The size of server requested.                                                                                                                                     | constellation                                                                                                                        |
| quantity | requred string  | The quantity of servers or instances for this app. | 1 |
|   port   | optional string | The optional port to use during a batch update| web |
| command  | optional string | The optional command to use during a batch update, or specify null to use the default command | npm start |
| healthcheck | option string | A relative URL that will be used to inspect the running app to determine if its healthy, this should be a relative url. | /health |
| removeHealthcheck | option bool | A true or false value to set whether to remove the health check | true |
| remove-command | option bool | A true or false value to set whether to remove the set command and default to what is specified in the docker file | true |


**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X PATCH \
  https://apps.akkeris.io/apps/app-space/formation/web \
  -d '{"size":"constellation", "quantity":1}]'
```

**200 "OK" Response**

```json
{
  "app": {
    "name": "api",
    "id": "62dc0fd3-2cba-4925-8fca-d1129d296d2c"
  },
  "command": null,
  "created_at": "2016-07-26T15:47:33.411Z",
  "id": "62dc0fd3-2cba-4925-8fca-d1129d296d2c",
  "quantity": 1,
  "size": "constellation",
  "type": "web",
  "port": 9000,
  "updated_at": "2016-07-26T15:47:36.676Z"
}
```


### Formation Delete

`DELETE /apps/{appname}/formation/{formation_type}`

Remove the specified dyno or formation type (process) from the application.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/apps/foo-default/formation/worker
```

**200 "OK" Response**

**403 "Not Allowed" Response**

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
    "size": "constellation",
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
  "size": "constellation",
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


## Builds

Builds are not necessarily builds in the sense of "testing", but the process of taking already existing source code from a URL and building a docker image to deploy.  If a docker image is already supplied from an external build process the image is copied and used (and no build occurs).  Builds can be tied into github for convenience to auto-build and deploy based on status check rules. 

Note that a "slug" as its termed here is the id of a successful build image, and not the build id, the build id may differ from the slug id based on whether the build had to be repeated due to an infrastructure failure (and not due to the application failure). 

### Create a new build

`POST /apps/{appname}/builds`

Creates a new build from the source code or docker image contained in the specified URL, this can be a data URI (e.g., pushing the source code) or a URL to a system online where it can get the content. The build does not necessarily trigger a release, however if auto build and deploys are setup this will trigger an immediate release of the build.

|   Name   |       Type      | Description                                                                                                                                                                                                | Example                                                                                                                            |
|:--------:|:---------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
|    org   | required string | Organization name, alphanumeric only                                                                                                                                                                       | akkeris                                                                                                                           |
| checksum | required string | The sha 256 checksum (prepended with sha256:) of the contents specified in the url parameter, note if the URL is a base64 data URI then it is the content of the base64 content DECODED.                   | sha256:0827...53f3                                                                                                                 |
|    url   | required string | The URI to fetch the image or sources for this build.  If an image is provided no build will occur, but the image will be fetched. See Docker Integrations at the top for more information on using build images. Data URI's are also allowed to push code rather than pull. |``data:application/zip;base64,abc==``OR,``https://host.com/contents.zip``, OR``https://host.com/contents.tgz``, OR``docker://registry.com/repo/image:tag``                              |
|   repo   | optional string | The href of the repo that will show in the logs and build information.                                                                                                                                     | http://github.com/akkeris/repo                                                                                                    |
|    sha   | optional string | SHA commit value (shown in logs and build info)                                                                                                                                                            | e7000...3523                                                                                                                       |
|  branch  | optional string | Branch of commit that caused the build (shown in logs and build info)                                                                                                                                      | master                                                                                                                             |
|  version | optional string | An optional version to specify that will show in the logs                                                                                                                                                  | v1.0                                                                                                                               |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/builds \
  -d "{\"sha\":\"e700000c19787fcd0c1a10b6a02b6221f5d73523\",\"org\":\"test\",\"repo\":\"https://github.com/akkeris/some-repo\",\"branch\":\"master\",\"version\":\"v1.0\",\"checksum\":\"sha256:...SHA256 checksum on zip file of source...\",\"url\":\"data:base64,...base 64 encoded zip file of source...\"}"
```

**201 "Created" Response**

```json
{  
  "app":{  
    "key":"app-name"
  },
  "created_at":"2016-07-12T23:36:16.976Z",
  "updated_at":"2016-07-12T23:36:16.976Z",
  "id":16,
  "source_blob":{  
    "checksum":"sha256:0827f94194a9d99554f4fafbfa6661a676450814e5293b64cc5fc396963c53f3"
  },
  "output_stream_url":"/apps/api/builds/169/result",
  "release":null,
  "slug":{  
    "id":"999b5ce9-b60c-42c4-bca5-e442cd86df78"
  },
  "status":"succeeded",
  "user":{  
    "id":"anonymous",
    "email":""
  }
}
```


### List builds

`GET /apps/{appname}/builds`

List all of the builds for an application.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/builds
```

**200 "OK" Response**

```json
[
  {  
    "app":{  
      "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77"
    },
    "buildpacks":null,
    "created_at":"2016-07-18T19:34:07.740Z",
    "id":"999b5ce9-b60c-42c4-bca5-e442cd86df78",
    "output_stream_url":"/apps/app-space/builds/999b5ce9-b60c-42c4-bca5-e442cd86df78/result",
    "source_blob":{  
      "checksum":"sha256:b0cef53230ead3fb08b2b82d8f933a5a611fbabf416b2117d6896c7f5bde57b8",
      "url":"",
      "version":"v1.0",
      "commit":"123456"
    },
    "release":null,
    "slug":{  
      "id":"999b5ce9-b60c-42c4-bca5-e442cd86df78"
    },
    "status":"succeeded",
    "updated_at":"2016-07-18T19:36:56.609Z",
    "user":{  
      "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
      "email":""
    }
  }
]
```


### View Build Details

`GET /apps/{appname}/builds/{build uuid}`

Fetch information on a specific build.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/builds/999b5ce9-b60c-42c4-bca5-e442cd86df78
```

**200 "OK" Response**

```json
{  
  "app":{  
    "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77"
  },
  "buildpacks":null,
  "created_at":"2016-07-18T19:34:07.740Z",
  "id":"999b5ce9-b60c-42c4-bca5-e442cd86df78",
  "output_stream_url":"/apps/app-space/builds/999b5ce9-b60c-42c4-bca5-e442cd86df78/result",
  "source_blob":{  
    "checksum":"sha256:b0cef53230ead3fb08b2b82d8f933a5a611fbabf416b2117d6896c7f5bde57b8",
    "url":"",
    "version":"v1.0",
    "commit":"123456"
  },
  "release":null,
  "slug":{  
    "id":"999b5ce9-b60c-42c4-bca5-e442cd86df78"
  },
  "status":"succeeded",
  "updated_at":"2016-07-18T19:36:56.609Z",
  "user":{  
    "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
    "email":""
  }
}
```


### View Build Logs

`GET /apps/{appname}/builds/{build uuid}/result`

Fetch the build logs and result for a specific build.

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


### Stop a Running Build

`DELETE /apps/{appname}/builds/{build uuid}`

Stop running a build, this will return a 422 or 409 depending on whether the build cannot be stopped or is not currently running.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/apps/app-space/builds/999b5ce9-b60c-42c4-bca5-e442cd86df78
```

**205 "Reset Content" Response**

This is returned with no data when the build has successfully been stopped.

**422 "Unprocessable Entity" Response**

This is returned with no data when the build has completed building and cannot be stopped.


### Rebuild a Failed Build

`PUT /apps/{appname}/builds/{build uuid}`

This will create a new build using the same sources from the specified build uuid, note if configuration variables or other properties of the build have changed this will not retain the old ones.  Note that a new build uuid is returned, all aspects of the old build are left intact.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X PUT \
  https://apps.akkeris.io/apps/app-space/builds/966b5ce9-b60c-42c4-bca5-e442cd86df77 
```

**201 "Created" Response**

```json
{  
  "app":{  
    "key":"app-name"
  },
  "created_at":"2016-07-12T23:36:16.976Z",
  "updated_at":"2016-07-12T23:36:16.976Z",
  "id":16,
  "source_blob":{  
    "checksum":"sha256:0827f94194a9d99554f4fafbfa6661a676450814e5293b64cc5fc396963c53f3"
  },
  "output_stream_url":"/apps/api/builds/169/result",
  "release":null,
  "slug":{  
    "id":"999b5ce9-b60c-42c4-bca5-e442cd86df78"
  },
  "status":"succeeded",
  "user":{  
    "id":"anonymous",
    "email":""
  }
}
```

**422 "Unprocessable Entity" Response**

This is returned when the builds sources are unavialable (they've been archived or otherwise unavailable).  Periodically sources for builds will be archived or removed from our build repository. In this case, a build must be submitted from scratch.


### View Slug Details

A slug is an image produced by build, a slug may be associated as running on one or more applications at any point in time using pipeline promotions.  Slugs are therefore unassociated with a specific application and have their own unique end point.  However slugs do return the near same structure as builds.

`GET /slugs/{slug_uuid}`

Fetch information on a specific slug.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/slugs/999b5ce9-b60c-42c4-bca5-e442cd86df78
```

**200 "OK" Response**

```json
{  
  "app":{  
    "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77"
  },
  "buildpacks":null,
  "created_at":"2016-07-18T19:34:07.740Z",
  "id":"999b5ce9-b60c-42c4-bca5-e442cd86df78",
  "output_stream_url":"/apps/app-space/builds/999b5ce9-b60c-42c4-bca5-e442cd86df78/result",
  "source_blob":{  
    "checksum":"sha256:b0cef53230ead3fb08b2b82d8f933a5a611fbabf416b2117d6896c7f5bde57b8",
    "url":"",
    "version":"v1.0",
    "commit":"123456"
  },
  "release":null,
  "slug":{  
    "id":"999b5ce9-b60c-42c4-bca5-e442cd86df78"
  },
  "status":"succeeded",
  "updated_at":"2016-07-18T19:36:56.609Z",
  "user":{  
    "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
    "email":""
  }
}
```


## Releases

Releasing a slug (or build) will immediately place the new image on all targeted app servers and restart the app in a rolling fashion to prevent downtime. The provided slug or build must be already built through the``/apps/{appname}/builds``end point. Note that releases may occur automatically if auto build and deploys are set. In addition, releases to downstream pipelined applications are not allowed and will result in a 422 error code if a release is attempted.

### Create a New Release

`POST /apps/{appname}/releases`

|   Name       |       Type      | Description                                                                                                       | Example           |
|:------------:|:---------------:|-------------------------------------------------------------------------------------------------------------------|-------------------|
|   slug       | required string | The build id (slug) to release on this app. This cannot be used in combination with release.                      | 4321-...-3242     |
|  release     | required string | The release id to rollback to, this should be a previous release. this cannot be used in combination with a slug. | 1234-...-3242     |
|  description | optional string | A description to add to the release notes.                                                                        | v1.0 release      |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/releases \
  -d '{"slug":"c5b5896f-7896-4a11-80f0-dbb0e6c00ac5","description":"new release v1.0"}'
```

**201 "Created" Response**

```json
{  
 "app":{  
    "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77",
    "name":"app-space"
 },
 "created_at":"2016-07-19T00:34:21.602Z",
 "description":"new release v1.0",
 "slug":{  
    "id":"c5b5896f-7896-4a11-80f0-dbb0e6c00ac5"
 },
 "status":"succeeded",
 "user":{  
    "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
    "email":""
 },
 "version":"",
 "current":true
}
```


### List Releases

`GET /apps/{appname}/releases`

List all of the release (and rollbacks) for an application.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/releases
```

**200 "OK" Response**

```json
[
  {  
    "app":{  
      "name":"app-space"
    },
    "created_at":"2016-07-19T01:56:02.441Z",
    "description":"new release of c4b86b55-edd6-4ee7-a898-409cca744180",
    "slug":{  
      "id":"c4b86b55-edd6-4ee7-a898-409cca744180"
    },
    "id":"09a1a1b8-8318-4445-8752-fb3339173100",
    "status":"succeeded",
    "user":{  
      "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
      "email":""
    },
    "version":"",
    "current":true
  }
]
```

### View Release Info

`GET /apps/{appname}/releases/{release uuid}`

Fetch the specific details of a release (or rollback) for an application.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/releases/09a1a1b8-8318-4445-8752-fb3339173100
```

**200 "OK" Response**

```json
{  
  "app":{  
    "name":"app-space"
  },
  "created_at":"2016-07-19T01:56:02.441Z",
  "description":"new release of c4b86b55-edd6-4ee7-a898-409cca744180",
  "slug":{  
    "id":"c4b86b55-edd6-4ee7-a898-409cca744180"
  },
  "id":"09a1a1b8-8318-4445-8752-fb3339173100",
  "status":"succeeded",
  "user":{  
    "id":"09eac4cd-4824-f569-bdc4-420656e65ce2",
    "email":""
  },
  "version":"",
  "current":true
}
```



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

## Source Control Hooks

Source control hooks allow you to auto build your application when an event happens (such as a successful merge of a PR or commit on a branch).  Source control hooks can be set to auto deploy once the build is successful, in addition they can be set to first check the "Status Checks" on the targeted source control repo to ensure that the commit successfully passed all tests and approval flows.

### Github Callback

`POST /apps/{appname}/builds/auto/github`

Important: This end point should only be used by github during the callback phase. The body of this post must be a github webhook callback. In addition it must contain x-hub-signature which contains a HMAC digest of the content body and the secret be pre-defined randomly generated token contained within auto_builds table.

### Github Auto-Build/Deploy

### View Auto Build/Deploy Hook

`GET /apps/{appname}/builds/auto`

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/builds/auto/github
```

**200 "OK" Response**

```json
{
  "app": {
    "id": "62dc0fd3-2cba-4925-8fca-d1129d296d2c",
    "name": "app-space"
  },
  "auto_deploy": true,
  "branch": "master",
  "created_at": "2016-08-23T13:48:36.024Z",
  "id": "43f49726-25f7-41e1-80c2-0f8677e956b2",
  "organization": {
    "id": "akkeris",
    "name": "26390735-3eaa-48d0-b673-4ebc9a19bd9c"
  },
  "repo": "https://github.com/akkeris/alamo-app-controller",
  "site": "https://github.com",
  "space": {
    "id": "3911c0ec-e967-4497-8db5-54a52c5174b4",
    "name": "default"
  },
  "status_check": true,
  "updated_at": "2016-08-23T13:48:36.024Z",
  "username": "trevorlinton"
}
```

### Create Auto Build/Deploy Hook

`POST /apps/{appname}/builds/auto`

This end point will reassign an apps auto build/deploy settings, only one auto build/deploy may be assigned to an app. The "username" is your Github username (e.g., http://github.com/user), the "token" can be generated by going to github then going to your settings (Menu -> Settings), then clicking on "Personal Access Tokens" on the left hand side, and finally generate a new token.  Be sure to include the following scopes/permissions when generating the token: repo (and all children scopes), admin:repo_hook (and all children scopes), and notifications. 

|   Name       |       Type      | Description                                                                                   | Example                                             |
|:------------:|:---------------:|-----------------------------------------------------------------------------------------------|-----------------------------------------------------|
|   repo       | required string | The repo url to add a webhook onto, either github or gitlab                                   | https://github.com/akkeris/reponame                |
|   branch     | required string | The branch name to auto build for                                                             | master                                              |
| status_check | optional bool   | Whether to wait for all status checks prior to build (and potentially deploying).             | false                                               |
| auto_deploy  | optional bool   | Whether to auto deploy (release) the code, this will wait for status_check as well if set.    | true                                                |
|  username    | required string | The user id of the user requesting the hook to be added.                                      | trevorlinton                                        |
|   token      | required string | The token from github to add the webhook, this is not persisted and used once.                | ab832239defaa3298438abb                             |


**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/builds/auto \
  -d '{"repo":"https://github.com/akkeris/repo","branch":"master","status_check":true,"auto_deploy":true,"username":"trevorlinton","token":"ab832239defaa3298438abb"}'
```

**201 "Created" Response**

```json
{  
  "status":"successful"
}
```

### Remove Auto Build/Deploy Hook

`DELETE /apps/{appname}/builds/auto/github`

This end point will remove the webhook and entry for the auto build information.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/apps/app-space/builds/auto/github 
```

**200 "OK" Response**

```json
{  
  "status":"successful"
}
```


## Config

Configuration on applications allows adding environment variables to the space or application that are available upon boot.  Note that service environment variables that are placed from addon's are not modifiable, all applications have the environment variable "PORT" upon boot which should not be modified either. 

This is a great place to store database connection strings, host information or info related to the applications environment and not the code.

### Set & Remove App Config Variables

`PATCH /apps/{appname}/config-vars`

Update the environment variables (config-vars) for an application.  These are values that are set into the environment of the app prior to the app starting up.  You can update existing config vars by setting them again, or remove config vars by setting the value to null. Note that the key value pair does not need to contain every existing config var, only newly added ones, updated ones or delete ones.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X PATCH \
  https://apps.akkeris.io/apps/app-space/config-vars
  -d '{"FOO":"bar","BOO":"who?"}'
```

**200 "Updated" Response**

```json
{
  "FOO":"bar",
  "BOO":"who?"
}
```

### Get & List All App Config Variables

`GET /apps/{appname}/config-vars`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/config-vars
```

**200 "OK" Response**

```json
{
  "FOO":"bar",
  "BOO":"who?"
}
```


## Features

Features are capabilities you'd like to enable on an application.  Features are binary, in other words, they can only be enabled or disabled. Each feautre may be enabled or disabled by default when an app is created or they may be automatically enabled by other actions taken on an application.

Features can include auto-releasing when a build is created, or creating preview applications.

### Enable or Disable Features

`PATCH /apps/{appname}/features/{feature}`

Updates the specified feature, it should contain only one key `{"enabled":true}` to enable it, or `{"enabled":false}` to disable it.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X PATCH \
  https://apps.akkeris.io/apps/app-space/features/auto-release
  -d '{"enabled":false}'
```

**200 "Updated" Response**

```json
{
  "description":"When the application receives a new build whether or not it should automatically release the build.",
  "doc_url":"/features/auto-release",
  "id":"8e7ec5d2-c410-4d04-8d5e-db7746c40b44",
  "state":"public",
  "name":"auto-release",
  "display_name":"Auto release builds",
  "feedback_email":"cobra@octanner.com",
  "enabled":false
}
```

### List All Features

`GET /apps/{appname}/features`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/features
```

**200 "OK" Response**

```json
{
  "description":"When the application receives a new build whether or not it should automatically release the build.",
  "doc_url":"/features/auto-release",
  "id":"8e7ec5d2-c410-4d04-8d5e-db7746c40b44",
  "state":"public",
  "name":"auto-release",
  "display_name":"Auto release builds",
  "feedback_email":"cobra@octanner.com",
  "enabled":false
},
{
  "description":"When a pull request is received, automatically create a preview site and applicaiton (web dyno only) with the same config as the development application.",
  "doc_url":"/features/preview",
  "id":"8e7ec5d2-c410-4d04-8d5e-db7746c40b44",
  "state":"beta",
  "name":"preview",
  "display_name":"Preview Apps",
  "feedback_email":"cobra@octanner.com",
  "enabled":true
}
```


### Get A Feature

`GET /apps/{appname}/features/{feature}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/features/auto-release
```

**200 "OK" Response**

```json
{
  "description":"When the application receives a new build whether or not it should automatically release the build.",
  "doc_url":"/features/auto-release",
  "id":"8e7ec5d2-c410-4d04-8d5e-db7746c40b44",
  "state":"public",
  "name":"auto-release",
  "display_name":"Auto release builds",
  "feedback_email":"cobra@octanner.com",
  "enabled":false
}
```


## Spaces

All applications must exist in a space, spaces provide a network level isolation for a group of applications, in addition they allow developer to set "space-level" environment variables that are included in every app that is launched in the space.  This can be useful for network discovery of other applications, low latency isolation between related apps, to provide a secure boundary for dev, qa, etc environments and allow for auto-discovery of other services through space-level environment variables.  

Note that services in on space may not be attached to services in a seperate space, in addition there is a "default" space that provides a global area if an app has no need for inter-app communication.  Spaces are regional, meaning a specific space may not have applications in seperate regions within the same space.

### Create Space

`POST /spaces`

|   Name       |       Type      | Description            | Example          |
|:------------:|:---------------:|------------------------|------------------|
|     name     | required string | Unique short name (less than 12 characters), alpha numeric name                               | perf-dev-us                                             |
| description  | optional string | A description of the space                                                                    | Performance Devleopment in the US Region                |
| compliance   | optional array  | An array of compliance limitations | ["socs","prod"] or ["dev"] |
| stack        | optional string | The stack to place this space in (see stacks).  | ds1 |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  -d '{"name":"perf-dev-us","description":"Performance dev in US", "stack":"ds1"}'
  https://apps.akkeris.io/spaces
```

**201 "Created" Response**

```json
{
  "compliance": [
    "socs",
    "pci"
  ],
  "created_at": "2016-07-26T16:10:50.391Z",
  "id": "3911c0ec-e967-4497-8db5-54a52c5174b4",
  "name": "default",
  "region": {
    "id": "7edbac4b-6a5e-09e1-ef3a-08084a904621",
    "name": "us-seattle"
  },
  "stack": {
    "id": "77d8c44b-6a5e-09e1-ef3a-08084a904622",
    "name": "ds1"
  },
  "state": "allocated",
  "updated_at": "2016-07-26T16:10:53.114Z"
}
```


### Update Spaces

Update the compliance or description for a space.

`PATCH /spaces/{space_id_or_name}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X PATCH \
  https://apps.akkeris.io/spaces/default \
  -d '{"compliance":["socs","canary"]}'
```

**200 "OK" Response**

```json
[
  {
    "compliance": [
      "socs",
      "canary"
    ],
    "created_at": "2016-07-26T15:47:05.126Z",
    "id": "3911c0ec-e967-4497-8db5-54a52c5174b4",
    "name": "default",
    "region": {
      "id": "7edbac4b-6a5e-09e1-ef3a-08084a904621",
      "name": "us-seattle"
    },
    "stack": {
      "id": "77d8c44b-6a5e-09e1-ef3a-08084a904622",
      "name": "ds1"
    },
    "state": "allocated",
    "updated_at": "2016-07-26T15:47:07.267Z"
  }
  ...
]
```

### List Spaces

Retrieves a list of all of the active/available spaces.

`GET /spaces`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/spaces
```

**200 "OK" Response**

```json
[
  {
    "compliance": [
      "socs",
      "pci"
    ],
    "created_at": "2016-07-26T15:47:05.126Z",
    "id": "3911c0ec-e967-4497-8db5-54a52c5174b4",
    "name": "default",
    "region": {
      "id": "7edbac4b-6a5e-09e1-ef3a-08084a904621",
      "name": "us-seattle"
    },
    "stack": {
      "id": "77d8c44b-6a5e-09e1-ef3a-08084a904622",
      "name": "ds1"
    },
    "state": "allocated",
    "updated_at": "2016-07-26T15:47:07.267Z"
  }
  ...
]
```


### Get Space Info

Retrieves info on a specific space.

`GET /spaces/{space}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/spaces/default
```

**200 "OK" Response**

```json
{
  "compliance": [
    "socs",
    "pci"
  ],
  "created_at": "2016-07-26T15:47:05.126Z",
  "id": "3911c0ec-e967-4497-8db5-54a52c5174b4",
  "name": "default",
  "region": {
    "id": "7edbac4b-6a5e-09e1-ef3a-08084a904621",
    "name": "us-seattle"
  },
  "stack": {
    "id": "77d8c44b-6a5e-09e1-ef3a-08084a904622",
    "name": "ds1"
  },
  "state": "allocated",
  "updated_at": "2016-07-26T15:47:07.267Z"
}
```


## Organizations

Organizations allow attribution/usage within the system.  The organization name is attached to all applications, spaces and services to determine.  This can be a high level value such as a company name, or a company-department or down to the individual team.

### Create Organization

`POST /organizations`

Creates a new organization.

|   Name       |       Type      | Description                                                                                   | Example                                                 |
|:------------:|:---------------:|-----------------------------------------------------------------------------------------------|---------------------------------------------------------|
|    name      | required string | Unique short name (less than 12 characters), alpha numeric name                               | akkeris                                                |
| description  | required string | A description for this organization                                                           | O.C. Tanner                                             |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/organizations \
  -d '{"name":"myorg","description":"My organizations name."}'
```

**201 "Created" Response**

```json
{
  "created_at": "2016-07-26T15:47:05.126Z",
  "id": "3911c0ec-e967-4497-8db5-54a52c5174b4",
  "name": "myorg",
  "updated_at": "2016-07-26T15:47:07.267Z",
  "role":"admin"
}
```

### Get Organization Information

Returns the organization information.

`GET /organizations/{orgname}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/organizations/akkeris
```

**200 "OK" Response**

```json
{
  "created_at": "2016-07-26T15:47:05.126Z",
  "id": "3911c0ec-e967-4497-8db5-54a52c5174b4",
  "name": "myorg",
  "updated_at": "2016-07-26T15:47:07.267Z",
  "role":"admin"
}
```

### List all organizations

Lists all organizations

`GET /organizations`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/organizations
```

**200 "OK" Response**

```json
[
  {
    "created_at": "2016-07-26T15:47:05.126Z",
    "id": "3911c0ec-e967-4497-8db5-54a52c5174b4",
    "name": "myorg",
    "updated_at": "2016-07-26T15:47:07.267Z",
    "role":"admin"
  },
  ...
]
```


## Services, Addons and Attachments

Services (or addon-services) are any external or internal capabilities that can be added to an application. Each service has an associated plan, each plan can be created and attached to an application as an "addon". Once an addon is created the relevant configuration variables are automatically placed in the application on start up via new environment variables.  

For example, alamo-postgresql is a service provided, it has plans that can be chosen through``/addon-services/alamo-postgresql/plans``, the selected plan can be then added to an application through``/apps/{appname}/addons``, the created or provisioned database can also be attached to other applications through``/apps/{appname}/addon-attachments``end point. All services can be queried through the``/addon-services``URI.

Attached addons differ from addons in that attachments are addons that are owned by another application and attached or shared to another application, these cannot be controlled or deleted by the attached application or those with access to the application with the attachment, only the owner of the addon may do this.

### List Addon-Services ##

Lists all addons services (postgres, redis, etc). 

`GET /addon-services`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/addon-services
```

**200 "OK" Response**

```json
[
  {
    "cli_plugin_name": "postgres",
    "created_at": "2016-08-09T12:00:00Z",
    "human_name": "Alamo Postgres",
    "id": "01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
    "name": "alamo-postgresql",
    "state": "ga",
    "available_regions": ["us-seattle"],
    "supports_multiple_installations": true,
    "supports_sharing": true,
    "updated_at": "2016-08-09T12:00:00Z"
  },
  {
    "cli_plugin_name": "redis",
    "created_at": "2016-08-09T12:00:00Z",
    "human_name": "Alamo Redis",
    "id": "b292c4f4-cadb-6525-adac-c61074069c65",
    "name": "alamo-redis",
    "state": "ga",
    "available_regions": ["us-seattle"],
    "supports_multiple_installations": true,
    "supports_sharing": true,
    "updated_at": "2016-08-09T12:00:00Z"
  }
]
```

### Get Addon-Service Info ##

Get information on a specific service (although not the plan details)

`GET /addon-services/{addon_name_or_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/addon-services/alamo-postgresql
```

**200 "OK" Response**

```json
{
  "cli_plugin_name": "postgres",
  "created_at": "2016-08-09T12:00:00Z",
  "human_name": "Alamo Postgres",
  "id": "01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
  "name": "alamo-postgresql",
  "state": "shutdown",
  "available_regions": ["us-seattle"],
  "supports_multiple_installations": true,
  "supports_sharing": true,
  "updated_at": "2016-08-09T12:00:00Z"
}
```

### List Addon-Service Plans ##

Get all plans for a service and their costs.

`GET /addon-services/{addon_name_or_id}/plans`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/addon-services/alamo-postgresql/plans
```

**200 "OK" Response**

```json
[
  {
    "attributes": {},
    "addon_service": {
      "id": "01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
      "name": "alamo-postgresql"
    },
    "created_at": "2016-08-09T12:00:00Z",
    "default": false,
    "description": " 4x CPU - 30GB Mem - 100GB Disk - Extra IOPS:1000",
    "human_name": "Large",
    "id": "5ff1a5a9-fa46-0559-cc40-df72d468764b",
    "installable_inside_private_network": true,
    "installable_outside_private_network": true,
    "name": "alamo-postgresql:large",
    "price": {
      "cents": 75000,
      "unit": "month"
    },
    "space_default": false,
    "state": "public",
    "updated_at": "2016-08-09T12:00:00Z"
  },
  {
    "attributes": {},
    "addon_service": {
      "id": "01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
      "name": "alamo-postgresql"
    },
    "created_at": "2016-08-09T12:00:00Z",
    "default": false,
    "description": "2x CPU - 8GB Mem - 50GB Disk - Extra IOPS:no",
    "human_name": "Medium",
    "id": "a91d7641-a61e-fb09-654e-2def7c9f162d",
    "installable_inside_private_network": true,
    "installable_outside_private_network": true,
    "name": "alamo-postgresql:medium",
    "price": {
      "cents": 10000,
      "unit": "month"
    },
    "space_default": false,
    "state": "public",
    "updated_at": "2016-08-09T12:00:00Z"
  },
  {
    "attributes": {},
    "addon_service": {
      "id": "01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
      "name": "alamo-postgresql"
    },
    "created_at": "2016-08-09T12:00:00Z",
    "default": false,
    "description": "2x CPU - 4GB Mem - 20GB Disk - Extra IOPS:no",
    "human_name": "Small",
    "id": "f6757b64-022d-518f-beb1-29d6eee937d2",
    "installable_inside_private_network": true,
    "installable_outside_private_network": true,
    "name": "alamo-postgresql:small",
    "price": {
      "cents": 1500,
      "unit": "month"
    },
    "space_default": false,
    "state": "public",
    "updated_at": "2016-08-09T12:00:00Z"
  }
]
```

### Get Addon-Service Plan Info 

Get specific plan for a service and its costs.

`GET /addon-services/{addon_name_or_id}/plans/{plan_id_or_name}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/addon-services/alamo-postgresql/plans/medium
```

**200 "OK" Response**

```json
{
  "attributes": {},
  "addon_service": {
    "id": "01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
    "name": "alamo-postgresql"
  },
  "created_at": "2016-08-09T12:00:00Z",
  "default": false,
  "description": "2x CPU - 8GB Mem - 50GB Disk - Extra IOPS:no",
  "human_name": "Medium",
  "id": "a91d7641-a61e-fb09-654e-2def7c9f162d",
  "installable_inside_private_network": true,
  "installable_outside_private_network": true,
  "name": "alamo-postgresql:medium",
  "price": {
    "cents": 10000,
    "unit": "month"
  },
  "space_default": false,
  "state": "shutdown",
  "updated_at": "2016-08-09T12:00:00Z"
}
```

### Create Addon ##

`POST /apps/{appname}/addons`

Creates a new addon from a service plan.

|   Name       |       Type      | Description                                                                                   | Example                                                 |
|:------------:|:---------------:|-----------------------------------------------------------------------------------------------|---------------------------------------------------------|
|    plan      | required string | The id (uuid) of the service plan to create, this can be obtained from /addon-services/{addon_name_or_id}/plans                               | akkeris                                                |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/addons \
  -d '{"plan":"a91d7641-a61e-fb09-654e-2def7c9f162d"}'
```

**201 "Created" Response**

```json
{
  "actions": null,
  "addon_service": {
    "id": "01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
    "name": "alamo-postgresql"
  },
  "app": {
    "id": "app-space",
    "name": "62dc0fd3-2cba-4925-8fca-d1129d296d2c-api"
  },
  "config_vars": [],
  "created_at": "2016-08-11T20:16:45.820Z",
  "id": "5feef9bb-2bed-4b62-bdf5-e31691fab88c",
  "name": "62dc0fd3-2cba-4925-8fca-d1129d296d2c-api:alamo-postgresql-1470946605820",
  "plan": {
    "id": "a91d7641-a61e-fb09-654e-2def7c9f162d",
    "name": "alamo-postgresql:small"
  },
  "provider_id": "alamo",
  "updated_at": "2016-08-11T20:16:45.820Z",
  "web_url": "https://akkeris.example.com/apps/62dc0fd3-2cba-4925-8fca-d1129d296d2c-api"
}
```

### List Addons ##

Lists all the addons for an application.

`GET /apps/{appname}/addons`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/addons
```

**200 "OK" Response**

```json
[
  {
    "actions": null,
    "addon_service": {
      "id": "01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
      "name": "alamo-postgresql"
    },
    "app": {
      "id": "app-space",
      "name": "62dc0fd3-2cba-4925-8fca-d1129d296d2c-api"
    },
    "config_vars": [],
    "created_at": "2016-08-11T20:16:45.820Z",
    "id": "5feef9bb-2bed-4b62-bdf5-e31691fab88c",
    "name": "a91d7641-a61e-fb09-654e-2def7c9f162d-api:alamo-postgresql-1470946605820",
    "plan": {
      "id": "a91d7641-a61e-fb09-654e-2def7c9f162d",
      "name": "alamo-postgresql:small"
    },
    "provider_id": "alamo",
    "updated_at": "2016-08-11T20:16:45.820Z",
    "web_url": "https://akkeris.example.com/apps/62dc0fd3-2cba-4925-8fca-d1129d296d2c-api"
  }
]
```

### Get Addon ##

`GET /apps/{appname}/addons/{addon_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/addons/5feef9bb-2bed-4b62-bdf5-e31691fab88c
```

**200 "OK" Response**

```json
{
  "actions": null,
  "addon_service": {
    "id": "01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
    "name": "alamo-postgresql"
  },
  "app": {
    "id": "app-space",
    "name": "62dc0fd3-2cba-4925-8fca-d1129d296d2c-api"
  },
  "config_vars": [],
  "created_at": "2016-08-11T20:16:45.820Z",
  "id": "5feef9bb-2bed-4b62-bdf5-e31691fab88c",
  "name": "a91d7641-a61e-fb09-654e-2def7c9f162d-api:alamo-postgresql-1470946605820",
  "plan": {
    "id": "a91d7641-a61e-fb09-654e-2def7c9f162d",
    "name": "alamo-postgresql:small"
  },
  "provider_id": "alamo",
  "updated_at": "2016-08-11T20:16:45.820Z",
  "web_url": "https://akkeris.example.com/apps/62dc0fd3-2cba-4925-8fca-d1129d296d2c-api"
}
```

### Delete Addon ##

`DELETE /apps/{appname}/addons/{addon_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/apps/app-space/addons/5feef9bb-2bed-4b62-bdf5-e31691fab88c
```

**200 "OK" Response**

```json
{
  "actions": null,
  "addon_service": {
    "id": "01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
    "name": "alamo-postgresql"
  },
  "app": {
    "id": "app-space",
    "name": "62dc0fd3-2cba-4925-8fca-d1129d296d2c-api"
  },
  "config_vars": [],
  "created_at": "2016-08-11T20:16:45.820Z",
  "id": "5feef9bb-2bed-4b62-bdf5-e31691fab88c",
  "name": "a91d7641-a61e-fb09-654e-2def7c9f162d-api:alamo-postgresql-1470946605820",
  "plan": {
    "id": "a91d7641-a61e-fb09-654e-2def7c9f162d",
    "name": "alamo-postgresql:small"
  },
  "provider_id": "alamo",
  "updated_at": "2016-08-11T20:16:45.820Z",
  "web_url": "https://akkeris.example.com/apps/62dc0fd3-2cba-4925-8fca-d1129d296d2c-api"
}
```


### List Addons-Attachments ##

Lists all the addons for an application.

`GET /apps/{appname}/addon-attachments`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/addon-attachments
```

**200 "OK" Response**

```json
[
  {
    "addon":{
      "actions": null,
      "addon_service": {
        "id": "01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
        "name": "alamo-postgresql"
      },
      "app": {
        "id": "555555-2bed-4b62-bdf5-e31691fab88c",
        "name": "sourceapp-space"
      },
      "config_vars": [],
      "created_at": "2016-08-11T20:16:45.820Z",
      "id": "5feef9bb-2bed-4b62-bdf5-e31691fab88c",
      "name": "a91d7641-a61e-fb09-654e-2def7c9f162d-api:alamo-postgresql-1470946605820",
      "plan": {
        "id": "a91d7641-a61e-fb09-654e-2def7c9f162d",
        "name": "alamo-postgresql:small"
      }
    },
    "app":{
        "id": "777777-2bed-4b62-bdf5-e31691fab88c",
        "name": "attachedapp-space"
    },
    "created_at": "2016-08-11T20:16:45.820Z",
    "updated_at": "2016-08-11T20:16:45.820Z",
    "id":"663ef9bb-2bed-4b62-bdf5-e31691fab555",
    "name":"a1c1643-b51e-bb00-334e-2def7c9f162d:alamo-postgresql-18837"
  }
]
```

### Get Addons-Attachments ##

`GET /apps/{appname}/addon-attachments/{addon_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/addon-attachments/5feef9bb-2bed-4b62-bdf5-e31691fab88c
```

**200 "OK" Response**

```json
{
  "addon":{
    "actions": null,
    "addon_service": {
      "id":"01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
      "name":"alamo-postgresql"
    },
    "app": {
      "id":"555555-2bed-4b62-bdf5-e31691fab88c",
      "name":"sourceapp-space"
    },
    "config_vars": [],
    "created_at": "2016-08-11T20:16:45.820Z",
    "id": "5feef9bb-2bed-4b62-bdf5-e31691fab88c",
    "name": "a91d7641-a61e-fb09-654e-2def7c9f162d-api:alamo-postgresql-1470946605820",
    "plan": {
      "id": "a91d7641-a61e-fb09-654e-2def7c9f162d",
      "name": "alamo-postgresql:small"
    }
  },
  "app":{
      "id": "777777-2bed-4b62-bdf5-e31691fab88c",
      "name": "attachedapp-space"
  },
  "created_at": "2016-08-11T20:16:45.820Z",
  "updated_at": "2016-08-11T20:16:45.820Z",
  "id":"663ef9bb-2bed-4b62-bdf5-e31691fab555",
  "name":"a1c1643-b51e-bb00-334e-2def7c9f162d:alamo-postgresql-18837"
}
```

### Attach Addons ##

`POST /apps/{appname}/addon-attachments`

The post property `addon` is the name or id of addon to attach.  The `app` parameter should contain the app to attach the addon to.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/addon-attachments
  -d '{"addon":"5feef9bb-2bed-4b62-bdf5-e31691fab88c", "app":"app-space"}'
```

**200 "OK" Response**

```json
{
  "addon":{
    "actions": null,
    "addon_service": {
      "id":"01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
      "name":"alamo-postgresql"
    },
    "app": {
      "id":"555555-2bed-4b62-bdf5-e31691fab88c",
      "name":"sourceapp-space"
    },
    "config_vars": [],
    "created_at": "2016-08-11T20:16:45.820Z",
    "id": "5feef9bb-2bed-4b62-bdf5-e31691fab88c",
    "name": "a91d7641-a61e-fb09-654e-2def7c9f162d-api:alamo-postgresql-1470946605820",
    "plan": {
      "id": "a91d7641-a61e-fb09-654e-2def7c9f162d",
      "name": "alamo-postgresql:small"
    }
  },
  "app":{
      "id": "777777-2bed-4b62-bdf5-e31691fab88c",
      "name": "attachedapp-space"
  },
  "created_at": "2016-08-11T20:16:45.820Z",
  "updated_at": "2016-08-11T20:16:45.820Z",
  "id":"663ef9bb-2bed-4b62-bdf5-e31691fab555",
  "name":"a1c1643-b51e-bb00-334e-2def7c9f162d:alamo-postgresql-18837"
}
```


### Dettach Addons ##

`DELETE /apps/{appname}/addon-attachments/{addon_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/apps/app-space/addon-attachments/663ef9bb-2bed-4b62-bdf5-e31691fab555
```

**200 "OK" Response**

```json
{
  "addon":{
    "actions": null,
    "addon_service": {
      "id":"01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
      "name":"alamo-postgresql"
    },
    "app": {
      "id":"555555-2bed-4b62-bdf5-e31691fab88c",
      "name":"sourceapp-space"
    },
    "config_vars": [],
    "created_at": "2016-08-11T20:16:45.820Z",
    "id": "5feef9bb-2bed-4b62-bdf5-e31691fab88c",
    "name": "a91d7641-a61e-fb09-654e-2def7c9f162d-api:alamo-postgresql-1470946605820",
    "plan": {
      "id": "a91d7641-a61e-fb09-654e-2def7c9f162d",
      "name": "alamo-postgresql:small"
    }
  },
  "app":{
      "id": "777777-2bed-4b62-bdf5-e31691fab88c",
      "name": "attachedapp-space"
  },
  "created_at": "2016-08-11T20:16:45.820Z",
  "updated_at": "2016-08-11T20:16:45.820Z",
  "id":"663ef9bb-2bed-4b62-bdf5-e31691fab555",
  "name":"a1c1643-b51e-bb00-334e-2def7c9f162d:alamo-postgresql-18837"
}
```

## Regions

Regions are an area that addons, apps and sites share.  Regions have limitations based on their capabilities and available stacks within that region. Note an app must be in the same region as a provision addon to attach it.  If a plan is unavailable in a certain region it may not be created for an app.  A site may only include apps in the same region.

### List Regions ##

Lists all regions.

`GET /regions`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/regions
```

**200 "OK" Response**

```json
[
  {
    "country": "United States",
    "created_at": "2016-07-01T12:00:00Z",
    "description": "United States",
    "id": "a91d7641-a61e-fb09-654e-2def7c9f162d",
    "locale": "seattle",
    "name": "us-seattle",
    "private_capable": true,
    "provider": {
      "name": "amazon-web-services",
      "region": "us-west-2",
      "availability_zones":["us-west-2a","us-west-2b"]
    },
    "high_availiability":true,
    "updated_at": "2016-07-01T12:00:00Z"
  },
  {
    "country": "United Kingdom",
    "created_at": "2016-07-01T12:00:00Z",
    "description": "United Kingdom",
    "id": "b03d7641-a61e-fb09-654e-2def7c9f163e",
    "locale": "london",
    "name": "eu-london",
    "private_capable": true,
    "provider": {
      "name": "amazon-web-services",
      "region": "eu-west-2",
      "availability_zones":["eu-west-2a","eu-west-2b"]
    },
    "high_availiability":true,
    "updated_at": "2016-07-01T12:00:00Z"
  }
]
```

### Get Region Info ##

Get information on a specific region

`GET /regions/{region_name_or_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/regions/us-seattle
```

**200 "OK" Response**

```json
  {
    "country": "United States",
    "created_at": "2016-07-01T12:00:00Z",
    "description": "United States",
    "id": "a91d7641-a61e-fb09-654e-2def7c9f162d",
    "locale": "seattle",
    "name": "us-seattle",
    "private_capable": true,
    "provider": {
      "name": "amazon-web-services",
      "region": "us-west-2",
      "availability_zones":["us-west-2a","us-west-2b"]
    },
    "high_availiability":true,
    "updated_at": "2016-07-01T12:00:00Z"
  }
```


## Stacks

Stacks are unique runtimes in alamo.  One or more of them may exist in any one region.  The difference between stacks may be physical location, an upgrade to backend components on one stack vs the other or on prem vs cloud offerings. A space must soley exist in one stack.

### List Stacks ##

Lists all stacks.

`GET /stacks`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/stacks
```

**200 "OK" Response**

```json
[
  {
    "created_at": "2016-07-01T12:00:00Z",
    "id": "abcd7641-a61e-fb09-654e-2def7c9feee",
    "name": "ds1",
    "region":{
        "id":"3bcd7641-a61e-fb09-654e-2def7c9feff",
        "name":"us-seattle"
    },
    "updated_at": "2016-07-01T12:00:00Z"
  }
]
```

### Get Stack Info ##

Get information on a specific stack

`GET /stack/{stack_name_or_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/stacks/ds1
```

**200 "OK" Response**

```json
  {
    "created_at": "2016-07-01T12:00:00Z",
    "id": "abcd7641-a61e-fb09-654e-2def7c9feee",
    "name": "ds1",
    "region":{
        "id":"3bcd7641-a61e-fb09-654e-2def7c9feff",
        "name":"us-seattle"
    },
    "updated_at": "2016-07-01T12:00:00Z"
  }
```

## Pipelines

Pipelines allow users to promote code from one app to one or more other apps (assumingly in different spaces). This is a useful tool and alternative to performing a release on a production or staging application, promotions add more assurances that code test in QA or DEV is exactly the same as that in production. It also alleviates the need for long lived branches (e.g., dev, qa, prod, master) within your source control repo. 

To create a pipeline you'll first create the pipeline name, then couple (or add) the apps to a pipeline using the pipeline couplings end points, when you add an app to a pipeline you'll need to state its "stage" which can be one of "review", "development", "staging" and "production".  Once apps are added to a pipeline via pipeline coupling the application can be promoted using the "Create Pipeline Promotion" end points.

Note its customary to use the app name as the pipeline name, pipelines should not be used for promoting multiple different types of apps.

### Create Pipeline ##

Create a new pipeline for a set of apps.


|   Name       |       Type      | Description                                                                                   | Example          |
|:------------:|:---------------:|-----------------------------------------------------------------------------------------------|------------------|
|    name      | required string | The name of the pipeline, less than 24 characters, alpha numeric only                         | my-test-pipeline |


`POST /pipelines`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/pipelines -d '{"name":"my-test-pipeline"}'
```

**201 "Created" Response**

```json
{
  "created_at": "2016-01-01T12:00:00Z",
  "id": "abc34567-99ab-cdef-0123-456789abcdef",
  "name": "my-test-pipeline",
  "updated_at": "2016-01-01T12:00:00Z"
}
```

### List Pipelines ##

Lists all available existing pipelines.

`GET /pipelines`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/pipelines
```

**200 "OK" Response**

```json
[
  {
    "created_at": "2016-01-01T12:00:00Z",
    "id": "abc34567-99ab-cdef-0123-456789abcdef",
    "name": "my-test-pipeline",
    "updated_at": "2016-01-01T12:00:00Z"
  },
  ...
]
```

### Get Pipeline Info ##

Gets information on a specific pipeline

`GET /pipelines/{pipeline_name_or_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/pipelines/my-test-pipeline
```

**200 "OK" Response**

```json
{
  "created_at": "2016-01-01T12:00:00Z",
  "id": "abc34567-99ab-cdef-0123-456789abcdef",
  "name": "my-test-pipeline",
  "updated_at": "2016-01-01T12:00:00Z"
}
```

### Delete a Pipeline ##

Removes a pipeline (and all of its couplings)

`DELETE /pipelines/{pipeline_name_or_id`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/pipelines/my-test-pipeline
```

**200 "OK" Response**

```json
{
  "created_at": "2016-01-01T12:00:00Z",
  "id": "abc34567-99ab-cdef-0123-456789abcdef",
  "name": "my-test-pipeline",
  "updated_at": "2016-01-01T12:00:00Z"
}
```

### Create Pipeline Coupling ##

Adds an application to a pipeline at the specified stage.  Note that the only valid stages are "review", "development", "staging", "production".


|   Name       |       Type      | Description                                                                                   | Example              |
|:------------:|:---------------:|-----------------------------------------------------------------------------------------------|----------------------|
|     app      | required string | The application name or id to add to the pipeline.                                            | my-test-app-dev      |
|  pipeline    | required string | The pipeline name or id to add the application to.                                            | my-test-app-pipeline |
|   stage      | required string | The stage of the pipeline this app represents.                                                | development          |

`POST /pipeline-couplings`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/pipeline-couplings -d '{"app":"my-test-app-dev", "pipeline":"my-test-app-pipeline", "stage":"development"}'
```

**201 "Created" Response**

```json
{
  "app":{
    "id": "01234567-89ab-cdef-0123-456789abcdef"
  },
  "created_at": "2016-01-01T12:00:00Z",
  "id": "abc34567-99ab-cdef-0123-456789abcdef",
  "pipeline":{
    "id":"abc34567-99ab-cdef-0123-456789abcdef"
  },
  "stage": "development",
  "updated_at": "2016-01-01T12:00:00Z"
}
```

### List Apps added to a Pipeline (by Pipeline)##

Lists all available apps added to the pipeline (e.g., a pipeline coupling)

`GET /pipelines/{pipeline_name_or_id}/pipeline-couplings`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/pipelines/my-test-pipeline/pipeline-couplings
```

**200 "OK" Response**

```json
[
  {
    "app":{
      "id": "01234567-89ab-cdef-0123-456789abcdef"
    },
    "created_at": "2016-01-01T12:00:00Z",
    "id": "abc34567-99ab-cdef-0123-456789abcdef",
    "pipeline":{
      "id":"abc34567-99ab-cdef-0123-456789abcdef"
    },
    "stage": "development",
    "updated_at": "2016-01-01T12:00:00Z"
  },
  ...
]
```

### List All Pipline Couplings ##

Lists all pipeline couplings

`GET /pipeline-couplings`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/pipeline-couplings
```

**200 "OK" Response**

```json
[
  {
    "app":{
      "id": "01234567-89ab-cdef-0123-456789abcdef"
    },
    "created_at": "2016-01-01T12:00:00Z",
    "id": "abc34567-99ab-cdef-0123-456789abcdef",
    "pipeline":{
      "id":"abc34567-99ab-cdef-0123-456789abcdef"
    },
    "stage": "development",
    "updated_at": "2016-01-01T12:00:00Z"
  },
  ...
]
```


### Get Pipeline Coupling By App ##

Gets the pipeline coupling (or pipeline an app is added to) by the application, rather than pipeline.

`GET /apps/{app_id_or_name}/pipeline-couplings`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/my-test-app-dev/pipeline-couplings
```

**200 "OK" Response**

```json
{
  "app":{
    "id": "01234567-89ab-cdef-0123-456789abcdef"
  },
  "created_at": "2016-01-01T12:00:00Z",
  "id": "abc34567-99ab-cdef-0123-456789abcdef",
  "pipeline":{
    "id":"abc34567-99ab-cdef-0123-456789abcdef"
  },
  "stage": "development",
  "updated_at": "2016-01-01T12:00:00Z"
}
```

### Remove an App from Pipeline ##

Removes an application from a pipeline.

`DELETE /pipeline-couplings/{pipeline_coupling_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/pipeline-couplings/abc34567-99ab-cdef-0123-456789abcdef
```

**200 "OK" Response**

```json
{
  "app":{
    "id": "01234567-89ab-cdef-0123-456789abcdef"
  },
  "created_at": "2016-01-01T12:00:00Z",
  "id": "abc34567-99ab-cdef-0123-456789abcdef",
  "pipeline":{
    "id":"abc34567-99ab-cdef-0123-456789abcdef"
  },
  "stage": "development",
  "updated_at": "2016-01-01T12:00:00Z"
}
```

### Create Pipeline Promotion ##

Promote an app coupled to a pipeline up the pipeline. If a safe promote is indicated the source and destination apps config are compared, if an environment variable exists in one and not the other the safe promotion fails. This prevents promoting apps that require specific services or config changes prior to promotion.

|   Name           |       Type      | Description                                                                                   | Example                                   |
|:----------------:|:---------------:|-----------------------------------------------------------------------------------------------|-------------------------------------------|
| pipeline/id      | required string | The pipeline to promote an app in                                                             | abc34567-99ab-cdef-0123-456789abcdef      |
| source/app/id    | required string | The source application to promote                                                             | 11334567-99ab-cdef-0123-456789abcdef      |
| targets[]/app/id | required string | The target application to receive the promotion                                               | 22334567-99ab-cdef-0123-456789abc123      |
| safe             | optional boolean | Indicates a safe promotion | true |

`POST /pipeline-promotions`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/pipeline-promotions
  -d '{
    "pipeline":{
      "id": "abc34567-99ab-cdef-0123-456789abcdef"
    },
    "source":{
      "app":{
        "id":"11334567-99ab-cdef-0123-456789abcdef"
      }
    },
    "targets":[
      {
        "app":{
          "id":"22334567-99ab-cdef-0123-456789abc123"
        }
      }
    ]
  }'
```

**200 "OK" Response**

```json
{
  "created_at": "2012-01-01T12:00:00Z",
  "id": "01234567-89ab-cdef-0123-456789abcdef",
  "pipeline": {
    "id": "01234567-89ab-cdef-0123-456789abcdef"
  },
  "source": {
    "app": {
      "id": "01234567-89ab-cdef-0123-456789abcdef"
    },
    "release": {
      "id": "01234567-89ab-cdef-0123-456789abcdef"
    }
  },
  "status": "pending",
  "updated_at": "2012-01-01T12:00:00Z"
}
```

### Get Pipeline Promotion ##

Gets the promotion record from one app to others.

`GET /pipeline-promotions/{pipeline_promotion_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/pipeline-promotions/01234567-89ab-cdef-0123-456789abcdef
```

**200 "OK" Response**

```json
{
  "created_at": "2012-01-01T12:00:00Z",
  "id": "01234567-89ab-cdef-0123-456789abcdef",
  "pipeline": {
    "id": "01234567-89ab-cdef-0123-456789abcdef"
  },
  "source": {
    "app": {
      "id": "01234567-89ab-cdef-0123-456789abcdef"
    },
    "release": {
      "id": "01234567-89ab-cdef-0123-456789abcdef"
    }
  },
  "status": "pending",
  "updated_at": "2012-01-01T12:00:00Z"
}
```

### Get Pipeline Promotion Targets

Gets the result of the targets during the promotion.

`/pipeline-promotions/{pipeline_promotion_id}/promotion-targets`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/pipeline-promotions/01234567-89ab-cdef-0123-456789abcdef/promotion-targets
```

**200 "OK" Response**

```json
{
  "app":{
    "id":"5553223-89ab-cdef-0123-456789abcdef"
  },
  "error_message":"",
  "id":"51234567-89ab-cdef-0123-456789abcdee",
  "pipeline_promotion":{
    "id":"01234567-89ab-cdef-0123-456789abcdef"
  },
  "release":{
    "id":"11114567-89ab-cdef-0123-456753232ef"
  },
  "status":"successful"
}
```


## Log Drains

### Add a Log Drains ##

`POST /apps/{appname}/log-drains`

Create a new log drain, log drains allow you to push logs to another syslogd on another host (such as papertrail or an internal syslogd instance listening on a port).

The only required field in the post is the URL to push data to, the data should have one of the following schemas:

* syslog+tls:// - Push to a SSL (TLS technically) end point with syslogd format.
* syslog:// - Push to a unencrypted TCP end point with syslogd format (note this is not secure, and is not recommended).
* syslog+udp:// - Push to an unencrypted UDP end point with syslogd format (note this may result in out of order logs, is not secure and is not recommended).


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




## Plugins

Plugins provide a registry for users of the CLI tools to access additional capabilities in appkit.

### List Plugins ##

Lists all public plugins.

`GET /plugins`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/plugins
```

**200 "OK" Response**

```json
[
  {
    "created_at": "2016-10-12T03:13:06.263Z",
    "id": "6c0416ad-7338-4f09-a57a-c36a40ae82db",
    "name": "test",
    "description": "This is the description for this plugin",
    "owner": {
      "name": "Trevor Linton",
      "email": "trevor.linton@akkeris.com"
    },
    "repo": "https://github.com/trevorlinton/appkit-test-plugin",
    "updated_at": "2016-10-12T03:13:06.263Z"
  },
  {
    "created_at": "2016-10-12T03:29:06.515Z",
    "id": "c0fd1fff-9157-47f1-b1cf-a524fc7ec3c4",
    "name": "test2",
    "description": "This is the description",
    "owner": {
      "name": "Fo",
      "email": "foo@akkeris.com"
    },
    "repo": "https://github.com/trevorlinton/appkit-test",
    "updated_at": "2016-10-12T03:29:11.775Z"
  },
  {
    "created_at": "2016-10-12T04:50:58.519Z",
    "id": "2546d9f3-4316-40f2-805d-a9aaa37d918d",
    "name": "testing",
    "description": "description",
    "owner": {
      "name": "owner",
      "email": "email@email.com"
    },
    "repo": "https://foo.com",
    "updated_at": "2016-10-12T04:50:58.519Z"
  }
]
```

### Get a Plugin ##

Lists all public plugins.

`GET /plugins/{plugin_name_or_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/plugins/testing
```

**200 "OK" Response**

```json
{
  "created_at": "2016-10-12T04:50:58.519Z",
  "id": "2546d9f3-4316-40f2-805d-a9aaa37d918d",
  "name": "testing",
  "description": "description",
  "owner": {
    "name": "owner",
    "email": "email@email.com"
  },
  "repo": "https://foo.com",
  "updated_at": "2016-10-12T04:50:58.519Z"
}
```


### Create a Plugin ##

Publishes a plugin for users to install.

|   Name   |       Type      | Description                                                                                                                                                                                                | Example                                                                                                                            |
|:--------:|:---------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
|  name   | required string | An alpha numeric name representing the plugin | myplugin |
|  repo   | required string | The repo where the plugin is installed from | https://github.com/foo/bar |
|  owner  | required string | The name of the owner of the plugin | Trevor Linton |
|  email  | required string | The email of the owner of the plugin | trevor.linton@akkeris.com |
|  description  | optional string | A description (generally one or two lines) describing the plugins functions | Im a plugin |

`POST /plugins`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  -d '{"name":"testing" "repo":"https://foo2.com", "owner":"owner2", "email":"email2@email.com", "description":"description2"}' \
  https://apps.akkeris.io/plugins
```

**201 "Created" Response**

```json
{
  "created_at": "2016-10-12T04:50:58.519Z",
  "id": "2546d9f3-4316-40f2-805d-a9aaa37d918d",
  "name": "testing",
  "description": "description",
  "owner": {
    "name": "owner",
    "email": "email@email.com"
  },
  "repo": "https://foo.com",
  "updated_at": "2016-10-12T04:50:58.519Z"
}
```


### Update a Plugin ##

Revises a plugin for users to install.

|   Name   |       Type      | Description                                                                                                                                                                                                | Example                                                                                                                            |
|:--------:|:---------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
|  repo   | required string | The repo where the plugin is installed from | https://github.com/foo/bar |
|  owner  | required string | The name of the owner of the plugin | Trevor Linton |
|  email  | required string | The email of the owner of the plugin | trevor.linton@akkeris.com |
|  description  | optional string | A description (generally one or two lines) describing the plugins functions | Im a plugin |

`PATCH /plugins/{plugin_name_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X PATCH \
  -d '{"repo":"https://foo2.com", "owner":"owner2", "email":"email2@email.com", "description":"description2"}' \
  https://apps.akkeris.io/plugins/testing
```

**200 "OK" Response**

```json
{
  "created_at": "2016-10-12T04:50:58.519Z",
  "id": "2546d9f3-4316-40f2-805d-a9aaa37d918d",
  "name": "testing",
  "description": "description",
  "owner": {
    "name": "owner",
    "email": "email@email.com"
  },
  "repo": "https://foo.com",
  "updated_at": "2016-10-12T04:50:58.519Z"
}
```


### Delete a Plugin ##

Unpublishes a plugin from the public repo.

`DELETE /plugins/{plugin_name_or_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/plugins/testing
```

**200 "OK" Response**

```json
{
  "created_at": "2016-10-12T04:50:58.519Z",
  "id": "2546d9f3-4316-40f2-805d-a9aaa37d918d",
  "name": "testing",
  "description": "description",
  "owner": {
    "name": "owner",
    "email": "email@email.com"
  },
  "repo": "https://foo.com",
  "updated_at": "2016-10-12T04:50:58.519Z"
}
```

## Webhooks

### Managing Webhooks ##

A service, app or other addon may use webhooks to listen to various events that happen on an application.

### Creating a Webhook

`POST /apps/{appname_or_id}/hooks`

```
{
  "url":"https://somecallback/url",
  "events":[
    "release",
    "build",
    "formation_change",
    "logdrain_change",
    "addon_change",
    "config_change",
    "destroy"
  ],
  "active":true,
  "secret":"some secret for hash"
}
```

**201 "Created" Response**

```json
{
  "url":"https://somecallback/url",
  "events":[
    "release",
    "build",
    "formation_change",
    "logdrain_change",
    "addon_change",
    "config_change",
    "destroy"
  ],
  "active":true,
  "created_at":"2016-08-09T12:00:00Z",
  "id":"01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
  "secret":"some secret for hash"
}
```

A successful webhook results in a 201 response with the id of the webhook.

### Updating a Webhook

Note any of these fields may be provided or left out and a partial update is applied.

`PATCH /apps/{appname_or_id}/hooks/{webhook_id}`

```
{
  "url":"https://somecallback/url",
  "events":[
    "release",
    "build",
    "formation_change",
    "logdrain_change",
    "addon_change",
    "config_change",
    "destroy"
  ],
  "secret":"some secret for hash"
}
```

**200 "OK" Response**

```json
{
  "url":"https://somecallback/url",
  "events":[
    "release",
    "build",
    "formation_change",
    "logdrain_change",
    "addon_change",
    "config_change",
    "destroy"
  ],
  "active":true,
  "created_at":"2016-08-09T12:00:00Z",
  "id":"01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
  "secret":"some secret for hash"
}
```

Upon successfully being updated the API responds with 200 and the body contains the webhook entry.

### Deleting a Webhook

`DELETE /apps/{appname_or_id}/hooks/{webhook_id}`

**200 "OK" Response**

```json
{
  "url":"https://somecallback/url",
  "events":[
    "release",
    "build",
    "formation_change",
    "logdrain_change",
    "addon_change",
    "config_change",
    "destroy"
  ],
  "active":true,
  "created_at":"2016-08-09T12:00:00Z",
  "id":"01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
  "secret":"some secret for hash"
}
```

Upon successful deletion the API responds with 200.

### List Webhooks

`GET /apps/{appname_or_id}/hooks`

**200 "OK" Response**

```json
{
  "url":"https://somecallback/url",
  "events":[
    "release",
    "build",
    "formation_change",
    "logdrain_change",
    "addon_change",
    "config_change",
    "destroy"
  ],
  "active":true,
  "created_at":"2016-08-09T12:00:00Z",
  "id":"01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
  "secret":"some secret for hash"
}
```

### Getting Webhook Results

`GET /apps/{appname_or_id}/hooks/{hook_id}/results`

**200 "OK" Response**

```json
[
  {
    "id": "189860a9-090e-4587-a409-4b82808119ee",
    "last_attempt": {
      "request": {
        "method": "post",
        "url": "https://example.com/webhook",
        "headers": {
          "x-appkit-event": "release",
          "x-appkit-delivery": "189860a9-090e-4587-a409-4b82808119ee",
          "content-type": "application/json",
          "user-agent": "appkit-hookshot",
          "x-appkit-signature": "sha1=ee4bddef4659146988ae47c369a830ba50bac918"
        },
        "body": {
          "action": "release",
          "app": {
            "name": "alamotest4131",
            "id": "f806f1f3-c41b-4ec0-9f50-6a226554d6cd"
          },
          "space": {
            "name": "default"
          },
          "release": {
            "id": "c5f5b3c5-4cac-4b32-adf5-719354332b01",
            "result": "succeeded",
            "created_at": "2018-04-16T19:53:48.196Z",
            "version": 1,
            "description": "Deploy e48f626a-5c53-40ba-a66c-7e8f710ffb70"
          },
          "build": {
            "id": "e48f626a-5c53-40ba-a66c-7e8f710ffb70",
            "result": "succeeded",
            "repo": "https://github.com/abcd/some-repo",
            "commit": "123456",
            "branch": "master"
          }
        }
      },
      "response": {
        "code": 200,
        "headers": {
          "date": "Mon, 16 Apr 2018 19:53:48 GMT",
          "connection": "close",
          "content-length": "0"
        }
      },
      "status": "succeeded",
      "updated_at": "2018-04-16T19:53:48.210Z"
    },
    "num_attempts": 1,
    "hook": {
      "id": "875e1d70-c843-476d-91fc-4bea901a76da",
      "events": [
        "release",
        "build",
        "formation_change",
        "logdrain_change",
        "addon_change",
        "config_change",
        "destroy"
      ]
    },
    "created_at": "2018-04-16T19:53:48.210Z"
  },
  {
    "id": "25634d4a-5c5a-4f15-9a6c-550eb3e45199",
    "last_attempt": {
      "request": {
        "method": "post",
        "url": "https://example.com/webhook",
        "headers": {
          "x-appkit-event": "formation_change",
          "x-appkit-delivery": "25634d4a-5c5a-4f15-9a6c-550eb3e45199",
          "content-type": "application/json",
          "user-agent": "appkit-hookshot",
          "x-appkit-signature": "sha1=85cad787fa7dbc9b35c43cf1ed3d3d43dbc433dc"
        },
        "body": {
          "action": "formation_change",
          "app": {
            "name": "alamotest4131",
            "id": "f806f1f3-c41b-4ec0-9f50-6a226554d6cd"
          },
          "space": {
            "name": "default"
          },
          "change": "update",
          "changes": [
            {
              "type": "web",
              "quantity": 2,
              "size": "constellation"
            }
          ]
        }
      },
      "response": {
        "code": 200,
        "headers": {
          "date": "Mon, 16 Apr 2018 19:53:49 GMT",
          "connection": "close",
          "content-length": "0"
        }
      },
      "status": "succeeded",
      "updated_at": "2018-04-16T19:53:49.298Z"
    },
    "num_attempts": 1,
    "hook": {
      "id": "875e1d70-c843-476d-91fc-4bea901a76da",
      "events": [
        "release",
        "build",
        "formation_change",
        "logdrain_change",
        "addon_change",
        "config_change",
        "destroy"
      ]
    },
    "created_at": "2018-04-16T19:53:49.298Z"
  }
]
```


### Getting Webhook Result

`GET /apps/{appname_or_id}/hooks/{hook_id}/results/${result_id}`

**200 "OK" Response**

```json
{
  "id": "189860a9-090e-4587-a409-4b82808119ee",
  "last_attempt": {
    "request": {
      "method": "post",
      "url": "https://example.com/webhook",
      "headers": {
        "x-appkit-event": "release",
        "x-appkit-delivery": "189860a9-090e-4587-a409-4b82808119ee",
        "content-type": "application/json",
        "user-agent": "appkit-hookshot",
        "x-appkit-signature": "sha1=ee4bddef4659146988ae47c369a830ba50bac918"
      },
      "body": {
        "action": "release",
        "app": {
          "name": "alamotest4131",
          "id": "f806f1f3-c41b-4ec0-9f50-6a226554d6cd"
        },
        "space": {
          "name": "default"
        },
        "release": {
          "id": "c5f5b3c5-4cac-4b32-adf5-719354332b01",
          "result": "succeeded",
          "created_at": "2018-04-16T19:53:48.196Z",
          "version": 1,
          "description": "Deploy e48f626a-5c53-40ba-a66c-7e8f710ffb70"
        },
        "build": {
          "id": "e48f626a-5c53-40ba-a66c-7e8f710ffb70",
          "result": "succeeded",
          "repo": "https://github.com/abcd/some-repo",
          "commit": "123456",
          "branch": "master"
        }
      }
    },
    "response": {
      "code": 200,
      "headers": {
        "date": "Mon, 16 Apr 2018 19:53:48 GMT",
        "connection": "close",
        "content-length": "0"
      }
    },
    "status": "succeeded",
    "updated_at": "2018-04-16T19:53:48.210Z"
  },
  "num_attempts": 1,
  "hook": {
    "id": "875e1d70-c843-476d-91fc-4bea901a76da",
    "events": [
      "release",
      "build",
      "formation_change",
      "logdrain_change",
      "addon_change",
      "config_change",
      "destroy"
    ]
  },
  "created_at": "2018-04-16T19:53:48.210Z"
}
```

## Webhook Event Payloads

The following events exist for hooks to listen to:

* release
* build
* feature_change
* formation_change
* logdrain_change
* addon_change
* config_change
* destroy
* preview
* released
* crashed

When a hook is called the URL provided is called with a POST method, the body is different depending on the event but will always have the property "action" that equals the event name. 

Finally you can rely on the following headers being available on each of the webhook calls:

* x-appkit-event will equal the event name
* x-appkit-delivery will equal the unique id for the webhook result event.
* x-appkit-signature will equal the SHA1 of the payload using the secret specified when the hook was created (prefixed with sha1=, e.g., 'sha1=' + hmac(payload, secret) )

Also the user agent will equal "appkit-hookshot"

### Release Event Payload

The following is fired to the webhook url during a release success or failure event:

`POST [callback end point]`

```json
{
  "action":"release",
  "app":{
    "name":"yourappname",
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621"
  },
  "space":{
    "name":"the-space"
  },
  "release":{
    "id":"1edbac4b-6a5e-09e1-ef3a-08084a904623",
    "result":"succeeded|failed",
    "created_at":"2016-08-09T12:00:00Z",
    "version":13,
    "description":"Auto Deploy of 31202984"
  },
  "build":{
    "id":"8bdbac4b-6a5e-09e1-ef3a-08084a904622"
  }
}
```

### Build Event Payload

The following is fired to the webhook url during a build pending, success or failure event (note you'll receive at least 2 of these events, check the status field for the correct state you wish to act on):


`POST [callback end point]`

```json
{
  "action":"build",
  "app":{
    "name":"yourappname",
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621"
  },
  "space":{
    "name":"the-space"
  },
  "build":{
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
    "result":"pending|succeeded|failed",
    "created_at":"2016-08-09T12:00:00Z",
    "repo":"https://github.com/akkeris/bar.git",
    "commit":"7edbac4b6a5e09e1ef3a08084a904621"
  }
}
```

### Feature Change Event Payload

The occurs when there is a change to to enable a feature on an app, or to disable a feature.

`POST [callback end point]`

```json
{
  "action":"feature_change",
  "app":{
    "name":"yourappname",
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621"
  },
  "space":{
    "name":"the-space"
  },
  "change":"update",
  "changes":[
    {
      "type":"update",
      "name":"feature-name",
      "value":true
    }
  ],
  "feature":{
    "description":"Human readable description of the feature that was just enabled or disabled.",
    "doc_url":"/features/review-apps",
    "id":"9e7ec5d2-c410-4d04-8d5e-db7746c40b42",
    "state":"alpha|beta|public|ga",
    "name":"feature-name",
    "display_name":"Human Readable Feature Name",
    "feedback_email":"cobra@octanner.com"
    "enabled":true
  }
}
```

### Formation Change Event Payload

The occurs when there is a scale event or a new formation type is created.

`POST [callback end point]`

```json
{
  "action":"formation_change",
  "app":{
    "name":"yourappname",
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621"
  },
  "space":{
    "name":"the-space"
  },
  "change":"update|delete|create",
  "changes":[
    {
      "type":"web",
      "port":8000,
      "command":"cmd",
      "size":"constellation",
      "quantity":1
    }
  ]
}
```

### Preview App Created Event Payload

The occurs when a forked preview app is created.

`POST [callback end point]`

```json
{
  "action":"preview",
  "app":{
    "name":"yourappname",
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621"
  },
  "space":{
    "name":"the-space"
  },
  "change":"create",
  "preview":{
    "app":{
      "name":"youraabcdef",
      "id":"865bac4b-6a5e-09e1-ef3a-08084a904622"
    },
    "app_setup":{
      "id":"335bac4b-6a5e-09e1-ef3a-08084a904611",
      "created_at":"2016-08-11T20:16:45.820Z",
      "updated_at":"2016-08-11T20:16:45.820Z",
      "app":{
        "id":"865bac4b-6a5e-09e1-ef3a-08084a904622",
        "name":"youraabcdef"
      },
      "build":{
        "id":null,
        "status":"queued",
        "output_stream_url":null
      },
      "progress":0,
      "status":"pending",
      "failure_message":"",
      "manifest_errors":[],
      "postdeploy":null,
      "resolved_success_url":null
    }
  },
  "sites":[
    {
      "id": "94244b96-2889-4604-ada7-4886bf39367f",
      "domain": "altest5809b76a1.akkeris.io",
      "region": {
        "name": "us-seattle",
        "id": "f5f1d4d9-aa4a-12aa-bec3-d44af53b59e3"
      },
      "created_at": "2018-04-11T13:48:23.767Z",
      "updated_at": "2018-04-11T13:48:23.767Z",
      "compliance": []
    }
  ]
}
```

### Log Drain Change Event Payload

The occurs when there is a change (addition or removal of log drains).

`POST [callback end point]`

```json
{
  "action":"logdrain_change",
  "app":{
    "name":"yourappname",
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621"
  },
  "space":{
    "name":"the-space"
  },
  "change":"delete|create",
  "changes":[
    {
      "id":"a32bac4b-6a5e-09e1-ef3a-08084a904621",
      "url":"syslog+tls://foo.com"
    }
  ]
}
```

### Addon Change Event Payload

This occurs when an addon is provisioned or de-provisioned.  Note this does not fire when addons are attached or dettached, only when they are deleted (permenantly removed).  Note that if an application is destroyed (depending on race conditions) for each addon owned by the app the webhook will receive an addon change event of "delete"; be aware due to network timing these event could occur after or before the app destroy event.

`POST [callback end point]`

```json
{
  "action":"addon_change",
  "app":{
    "name":"yourappname",
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621"
  },
  "space":{
    "name":"the-space"
  },
  "change":"delete|create",
  "changes":[
    {
      "actions": null,
      "addon_service": {
        "id": "01bb60d2-f2bb-64c0-4c8b-ead731a690bc",
        "name": "alamo-postgresql"
      },
      "config_vars": [],
      "created_at": "2016-08-11T20:16:45.820Z",
      "id": "5feef9bb-2bed-4b62-bdf5-e31691fab88c",
      "name": "62dc0fd3-2cba-4925-8fca-d1129d296d2c-api:alamo-postgresql-1470946605820",
      "plan": {
        "id": "a91d7641-a61e-fb09-654e-2def7c9f162d",
        "name": "alamo-postgresql:small"
      },
      "provider_id": "alamo",
      "updated_at": "2016-08-11T20:16:45.820Z",
      "web_url": "https://akkeris.example.com/apps/62dc0fd3-2cba-4925-8fca-d1129d296d2c-api"
    }
  ]
}
```


### Config Change Event Payload

This event occurs when a config var is added, removed or updated; this event fires only for user defined config vars, and not for config var changes due to addon changes (see addon change event for listening to those changes).  In addition; if the application is in a SOCS compliant space the config var value will be redacted as it is in the command line (thus; be sure not to rely on this webhook for sensitive credentials or passing private information).


`POST [callback end point]`

```json
{
  "action":"config_change",
  "app":{
    "name":"yourappname",
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621"
  },
  "space":{
    "name":"the-space"
  },
  "changes":[
    {
      "type":"create",
      "name":"CONFIG_NAME"
    },
    {
      "type":"update",
      "name":"CONFIG_NAME1"
    },
    {
      "type":"delete",
      "name":"CONFIG_NAME2"
    },
  ],
  "config_vars":{
    "CONFIG_NAME":"values",
    "CONFIG_NAME1":"value",
    "CONFIG_NAME2":"foo"
  }
}
```


### App Destroy Event Payload

This event occurs when an app is destroyed permenantly.

`POST [callback end point]`

```json
{
  "action":"destroy",
  "app":{
    "name":"yourappname",
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621"
  },
  "space":{
    "name":"the-space"
  }
}
```

### App Crashed Event Payload


This event occurs when one or more dynos runs out of memory, fails to start, does not accept requests, exits prematurely or exits unexpectedly. 

The crashed codes can be one of the following:

* `H0 - Unknown error`, an unknown error occured and the dyno(s) were terminated. 
* `H8 - Premature exit`, the dyno exited without an error, but failed to continuely run as expected.
* `H9 - App did not startup`, the dyno(s) did not startup, check the dyno(s) logs for more information.
* `H10 - App crashed`, the dyno(s) exited unexpectedly, check the dyno(s) logs for more information.
* `H20 - App boot timeout`, the dyno did not listen to incoming requests after it started.
* `H99 - Platform error`, an unexpected error on the platform prevented these dyno(s) from running.
* `R14 - Memory quota exceeded`, the dyno(s) exceeded their memory limits.

The `description` field contains a human readible description of the error (usually the one above).  
The `restarts` field defines how many times the dyno(s) have been restarted or retried.
The `dynos` array contains the dyno(s) which were affected by this event.

`POST [callback end point]`

```json
{
  "action":"crashed",
  "app":{
    "name":"yourappname",
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621"
  },
  "space":{
    "name":"the-space"
  },
  "code":"R14",
  "description":"Memory quota exceeded",
  "restarts":1,
  "dynos":[
    {
      "type":"web",
      "dyno":"8577193-asxdx"
    }
  ],
  "crashed_at":"2017-02-05T22:16:56.616Z"
}
```

### Released Event Payload


This event occurs when an app has a new version and is now available for requests.  This differs from the `release` hook in that the release is the start in which a deployment begins but not when the new version is ready, running and requests are being routed to it.

`POST [callback end point]`

```json
{
  "action":"released",
  "app":{
    "name":"yourappname",
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621"
  },
  "space":{
    "name":"the-space"
  },
  "slug":{
    "image":"registry.host.io/repo/image:tag"
  },
  "released_at":"2017-02-05T22:16:56.616Z"
}
```


## Invoices

Invoices provide a mechanism to check by organization, space or all up how much usage and costs have been incurred.

### List Invoices ##

Lists all invoices

`GET /account/invoices`
`GET /organization/{org}/invoices`
`GET /space/{org}/invoices`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/account/invoices
```

**200 "OK" Response**

```json
[
  {
    "$ref": "/account/invoices/2016-07-01"
  },
  {
    "$ref": "/account/invoices/2016-08-01"
  },
  {
    "$ref": "/account/invoices/2016-09-01"
  },
  {
    "$ref": "/account/invoices/2016-10-01"
  },
  {
    "$ref": "/account/invoices/2016-11-01"
  },
  {
    "$ref": "/account/invoices/2016-12-01"
  },
  {
    "$ref": "/account/invoices/2017-01-01"
  },
  {
    "$ref": "/account/invoices/2017-02-01"
  }
]
```

### Get a Invoice ##

Get information on an invoice

`GET /account/invoices/{invoice_id}`
`GET /organizations/{org}/invoices/{invoice_id}`
`GET /spaces/{org}/invoices/{invoice_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/account/invoices/2017-02-01
```

**200 "OK" Response**

```json
{
  "addons_total": 25,
  "database_total": 0,
  "charges_total": 213.51000000000005,
  "created_at": "2017-02-01T00:00:00.000Z",
  "credits_total": 0,
  "dyno_units": 61,
  "id": "2017-02-01",
  "number": "1485907200000",
  "payment_status": "Pending",
  "period_end": "2017-02-05T22:16:56.616Z",
  "period_start": "2017-02-01T00:00:00.000Z",
  "platform_total": 188.51000000000002,
  "state": 1,
  "total": 213.51000000000005,
  "updated_at": "2017-02-01T00:00:00.000Z",
  "weighted_dyno_hours": 7320,
  "items": [
    {
      "organization": "akkeris",
      "app": {
        "name": "app-space"
      },
      "description": "lang:dev addon",
      "type": "addon",
      "quantity": 1,
      "price_per_unit": 0,
      "billed_price": 0,
      "created_at": "2016-09-27T20:54:44.359Z",
      "deleted_at": null
    },
    {
      "organization": "akkeris",
      "app": {
        "name": "app-space"
      },
      "description": "alamo-redis:small addon",
      "type": "addon",
      "quantity": 1,
      "price_per_unit": 140,
      "billed_price": 25,
      "created_at": "2016-08-15T19:02:02.781Z",
      "deleted_at": null
    },
    {
      "organization": "akkeris",
      "app": {
        "name": "app-space"
      },
      "description": "constellation web dyno",
      "type": "dyno",
      "quantity": 1,
      "price_per_unit": 60,
      "billed_price": 10.71,
      "created_at": "2016-07-26T15:47:33.411Z",
      "deleted_at": null
    },
    ...
  ]
}
```



## SSL and TLS Certificates

TLS/SSL End Points requests or installs a certificate for a domain/site that's been provisioned.


### Order a Certificate ##

Place an order for a new ssl/tls certificate (note if common name/domain names contains a `*.domain.com` then a wildcard cert is issued), if more than one domain is requested a multi_domain cert is issued, if there is only one domain in the domain_names a single ssl/tls certificate is issued.

|   Name   |       Type      | Description                                                                                                                                                                                                | Example                                                                                                                            |
|:--------:|:---------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
|  name   | required string | An alpha numeric name representing the certificate | "my-cert" |
|  common_name   | required string | The main domian listed on the certificate, note if a star is used a wildcard certificate will be ordered (e.g., *.example.com) | "www.example.com" |
|  domain_names  | required array[string] | A list of domai names covered by this certificate, must include the common name | ["example.com","www.example.com","qa.example.com","dev.example.com"] |
|  org  | required uuid | The uuid or name of the organization responsible for ordering and maintaining the certificate | "performance" |
|  comments  | optional string | A description of what the purpose of the certificate is for info-sec. | "We need a new cert for our platform work" |
|  region  | optional string | The region in which to order the certificate for | us-seattle |

`POST /ssl-orders`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  -d '{"name":"my-cert" "common_name":"www.example.com", "domain_names":["example.com","www.example.com","qa.example.com","dev.example.com"], "org":"performance", "comments":"We need a new cert for our platform work"}' \
  https://apps.akkeris.io/ssl-orders
```

**201 "Created" Response**

```json
{
  "created_at":"2016-07-26T15:47:33.411Z",
  "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
  "name":"my-cert",
  "comments":"We need a new cert for our platform work", 
  "requester":{
    "name":"Sammy Smith"
  },
  "organization":{
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
    "name":"performance"
  },
  "common_name":"www.example.com",
  "domain_names":[
    "example.com",
    "www.example.com",
    "qa.example.com",
    "dev.example.com"
  ],
  "installed":false,
  "status":"pending",
  "region":{
     "id":"888bac4b-6a5e-09e1-ef3a-08084a904621",
     "name":"us-seattle"
  },
  "expires":"2016-07-26T15:47:33.411Z",
  "issued":"2016-07-26T15:47:33.411Z",
  "updated_at":"2016-07-26T15:47:33.411Z",
  "type":"multi_domain"
}
```

**422 Unprocessable Entity**

This certificate occurs when an existing certificate already explicitly covers one or more of the domains listed (wildcards do not count). 

**400 Bad Request**

This may occur if a certificate domain name is invalid.


### Install a Certificate ##

Once a certificates status becomes "issued" a certificate may be installed into the load balancer, any site using the specified domain will immediately begin using this certificate.


`PUT /ssl-orders/{ssl_certificate_id_or_name}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X PUT \
  https://apps.akkeris.io/ssl-orders/7edbac4b-6a5e-09e1-ef3a-08084a904621
```

**201 "Created" Response**

```json
{
  "created_at":"2016-07-26T15:47:33.411Z",
  "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
  "name":"my-cert",
  "comments":"We need a new cert for our platform work",
  "requester":{
    "name":"Sammy Smith"
  },
  "organization":{
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
    "name":"performance"
  },
  "common_name":"www.example.com",
  "domain_names":[
    "example.com",
    "www.example.com",
    "qa.example.com",
    "dev.example.com"
  ],
  "region":{
     "id":"888bac4b-6a5e-09e1-ef3a-08084a904621",
     "name":"us-seattle"
  },
  "installed":true,
  "status":"issued",
  "expires":"2016-07-26T15:47:33.411Z",
  "issued":"2016-07-26T15:47:33.411Z",
  "updated_at":"2016-07-26T15:47:33.411Z",
  "type":"multi_domain"
}
```

**422 Unprocessable Entity**

This certificate may not have been issued yet, or potentially was not approved and therefore uninstallable.

**409 Conflict**

This certificate may have already been installed or an existing conflict that requires info sec or cobra to intervene. Email cobra@akkeris.com if you encounter this error.


### List TLS/SSL Orders ##

Lists all tls and ssl orders that are pending.  Note this will NOT re-check the statuses, it's important to request the info on
the specific order to see if the status has changed rather than on the list.

`GET /ssl-orders`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/ssl-orders
```

**200 "OK" Response**

```json
[
  {
    "created_at":"2016-07-26T15:47:33.411Z",
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
    "name":"example-cert",
    "comments":"Needed for x, y, z",
    "requester":{
      "name":"Sammy Smith"
    },
    "organization":{
      "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
      "name":"my-org"
    },
    "common_name":"www.example.com",
    "domain_names":[
      "www.example.com"
    ],
    "region":{
      "id":"888bac4b-6a5e-09e1-ef3a-08084a904621",
      "name":"us-seattle"
    },
    "installed":false,
    "status":"rejected",
    "expires":"2016-07-26T15:47:33.411Z",
    "issued":"2016-07-26T15:47:33.411Z",
    "updated_at":"2016-07-26T15:47:33.411Z",
    "type":"ssl_plus"
  }
]
```

### Get Certificate Order Status

`GET /ssl-orders/{certificate_name_or_id}`

Check the status of a specific ssl/tls order, this will fetch any new changes to the status of the certificate.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/ssl-orders
```

**200 "OK" Response**

```json
{
  "created_at":"2016-07-26T15:47:33.411Z",
  "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
  "name":"example-cert",
  "comments":"Needed for x, y, z",
  "requester":{
    "name":"Sammy Smith"
  },
  "organization":{
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
    "name":"my-org"
  },
  "common_name":"www.example.com",
  "domain_names":[
    "www.example.com"
  ],
  "region":{
     "id":"888bac4b-6a5e-09e1-ef3a-08084a904621",
     "name":"us-seattle"
  },
  "installed":false,
  "status":"pending",
  "expires":"2016-07-26T15:47:33.411Z",
  "issued":"2016-07-26T15:47:33.411Z",
  "updated_at":"2016-07-26T15:47:33.411Z",
  "type":"ssl_plus"
}
```


### List TLS/SSL End Points ##

Lists all tls and ssl endpoints that are installed and available

`GET /ssl-endpoints`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/ssl-endpoints
```

**200 "OK" Response**

```json
[
  {
    "created_at":"2016-07-26T15:47:33.411Z",
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
    "name":"example-cert",
    "comments":"Needed for x, y, z",
    "requester":{
      "name":"Sammy Smith"
    },
    "organization":{
      "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
      "name":"my-org"
    },
    "common_name":"www.example.com",
    "domain_names":[
      "www.example.com"
    ],

    "region":{
       "id":"888bac4b-6a5e-09e1-ef3a-08084a904621",
       "name":"us-seattle"
    },
    "installed":true,
    "status":"approved",
    "expires":"2016-07-26T15:47:33.411Z",
    "issued":"2016-07-26T15:47:33.411Z",
    "updated_at":"2016-07-26T15:47:33.411Z",
    "type":"ssl_plus"
  }
]
```

### Get Certificate Information

Get information (CSR, expiration, certificate and ownership) on an installed TLS/SSL certificate.

`GET /ssl-endpoints/{certificate_name_or_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/ssl-endpoints
```

**200 "OK" Response**

```json
{
  "created_at":"2016-07-26T15:47:33.411Z",
  "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
  "name":"example-cert",
  "comments":"Needed for x, y, z",
  "requester":{
    "name":"Sammy Smith"
  },
  "organization":{
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
    "name":"my-org"
  },
  "common_name":"www.example.com",
  "domain_names":[
    "www.example.com"
  ],
  "region":{
     "id":"888bac4b-6a5e-09e1-ef3a-08084a904621",
     "name":"us-seattle"
  },
  "installed":true,
  "status":"approved",
  "expires":"2016-07-26T15:47:33.411Z",
  "issued":"2016-07-26T15:47:33.411Z",
  "updated_at":"2016-07-26T15:47:33.411Z",
  "type":"ssl_plus"
}
```

## Sites

Sites provide a domain in which you can route various url paths to apps in Alamo.

### List Sites

`GET /sites`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/sites
```

**200 "OK" Response**

```json
[{
    "id": "81442fc0-cf86-47c2-943c-28da18a84fad",
    "domain": "alamotestsite4106",
    "region":{
      "name":"us-seattle",
      "id":"81442fc0-cf86-47c2-943c-28da18a84fad"
    },
    "created_at": "2017-05-02T15:31:09.774Z",
    "updated_at": "2017-05-02T15:31:09.774Z",
    "compliance": []
}, {
    "id": "ceba4ef1-5fbf-4c12-9adc-a7c1d7673b14",
    "domain": "fuggle.akkeris.io",
    "region":{
      "name":"us-seattle",
      "id":"81442fc0-cf86-47c2-943c-28da18a84fad"
    },
    "created_at": "2017-06-21T22:22:43.780Z",
    "updated_at": "2017-06-21T22:22:43.780Z",
    "compliance": []
}, {
    "id": "3db62e0c-9496-4ad0-a735-830b6ef7d5c5",
    "domain": "appkitui.akkeris.io",
    "region": "us-seattle",
    "created_at": "2017-08-02T15:30:16.158Z",
    "updated_at": "2017-08-02T15:30:16.158Z",
    "compliance": []
}]
```

### Create Site

`POST /sites`

Creates a new https website.

|   Name       |       Type      | Description                                                                                   | Example                                                 |
|:------------:|:---------------:|-----------------------------------------------------------------------------------------------|---------------------------------------------------------|
| domain | required string | A name for your domain, must only contain alpha-numerics, hypens, and full stops | merpderp.akkeris.io
| region  | required string | Cluster region | us
| internal  | required boolean | If routing to internal apps | true  

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/sites \
  -d '{"domain":"merpderp.akkeris.io",
       "regoin":"us",
       "internal": false}'
```

**200 "Ok" Response**

```json
{
  "id": "e4fe6f60-aa82-4ebd-ae65-d23f71334876",
  "domain": "merpderp.akkeris.io",
  "region": "us-seattle",
  "created_at": "2017-09-01T20:31:13.549Z",
  "updated_at": "2017-09-01T20:31:13.549Z",
  "compliance": []
}
```

### Delete Site

`DELETE /sites`

Deletes the specified website.

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/sites

**200 "Deleted" Response**

```json
{
  "created_at": "2016-07-26T15:47:05.126Z",
  "id": "3911c0ec-e967-4497-8db5-54a52c5174b4",
  "name": "myorg",
  "updated_at": "2016-07-26T15:47:07.267Z",
  "role":"admin"
}
```

## Routes
Routes provide path based routing to specified apps off of a site.

### List Routes
*By site*

`GET /site/{site_name}/routes`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/sites/test.akkeris.io/routes
```

**200 "OK" Response**

```json
[{
    "id": "45736b25-5752-4561-858f-fb8169375665",
    "app": "pipeline1-cory",
    "site": "testsite2",
    "source_path": "/",
    "target_path": "/",
    "created_at": "2017-09-05T20:01:59.100Z",
    "updated_at": "2017-09-05T20:01:59.100Z"
}, {
    "id": "0f4be452-139a-48d8-b678-0d3f0c7d3ff3",
    "app": "pipeline2-cory",
    "site": "testsite2",
    "source_path": "/target",
    "target_path": "/",
    "created_at": "2017-09-05T21:02:03.307Z",
    "updated_at": "2017-09-05T21:02:03.307Z"
}]
```

### Create Route

`POST /routes`

Creates a new http route for a site from a specific URI source path on the site to an apps URI target path

|   Name       |       Type      | Description                                                                                   | Example                                                 |
|:------------:|:---------------:|-----------------------------------------------------------------------------------------------|---------------------------------------------------------|
| site | required string | A valid site for the route to be attached to | merpderp.akkeris.io |
| app  | required string | The target app to route to | api-default |
| source_path  | required string  | valid uri path for the source that will be created on the site | / | 
| target_path | required string | valid uri path to the target app | / 

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/sites \
  -d '{"site":"merpderp.akkeris.io",
       "app":"8c4adc95-1348-4c8f-ba2f-e0b726dc2604",
       "source_path": "/",
       "target_path": "/"}'
```

**200 "Ok" Response**

```json
{
  "id": "45736b25-5752-4561-858f-fb8169375665",
  "app": "pipeline1-cory",
  "site": "testsite2",
  "source_path": "/",
  "target_path": "/",
  "created_at": "2017-09-05T20:01:59.100Z",
  "updated_at": "2017-09-05T20:01:59.100Z"
}
```

### Delete Route

`DELETE /routes/{route_id}`

Deletes a route

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X DELETE \
  https://apps.akkeris.io/routes/45736b25-5752-4561-858f-fb8169375665
```

## Audits
Audits provide activity on a given app.

### List Activity

`GET /audits?{app&space&user}`

| Name | Type | Description | Example |
|------|---------|---------|-----------|
| user | optional string | filter by username that enacted the event | murray.resinski |
| app | optional string | filter by app for all events | api |
| space | optional string | filter by space for events on apps | default |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/audits?app=api&space=default
```

**200 "OK" Response**

```json
[{
    "action": "feature_change",
    "app": {
      "name": "api",
      "id": "fa2b535d-de4d-4a14-be36-d44af53b59e3"
    },
    "space": {
      "name": "default"
    },
    "changes": [{
      "type": "update",
      "name": "auto-release",
      "value": true
    }],
    "feature": {
      "description": "When the application receives a new build whether or not it should automatically release the build.",
      "doc_url": "/features/auto-release",
      "id": "8e7ec5d2-c410-4d04-8d5e-db7746c40b44",
      "state": "public",
      "name": "auto-release",
      "display_name": "Auto release builds",
      "feedback_email": "cobra@octanner.com",
      "enabled": true
    },
    "username": "test",
    "timestamp": "2018-04-25T18:00:10.218Z"
  }
]
```