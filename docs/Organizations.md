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

