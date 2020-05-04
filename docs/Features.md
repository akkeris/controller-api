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
  "feedback_email":"cobra@akkeris.io",
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
  "feedback_email":"cobra@akkeris.io",
  "enabled":false
},
{
  "description":"When a pull request is received, automatically create a preview site and application (web dyno only) with the same config as the development application.",
  "doc_url":"/features/preview",
  "id":"8e7ec5d2-c410-4d04-8d5e-db7746c40b44",
  "state":"beta",
  "name":"preview",
  "display_name":"Preview Apps",
  "feedback_email":"cobra@akkeris.io",
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
  "feedback_email":"cobra@akkeris.io",
  "enabled":false
}
```