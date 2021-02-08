## Formations

The formation of processes that should be maintained for an app. Update the formation to scale processes or change dyno sizes. Available process type names and commands are defined by the process_types attribute for the slug currently released on an app.

### Formation Create

`POST /apps/{appname}/formation`

Create a new process or formation type. Note that formations can be automatically created/removed based on the Procfile at the root of your build.

|   Name   |       Type      | Description                                                                                                                                                                                                | Example                                                                                                                            |
|:--------:|:---------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
|   size   | required string | The size of server requested. defaults to gp2 on autodeploy | gp2 |
| quantity | requred string  | The quantity of servers or instances for this app. | 1 |
|   type   | required string | The type of server requested, note that "web" has a special meaning as its the only process with an exposed port to take incoming web traffic (specified by the PORT env). | web |
|   port   | optional integer| The port number to run on. | 9000 |
| command  | optional string | The command to run when the build image spins up, this if left off will default to the RUN command in the docker image. | null |
| healthcheck | option string | A relative URL that will be used to inspect the running app to determine if its healthy, this should be a relative url. | /health |
| oneoff | option boolean | Indicates whether or not this formation is a "one-off" formation | false |
| options | option object | Formation options - currently used to specify one-off overrides like environment or image | { "env": { "key": "value" }, "image": "hello-world:latest" } |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/formation
  -d '{"size":"gp2", "quantity":1, "type":"web", "command":null, "healthcheck":null}'
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
  "size": "gp2",
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
  "size": "gp2",
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
    "name": "gp1-prod",
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
    "name": "gp1",
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
    "size": "gp2",
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
|   size   | required string | The size of server requested.                                                                                                                                     | gp2                                                                                                                       |
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
  -d '[{"size":"gp2", "quantity":1, "type":"web"}]'
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
    "size": "gp2",
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
|   size   | required string | The size of server requested.                                                                                                                                     | gp2                                                                                                                        |
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
  -d '{"size":"gp2", "quantity":1}]'
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
  "size": "gp2",
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
