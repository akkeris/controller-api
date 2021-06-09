# Akkeris Controller API #

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/fcc7c79fe0b349a7ac6f9b731b3e00ca)](https://www.codacy.com/gh/akkeris/controller-api?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=akkeris/controller-api&amp;utm_campaign=Badge_Grade)
[![Codacy Badge](https://api.codacy.com/project/badge/Coverage/fcc7c79fe0b349a7ac6f9b731b3e00ca)](https://www.codacy.com/gh/akkeris/controller-api?utm_source=github.com&utm_medium=referral&utm_content=akkeris/controller-api&utm_campaign=Badge_Coverage)
[![CircleCI](https://circleci.com/gh/akkeris/controller-api.svg?style=svg)](https://circleci.com/gh/akkeris/controller-api)

## Setting Up ##

### Storage 
* `DATABASE_URL` - The database url to store build, release information.  This has no default.  Must be a postgres 9.5+ instance. See create.sql in sql folder for creating the tables and schema.
* `ES_URL` - The elastic search url (https://somehost, without any port information).

### Security
* `AUTH_KEY` - This is a shared secret simple authentication, this should be used in all API calls in the Authorization header.
* `ENCRYPT_KEY` - A private key used to encrypt secretive information in postgres.  This has no default.  Must be 24 bytes long.
* `AKKERIS_UI_URL` - Public URI (https://somehost/) for the appkit ui used by developers.
* `JWT_RS256_PRIVATE_KEY` - The private key used to issue temporary JWT tokens for webhooks. Must be RS256 PEM encoded. See `test/support/generate-jwt-public-private.sh` to create one.
* `JWT_RS256_PUBLIC_CERT` - The public key used to validate temporary JWT tokens for webhooks. Must be RS256 PEM encoded. See `test/support/generate-jwt-public-private.sh` to create one.
* `SUPPORT_EMAIL` - The email address to use for notifications, and where users can each support staff.

### Logging
* `LOG_SESSION_URL` - The URL (http://somehost) for the log session, this should (generally) always be set to `http://logsession.akkeris-system.svc.cluster.local`
* `LOG_SHUTTLE_URL` - The URL (http://somehost) for the log shuttle, this should (generally) always be set to `http://logshuttle.akkeris-system.svc.cluster.local`

### Build Information
* `DEFAULT_GITHUB_USERNAME` - When watching github source control, use this default username if none is provided.  (should be set with `DEFAULT_GITHUB_TOKEN`)
* `DEFAULT_GITHUB_TOKEN` - When watching github source control, use this default token if none is provided. (should be set with `DEFAULT_GITHUB_USERNAME`)
* `BUILD_SHUTTLE_URL` - The URL (http://somehost) for the buildshuttle, unless external availble this should always be set to `http://buildshuttle.akkeris-system.svc.cluster.local`

### Deployment Information
* `[STACKNAME]_STACK_API` - The URI for the stack api by the name of STACKNAME, for example if a stack exists called FOO the uri for the stack api must be set at FOO_STACK_API
* `[REGIONNAME]_REGION_API` - The URI for the regional api by the name of REGIONNAME, for example if a region exists called us-seattle the uri for the stack api must be set at US_SEATTLE_REGION_API
* `DOCKER_REGISTRY_HOST` - The host for storing image sources. E.g., docker.hostname.com, This has no default.
* `DOCKER_REGISTRY_ORG` - The organization in `DOCKER_REGISTRY_HOST` to store gold master build images. This has no default.
* `DOCKER_REGISTRY_AUTH` - The JSON object that is either `{"username":"..", "password":"..", "email":"...", "serveraddress":"..."}` note that email/serveraddress are optional, or if a token auth it could be `{"identitytoken":"..."}`. See [docker authorization](https://docs.docker.com/engine/api/v1.39/#section/Authentication) for more information.

### Optional Environment Variables
* `ANOMALY_METRICS_DRAIN` - The syslog drain end point for the opentsdb custom metrics collector. This has no default.
* `PAPERTRAIL_DRAIN` - The syslog standard drain end point for papertrail.  This has no default.
* `BLACKLIST_ENV` - A comma delimited list of socs keywords causing config vars to be redacted, defaults to `PASS,KEY,SECRET,PRIVATE,TOKEN,SALT,AUTH,HASH`
* `DYNO_DEFAULT_SIZE` - The default dyno size to use. The set default is `gp1` if no other is specified.
* `RESERVED_SPACES` - A list of reserved spaces to add to the reserved list.  The default reserved spaces are `kube-system, brokers, k2-poc, kube-public, akkeris-system, istio-system, cert-manager`. Note, setting this will only add to the list, not override it.
* `TTL_TEMP_TOKEN` - How long (in ms) should temporary JWT tokens last for? Defaults to 3600000 (1 hour)
* `CSP_REPORT_URI` - The URI to report CSP violations for apps that have CSP features on their app enabled. Should be the publically available URI for the CSP reporter.
* `CSP_IGNORE_DOMAINS` - A comma delimited list of domains that should not be included in CSP allowed list. The list of allowed is pulled from domains available for sites.

### Integration Variables
To disable custom formatting for outgoing webhooks set these to true.

* `WEBHOOK_DISABLE_MICROSOFT_TEAMS` - If set to `true` disable auto-formatting outgoing webhooks for Microsoft Team Channel Notifications.
* `WEBHOOK_DISABLE_CIRCLECI` - If set to `true` disable auto-formatting outgoing webhooks for CircleCI Jobs.
* `WEBHOOK_DISABLE_SLACK` - If set to `true` disable auto-formatting outgoing webhooks for Slack Channel Notifications.
* `WEBHOOK_DISABLE_OPSGENIE` - If set to `true` disable auto-formatting outgoing webhooks for OpsGenie Alerts.
* `WEBHOOK_DISABLE_ROLLBAR` - If set to `true` disable auto-formatting outgoing release webhooks for notifying Rollbar of deployments.

## Installing ##

```
npm install
```

## Running ##

Prior to running, ensure all of the prior environment variables are properly setup in the ENV.

```
npm start
```

## Migrating to 192 bit keys ##

If you're using an old deprecated encrypt key values in `ENCRYPT_KEY` you can migrate by first setting `ENCRYPT_KEY_192_BITS` to the new 24 byte long string, then set `RUN_TOKEN_MIGRATION` to true, finally once migrated you can remove `RUN_TOKEN_MIGRATION` and set `ENCRYPT_KEY` to the 24 byte long string from your environment (and remove `ENCRYPT_KEY_192_BITS`).

## Testing and Developing Locally ##

1. Setup the database

```
brew install postgresql
createdb controller-api
export DATABASE_URL=postgres://localhost:5432/controller-api
cat sql/create.sql | psql $DATABASE_URL
cat sql/create_testing.sql | psql $DATABASE_URL
```

2. Set the environment variables above, also save `DATABASE_URL` as part of your config/environment. There are some additional options that should be set when developing locally or testing.  Some of these are optional. The tests that run are integration tests that require real services setup. See the setting up section above for additional required environment variables.

* `TEST_REGION` - the region to test, e.g., us-seattle, eu-ireland
* `NGROK_TOKEN` - When testing a public URI is needed to test callbacks from other integrated systems, get a token at www.ngrok.com and place it in this envirionment variable.
* `ONE_PROCESS_MODE` - When developing locally this must be set, it imports what normally would be in the worker into the main process. Just set it to true
* `TEST_MODE` - Similar to ONE_PROCESS_MODE this should be set when running the automated tests, while ONE_PROCESS_MODE should be set when developing locally.  Just set it to true
* `ALAMO_BASE_DOMAIN` - This should be in the format of .ds1.example.com (.cluster.domain.com), This is the base domain to use for newly created apps.
* `SITE_BASE_DOMAIN` - This is the site base domain such as `.example.com`.
* `CODACY_PROJECT_TOKEN` - While optional this is useful when running test coverage to report the results to www.codacy.com. 
* `MARU_STACK_API` - Set to the alamo api, MARU is the name of our test cluster
* `US_SEATTLE_REGION_API` - Set to the alamo api, US_SEATTLE is the name of our test region.
* `AKKERIS_APP_CONTROLLER_URL` - The API url for this host, you'll want to set this to http://localhost:5000
* `BUILD_SHUTTLE_URL` - The build shuttle is a small footprint API that manages specific build system such as jenkins. (see https://github.com/akkeris/buildshuttle).  This has no default.
* `AKKERIS_API_URL` - Public URI (https://somehost/) for the appkit api in front of this api, generally appkit api url that handles user account/authorization (defaults to http://localhost:5000)
* `JWT_RS256_PRIVATE_KEY` - This can be loaded from `test/support/sample-jwt-private-key.pem` - DO NOT USE THIS FOR RUNNING CONTROLLERS!
* `JWT_RS256_PUBLIC_CERT` - This can be loaded from `test/support/sample-jwt-public-cert.pem` - DO NOT USE THIS FOR RUNNING CONTROLLERS!

To read in the JWT test files you can run:

```bash
$ export JWT_RS256_PUBLIC_CERT=`cat ./test/support/sample-jwt-public-certificate.pem`
$ export JWT_RS256_PRIVATE_KEY=`cat ./test/support/sample-jwt-private-key.pem`
```

3. Run the entire test suite:

```
npm run tests
```

OR, run an individual test manually:

```
npm test test/test_to_run.js
```

## Contributing ##

### How Authentication Works ###

The alamo app controller uses a simple key based authorization via http in the "Authorization" header.  For example if your AUTH_KEY is `fugazi` then you would pass in `Authorization: fugazi` with all your http requests to authenticate it.  In addition a `X-Username` is required which contains the username or email address of the user taking the action. Note that this api is not intended to be exposed directly to people but other systems, developers interface through appkit-api project which handles permissions and passes requests through.

### Listening to Events ###

To help decouple actions events my be emited by a central bus within the `common.js` file.  The exported module will have a globally unique (across one dyno instance) "lifecycle" object that implements an Event Emitter pattern in node.  The following events are emitted:

* `preview-created`
* `build-status-change`
* `release-started`
* `release-successful`
* `release-failed`
* `released`
* `git-event`

Note these are not the same concept as web hooks nor should they be confused with that.  In addition there is a lifecycle.js file which is not the same concept as this (just unfortunately named the same).

