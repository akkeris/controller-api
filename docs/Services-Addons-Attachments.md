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
    "description":"PostgreSQL 10",
    "image_url":"https://www.example.com/image.png",
    "available_regions": ["us-seattle"],
    "supports_multiple_installations": true,
    "supports_sharing": true,
    "supports_upgrading":true,
    "plans":[],
    "updated_at": "2016-08-09T12:00:00Z"
  },
  {
    "cli_plugin_name": "redis",
    "created_at": "2016-08-09T12:00:00Z",
    "human_name": "Alamo Redis",
    "id": "b292c4f4-cadb-6525-adac-c61074069c65",
    "name": "alamo-redis",
    "state": "ga",
    "description":"A redis cache",
    "available_regions": ["us-seattle"],
    "supports_multiple_installations": true,
    "supports_sharing": true,
    "supports_upgrading":false,
    "plans":[],
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
  "description":"PostgreSQL 10",
  "image_url":"https://www.example.com/image.png",
  "image_url":null,
  "available_regions": ["us-seattle"],
  "supports_multiple_installations": true,
  "supports_sharing": true,
  "supports_upgrading":true,
  "plans":[],
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
    "attributes": {
      "Custom Metadata":"true",
      "other_data":"12345"
    },
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
      "unit": "month",
      "contract":false,
    },
    "space_default": false,
    "state": "public",
    "updated_at": "2016-08-09T12:00:00Z"
  },
  {
    "attributes": {
      "Custom Metadata":"true",
      "other_data":"12345"
    },
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
      "unit": "month",
      "contract":false,
    },
    "space_default": false,
    "state": "public",
    "updated_at": "2016-08-09T12:00:00Z"
  },
  {
    "attributes": {
      "Custom Metadata":"true",
      "other_data":"12345"
    },
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
      "unit": "month",
      "contract":false,
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
  "attributes": {
    "Custom Metadata":"true",
    "other_data":"12345"
  },
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
    "unit": "month",
    "contract":false,
  },
  "space_default": false,
  "state": "shutdown",
  "updated_at": "2016-08-09T12:00:00Z",
  "provisioned_by": [
    {
      "id": "59be5dd4-1dfa-47a9-bdae-00ed93718005",
      "name": "app-space"
    }
  ]
}
```

### Create Addon ##

`POST /apps/{appname}/addons`

Creates a new addon from a service plan.

|   Name       |       Type      | Description                                                                                   | Example                                                 |
|:------------:|:---------------:|-----------------------------------------------------------------------------------------------|---------------------------------------------------------|
|    plan      | required string | The id (uuid) of the service plan to create, this can be obtained from /addon-services/{addon_name_or_id}/plans                               | akkeris                                                |
| attachment.name | optional string | The name for the attachment, and thus the prefix used for config vars if the addon is secondary.  Must be alphanumeric.                          |  mycoolname                                                |

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X POST \
  https://apps.akkeris.io/apps/app-space/addons \
  -d '{"plan":"a91d7641-a61e-fb09-654e-2def7c9f162d", "attachment":{"name":"mycoolname"}}'
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
  "name": "mycoolname",
  "plan": {
    "id": "a91d7641-a61e-fb09-654e-2def7c9f162d",
    "name": "alamo-postgresql:small"
  },
  "provider_id": "alamo",
  "updated_at": "2016-08-11T20:16:45.820Z",
  "web_url": "https://akkeris.example.com/apps/62dc0fd3-2cba-4925-8fca-d1129d296d2c-api"
}
```

### List All Addons ##

Lists all the addons for all applications. This is the same response as other addons end points but does not contain the attachments, the addon state nor the configuration environment variables for the addon.

`GET /addons`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/addons
```

**200 "OK" Response**

```json
[
  {
    "actions": [],
    "addon_service": {
      "id": "1124611d-2971-2533-3338-a816a4a95ff1",
      "name": "akkeris-s3"
    },
    "app": {
      "id": "4505b947-346d-400b-a986-a1faeb2c321f",
      "name": "events-api-us"
    },
    "billed_price": {
      "cents": 5000,
      "unit": "month",
      "contract": false
    },
    "created_at": "2018-11-15T17:14:09.270Z",
    "id": "42222315-1155-4772-bc87-fdda79df06ee",
    "name": "amazon-s3-shock-2047",
    "plan": {
      "id": "1328e0b0-429a-1fa8-32a0-aaad9e121cbb",
      "name": "akkeris-s3:basic"
    },
    "primary": true,
    "provider_id": "akkeris",
    "updated_at": "2018-11-15T17:14:09.270Z",
    "web_url": "/apps/events-api-us",
  }
]
```

### Get Addons ##

Gets more information on an addon

`GET /addons/{addon_id_or_name}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/addons/amazon-s3-shock-2047
```

**200 "OK" Response**

```json
{
  "actions": [],
  "addon_service": {
    "id": "1124611d-2971-2533-3338-a816a4a95ff1",
    "name": "akkeris-s3"
  },
  "app": {
    "id": "4505b947-346d-400b-a986-a1faeb2c321f",
    "name": "events-api-us"
  },
  "billed_price": {
    "cents": 5000,
    "unit": "month",
    "contract": false
  },
  "config_vars": {
    "S3_BUCKET": "8839-1f32bb231",
    "S3_LOCATION": "1f42bb239.s3.amazonaws.com",
    "S3_REGION": "us-west-2",
    "S3_SECRET_KEY": "abcdefg+hjklmnopqrstuvwxyz",
    "S3_ACCESS_KEY": "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  },
  "created_at": "2018-11-15T17:14:09.270Z",
  "id": "42222315-1155-4772-bc87-fdda79df06ee",
  "name": "amazon-s3-shock-2047",
  "plan": {
    "id": "1328e0b0-429a-1fa8-32a0-aaad9e121cbb",
    "name": "akkeris-s3:basic"
  },
  "primary": true,
  "provider_id": "akkeris",
  "state": "provisioned",
  "state_description": "",
  "updated_at": "2018-11-15T17:14:09.270Z",
  "web_url": "/apps/events-api-us",
  "attached_to": [
    {
      "id": "4505b947-346d-400b-a986-a1faeb2c321f",
      "name": "events-api-us",
      "owner": true
    }
  ]
}
```

### Get Addon's Config ##

Gets the configuration variables injected into applications or resources that use this addon.

`GET /addons/{addon_id_or_name}/config`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X GET \
  https://apps.akkeris.io/addons/amazon-s3-shock-2047/config
```

**200 "OK" Response**

```json
{
  "S3_BUCKET": "8811-1f32bb231",
  "S3_LOCATION": "1f42bb239.s3.amazonaws.com",
  "S3_REGION": "us-west-2",
  "S3_SECRET_KEY": "abcdefg+hjklmnopqrstuvwxyz",
  "S3_ACCESS_KEY": "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
}
``` 

### List Addons By App ##

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

### Get Addon By App ##

Get information on an addon constrained by the application.

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
    "id": "62dc0fd3-2cba-4925-8fca-d1129d296d2c-api",
    "name": "app-space"
  },
  "config_vars": [],
  "created_at": "2016-08-11T20:16:45.820Z",
  "id": "5feef9bb-2bed-4b62-bdf5-e31691fab88c",
  "name": "a91d7641-a61e-fb09-654e-2def7c9f162d-api:alamo-postgresql-1470946605820",
  "plan": {
    "id": "a91d7641-a61e-fb09-654e-2def7c9f162d",
    "name": "alamo-postgresql:small"
  },
  "primary": true,
  "provider_id": "alamo",
  "updated_at": "2016-08-11T20:16:45.820Z",
  "web_url": "https://akkeris.example.com/apps/62dc0fd3-2cba-4925-8fca-d1129d296d2c-api",
  "attached_to": [
    {
      "id": "62dc0fd3-2cba-4925-8fca-d1129d296d2c-api",
      "name": "app-space",
      "owner": true
    }
  ]
}
```


### Update an Addon ##

Addons can be updated to promote (and subsequently demote) an addon of the same type.  When adding multiple addon's such as a database with the environment variable `DATABASE_URL` the second or non-primary addon has the environment variable prefixed with the addon name. For example if the addon's name is `alamo-postgres-abcdef-1235` and its a secondary (non-primary) database the environment variable would be `ABCDEF_12345_DATABASE_URL`.  The primary database always has non-prefixed environment variables, such as `DATABASE_URL`.  Updating an addon to be primary will cause an existing primary addon of the same type to become a secondary (non-primary) addon.  Updating the attachment.name property will change the name of the addon, and thus change the prefix used for `DATABASE_URL` as well.

`PATCH /apps/{appname}/addons/{addon_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X PATCH \
  https://apps.akkeris.io/apps/app-space/addons/5feef9bb-2bed-4b62-bdf5-e31691fab88c -d '{"primary":false, "attachment":{"name":"mynewcoolname"}}'
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
    "id": "62dc0fd3-2cba-4925-8fca-d1129d296d2c-api",
    "name": "app-space"
  },
  "config_vars": [],
  "created_at": "2016-08-11T20:16:45.820Z",
  "id": "5feef9bb-2bed-4b62-bdf5-e31691fab88c",
  "name": "mynewcoolname",
  "plan": {
    "id": "a91d7641-a61e-fb09-654e-2def7c9f162d",
    "name": "alamo-postgresql:small"
  },
  "primary": false,
  "provider_id": "alamo",
  "updated_at": "2016-08-11T20:16:45.820Z",
  "web_url": "https://akkeris.example.com/apps/62dc0fd3-2cba-4925-8fca-d1129d296d2c-api",
  "attached_to": [
    {
      "id": "62dc0fd3-2cba-4925-8fca-d1129d296d2c-api",
      "name": "app-space",
      "owner": true
    }
  ]
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
  "name":"a1c1643-b51e-bb00-334e-2def7c9f162d:alamo-postgresql-18837",
  "primary":true
}
```


### Update Addons-Attachments ##

Promote an addon attachment to the primary addon for its service type.

`PATCH /apps/{appname}/addon-attachments/{addon_id}`

**CURL Example**

```bash
curl \
  -H 'Authorization: ...' \
  -X PATCH \
  https://apps.akkeris.io/apps/app-space/addon-attachments/5feef9bb-2bed-4b62-bdf5-e31691fab88c -d '{"primary":false, "name":"mynewname"}'
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
  "name":"myoldname",
  "primary":false
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
  -d '{"addon":"5feef9bb-2bed-4b62-bdf5-e31691fab88c", "app":"app-space", "name":"some-name"}'
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
  "name":"some-name"
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
