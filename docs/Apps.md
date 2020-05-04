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
| description | string | App description, used for informational purposes  |  My akkeris app |
| labels | string | Comma-separated list of labels, used for categorization |  perf,apis | |


**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps \
  -d '{"org":"akkeris", "name":"events", "space":"perf-dev-us", "description":"desc", "labels":"label1,label2"}'
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
  "git_branch":"",
  "description":"desc",
  "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77",
  "labels":"label1,label2",
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

Updates the maintenance mode, description, or labels of an application - note that build_stack and name are not currently updatable but are there for future use.

|   Name   |       Type      | Description                                                                                                                                                                                                | Example                                                                                                                            |
|:--------:|:---------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
|    maintenance   | boolean | True or false value indicating whether to place the app into maintenance mode. | true                                                                                                                           |
|   name   | required string | Updates the app name (note currently does not work, placeholder for future feature) | events                                                                                                                             |
|   build_stack  | required string | Updates the build stack to use for this app (note this currently does not work place holder for future feature) | ds1 |
| description | string | Updates the description of the app |  My akkeris app |
| labels | string | Updates the labels of the app |  perf,apis | |

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
  "description":"desc",
  "id":"4f739e5e-4cf7-11e6-beb8-9e71128cae77",
  "labels":"label1,label2",
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

