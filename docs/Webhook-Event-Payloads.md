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
* preview-released
* released
* crashed
* pipeline_promotion
* updated
* security_scan

When a hook is called, the URL provided is called with a `POST` method. While the body of the `POST` may differ slightly depending on the event, it will always have the property "action" that equals the event name. 

Finally, you can rely on the following headers being available on each of the webhook calls:

* `x-akkeris-event` will equal the event name
* `x-akkeris-delivery` will equal the unique id for the webhook result event.
* `x-akkeris-signature` will equal the SHA1 of the payload using the secret specified when the hook was created (prefixed with sha1=, e.g., 'sha1=' + hmac(payload, secret) )
* `x-akkeris-token` will contain a JWT token that allows calls to Apps API to take further actions. 
* `user-agent` will equal `akkeris-hookshot`

### Using Temporary Tokens from Webhooks

Almost all webhooks contain a header `x-akkeris-token` that can be used to make calls against the Akkeris Apps API. This is a useful way to add functionality to Akkeris and implement Pipeline Status Checks or add additional innovations. This token does have certain limitaitons:

* The token will contain the same (or less) permissions as the user who attached the webhook.  
* The token will only live for 1 hour after the webhook was called. 
* `feature_change`, `logdrain_change`, `formation_change`, `config_change` and `addon_change` events will limit the actions you can take to only the application that caused the event to fire.
* `crashed`, `destroy` events and `preview-released` events do not issue tokens.
* Temporary tokens cannot destroy addons, sites or apps.
* Temporary tokens cannot modify `socs` or `prod` related resources with the exception of pipeline promotions on `release` or `released` events (e.g., formation changes, feature changes, logdrain changes, etc).
* Temporary tokens cannot add additional hooks or remove hooks.

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
    "id":"8bdbac4b-6a5e-09e1-ef3a-08084a904622",
    "result":"succeeded",
    "repo":"https://github.com/akkeris/foo.git",
    "commit":"7edbac4b6a5e09e1ef3a08084a904621",
    "branch":"master"
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
    "branch":"master",
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
    "feedback_email":"cobra@akkeris.io",
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
      "size":"gp2",
      "quantity":1
    }
  ]
}
```

### Preview App Created Event Payload

The occurs when a forked preview app is created. This event fires on the app that the preview app was created on.  This event fires prior to the preview app being released and ready. For notifications of a release on a preview app see the `preview-released` webhook.

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


### Preview App Released Event Payload

The occurs when a forked preview app is released. This will fire when any code, configuration or addon change happens on any of the app's previews. The payload is similar to the `released` payload but contains an additional field `source_app` that contians the app that created the preview app.  Note that this event fires on the `source_app` and not on the preview app, this is intentional so that testing suites can be notified when a preview app of the `source_app` have been released and are ready to be tested, the payload (outside of `source_app`) describes the preview app that was released.


`POST [callback end point]`

```json
{
   "source_app":{
      "name":"originalapp",
      "id":"55b17a6f-f2e7-4698-b60a-5f89f6f33021"
   },
   "app":{
      "name":"yourappname",
      "id":"08b17a6f-f2e7-4698-b60a-6f89f6f2f00c"
   },
   "space":{  
      "name":"default"
   },
   "key":"yourappabcde-default",
   "action":"preview-released",
   "dyno":{
      "type":"web"
   },
   "slug":{  
      "image":"docker.akkeris.io/org/yourappname-08b17a6f-f2e7-4698-b60a-6f89f6f2f00c:0.4",
      "source_blob":{  
         "checksum":"12345",
         "url":null,
         "version":"Optional Version Info",
         "commit":"abcde3234fdsadf32342efasdf23432",
         "author":"John Smith",
         "repo":"https://github.com/org/repo",
         "branch":"my_branch",
         "message":"My commit message"
      },
      "id":"44bc0cf4-b3fa-415c-99ef-c8a0b6f7364a"
   },
   "released_at":"2018-08-23T15:38:16.010Z"
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


This event occurs when an app has a new version and is now available for requests.  This differs from the `release` hook in that the release is the start in which a deployment begins but not when the new version is ready, running and requests are being routed to it. This will fire for each dyno in your formation, for example if you have a `web` and `worker` dyno type and 3 `web` dynos this released event would fire twice, once for `web` after both dynos are up and running and the old instances are being stopped, then the `worker`. You can distinguish which dyno has released by looking at the dyno.type field.

`POST [callback end point]`

```json
{  
   "app":{  
      "name":"yourappname",
      "id":"08b17a6f-f2e7-4698-b60a-6f89f6f2f00c"
   },
   "space":{  
      "name":"default"
   },
   "key":"yourappname-default",
   "action":"released",
   "dyno":{
    "type":"web"
   },
   "release": {
     "id": "d7c9f3cc-95a2-4476-8519-34f92af7dd68",
     "created_at": "2018-08-23T15:38:15.010Z",
     "updated_at": "2018-08-23T15:38:16.010Z",
     "version": 4
   },
   "slug":{  
      "image":"docker.akkeris.io/org/yourappname-08b17a6f-f2e7-4698-b60a-6f89f6f2f00c:0.4",
      "source_blob":{  
         "checksum":"12345",
         "url":null,
         "version":"Optional Version Info",
         "commit":"abcde3234fdsadf32342efasdf23432",
         "author":"Jimbo Jones",
         "repo":"https://github.com/org/repo",
         "branch":"my_branch",
         "message":"My commit message"
      },
      "id":"44bc0cf4-b3fa-415c-99ef-c8a0b6f7364a"
   },
   "released_at":"2018-08-23T15:38:16.010Z"
}
```

### Pipeline Promotion Event Payload

This event occurs upon a successful pipeline promotion. It fires on the target apps in the coupling, and includes information about the source app (`promoted_from`), the new release (`release`), and the build (`build`).

`POST [callback end point]`

```json
{
  "action":"pipeline_promotion",
  "app":{
    "name":"targetapp",
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621"
  },
  "space":{
    "name":"target-space"
  },
  "promoted_from":{
    "app":{
      "name":"sourceapp",
      "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621"
    },
    "space":{
      "name":"source-space"
    }
  },
  "build": {
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621"
  },
  "release":{
    "id":"1edbac4b-6a5e-09e1-ef3a-08084a904623",
    "status":"queued",
    "description":"Promotion from sourceapp-source-space"
  }
}
```

### App Updated Event Payload

This event occurs if an applications description, labels or maintenance mode is changed.  The properties for `description`, `labels` and `maintenance` only are available on the object if the values change.

`POST [callback end point]`

```json
{
  "action":"updated",
  "app":{
    "name":"targetapp",
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
    "description":"This property exists if the description is updated.",
    "labels":"This property exists if the lables property is updated.",
    "maintenance":true,
  },
  "space":{
    "name":"target-space"
  },
}
```

### Security Scan Event Payload

This event occurs when an external security scanning service has something to report concerning the application. For example, a security scan might have started or finished on the application.

This payload will always include a status, service name, and message. It may also include a link that could lead to further information or scan results. For specifics on possible values for the `status` field, see the third-party security scanning application's documentation.

`POST [callback end point]`

```json
{
  "action":"security_scan",
  "app":{
    "name":"yourappname",
    "id":"7edbac4b-6a5e-09e1-ef3a-08084a904621",
  },
  "space":{
    "name":"default"
  },
  "key":"yourappname-default",
  "status":"success",
  "service_name":"detectify",
  "message":"Security scan for yourname-default.akkeris.io passed!",
  "link":"https://detectify-scanner.akkeris.io/results?yourname-default_akkeris_io"
}
```
