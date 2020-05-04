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

### Get Notes on Config Variables

This end point will get and set notes for config variables. In addition, it provides the addon a config var was created by (if any). 

`GET /apps/{appname}/config-vars/notes`


**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/apps/app-space/config-vars/notes
```

**200 "OK" Response**

```json
{
  "PORT": {
    "type": "system",
    "addon": null,
    "read_only": true,
    "required": true,
    "description": "This is the TCP/IP port the app must respond to http requests on."
  },
  "AKKERIS_DEPLOYMENT": {
    "type": "system",
    "addon": null,
    "read_only": true,
    "required": true,
    "description": "The name of the application excluding the spaces suffix, e.g., 'app' in 'app-space'."
  },
  "AKKERIS_APPLICATION": {
    "type": "system",
    "addon": null,
    "read_only": true,
    "required": true,
    "description": "The full name of the application including hte space suffix. e.g., 'app-space'"
  },
  "AKKERIS_SPACE": {
    "type": "system",
    "addon": null,
    "read_only": true,
    "required": true,
    "description": "The name of the space the app is running in."
  },
  "AKKERIS_GIT_SHA1": {
    "type": "system",
    "addon": null,
    "read_only": true,
    "required": true,
    "description": "Available only during build time, this is the SHA of the git commit that triggered the build."
  },
  "AKKERIS_GIT_BRANCH": {
    "type": "system",
    "addon": null,
    "read_only": true,
    "required": true,
    "description": "Available only during build time, this is the branch of the git commit that triggered the build."
  },
  "AKKERIS_GIT_REPO": {
    "type": "system",
    "addon": null,
    "read_only": true,
    "required": true,
    "description": "Available only during build time, this is the repo of the git commit that triggered the build, usually represented as a URI."
  },
  "DATABASE_URL": {
    "type": "addon",
    "addon": {
      "id": "01bb60d2-f2bb-64c0-4c8b-ead731a690bd",
      "name": "akkeris-postgresql-scissors-2924"
    },
    "read_only": true,
    "required": true,
    "description": ""
  },
  "MY_SECRET_KEY": {
    "type": "user",
    "addon": null,
    "read_only": false,
    "required": true,
    "description": "This is my secret key used for session information."
  }
}
```

### Add Notes to a Config Variable

There are three types of config var types; `system` that are set by Akkeris itself; `user` that are set by an end user; and `addon` set by addons and services provisioned. `system` config vars and their notes are not modifiable as indicated by the `read_only` field. Only the `description` and `required` fields are modifiable.

`PATCH /apps/{appname}/config-vars/notes`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X PATCH \
  https://apps.akkeris.io/apps/app-space/config-vars/notes \
  -d '{"MY_SECRET_KEY":{"description":"This is my new note"}}'
```

**200 "OK" Response**

```json
{
  "PORT": {
    "type": "system",
    "addon": null,
    "read_only": true,
    "required": true,
    "description": "This is the TCP/IP port the app must respond to http requests on."
  },
  "AKKERIS_DEPLOYMENT": {
    "type": "system",
    "addon": null,
    "read_only": true,
    "required": true,
    "description": "The name of the application excluding the spaces suffix, e.g., 'app' in 'app-space'."
  },
  "AKKERIS_APPLICATION": {
    "type": "system",
    "addon": null,
    "read_only": true,
    "required": true,
    "description": "The full name of the application including hte space suffix. e.g., 'app-space'"
  },
  "AKKERIS_SPACE": {
    "type": "system",
    "addon": null,
    "read_only": true,
    "required": true,
    "description": "The name of the space the app is running in."
  },
  "AKKERIS_GIT_SHA1": {
    "type": "system",
    "addon": null,
    "read_only": true,
    "required": true,
    "description": "Available only during build time, this is the SHA of the git commit that triggered the build."
  },
  "AKKERIS_GIT_BRANCH": {
    "type": "system",
    "addon": null,
    "read_only": true,
    "required": true,
    "description": "Available only during build time, this is the branch of the git commit that triggered the build."
  },
  "AKKERIS_GIT_REPO": {
    "type": "system",
    "addon": null,
    "read_only": true,
    "required": true,
    "description": "Available only during build time, this is the repo of the git commit that triggered the build, usually represented as a URI."
  },
  "DATABASE_URL": {
    "type": "addon",
    "addon": {
      "id": "01bb60d2-f2bb-64c0-4c8b-ead731a690bd",
      "name": "akkeris-postgresql-scissors-2924"
    },
    "read_only": true,
    "required": true,
    "description": ""
  },
  "MY_SECRET_KEY": {
    "type": "user",
    "addon": null,
    "read_only": false,
    "required": true,
    "description": "This is my new note"
  }
}
```
