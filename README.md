# Alamo Application Controller and API #


[![Codacy Badge](https://api.codacy.com/project/badge/Grade/7f8275a08a9b44b39a2e2cf34e9c5daa)](https://www.codacy.com?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=octanner/alamo-app-controller&amp;utm_campaign=Badge_Grade)
[![Codacy Badge](https://api.codacy.com/project/badge/Coverage/7f8275a08a9b44b39a2e2cf34e9c5daa)](https://www.codacy.com?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=octanner/alamo-app-controller&amp;utm_campaign=Badge_Coverage)


## Setting Up ##

Requires a jenkins build server with a service account, in addition the jenkins instance must have a user named `akkeris-build-bot` capable of writing to the DOCKER_REGISTRY_HOST and DOCKER_REPO where gold master images will be changed.

### Storage 
* **DATABASE_URL** - The database url to store build, release information.  This has no default.  Must be a postgres 9.5+ instance. See create.sql in sql folder for creating the tables and schema.

### Security
* AUTH_KEY - A shared secret simple authentication, this should be used in all API calls in the Authorization header.
* ENCRYPT_KEY - A private key used to encrypt secretive information in postgres.  This has no default.
* BLACKLIST_ENV - A comma delimited list of socs keywords causing config vars to be redacted, defaults to 'PASS,KEY,SECRET,PRIVATE,TOKEN'
* APPKIT_API_URL - Public URI (https://somehost/) for this api, generally appkit api url that handles user account/authorization (defaults to http://localhost:5000)

### Build Information
* JENKINS_URL - The URL for jenkins build server, e.g., https://my.jenkins.com, note that if JENKINS requires auth add a username (or as jenkins calls it, a user id) and api token to the URI, e.g., https://myusername@apitoken@my.jenkins.com. This has no default.
* BUILD_SHUTTLE_URL - The build shuttle system which caches results and intermediates between jenkins and alamo app controller (see https://github.com/akkeris/buildshuttle).  This has no default.


### Deployment Information
* ALAMO_APP_CONTROLLER_URL - The API url for this host, defaults to http://localhost:5000
* [STACKNAME]_STACK_API - The URI for the stack api by the name of STACKNAME, for example if a stack exists called FOO the uri for the stack api must be set at FOO_STACK_API
* [REGIONNAME]_REGION_API - The URI for the regional api by the name of REGIONNAME, for example if a region exists called us-seattle the uri for the stack api must be set at US_SEATTLE_REGION_API
* DOCKER_REGISTRY_HOST - The host for storing image sources. E.g., docker.hostname.com, This has no default.
* DOCKER_REPO - The repo in DOCKER_REGISTRY_HOST to store gold master build images (changing this also requires changing jenkins_build_template.xml and existing build templates in jenkins). This has no default.


### Logging & Metric Information
* PROMETHEUS_METRICS_URL - The url to connect to for metric information stored in prometheus. This has no default.
* LOG_SHUTTLE_URL - The log shuttle url for log drains (https://github.com/akkeris/logshuttle). This has no default.
* LOG_SESSION_URL - The log session url for log sessions (https://github.com/akkeris/logshuttle). This has no default.
* INFLUXDB_METRICS_URL - The URL to the influxdb that holds running metrics for service, count and other http information. This has no default.
* ANOMALY_METRICS_DRAIN - The syslog drain end point for the opentsdb custom metrics collector. This has no default.
* PAPERTRAIL_DRAIN - The syslog standard drain end point for papertrail.  This has no default.

### Addon Envs
* TWILIO_AUTH_KEY - The master sid:token for the twilio account.

## Installing ##

```npm install```

## Running ##

Prior to running, ensure all of the prior environment variables are properly setup in the ENV.

```npm start```

## Testing ##

Tests need the addition env ALAMO_BASE_DOMAIN, or the base domain for which apps will turn up on by default (e.g., .apps.company.io)

Prior to running tests, ensure all of the prior environment variables are properly setup in the ENV.  In addition you'll need to set the env variable ``CODACY_PROJECT_TOKEN`` (that can be generated from codacy's web site on the alamo app controller project).  Youll also need to run `create.sql` AND `create_testing.sql` in the sql folder on the database to create the test records. Once you're ready run:

```npm test```

OR, run a test manually:

```./node_modules/.bin/_mocha test/[test_to_run.js]```

# Using Alamo and its API #

## Authentication ##

The alamo app controller uses a simple key based authorization via http in the "Authorization" header.  For example if your AUTH_KEY is `fugazi` then you would pass in `Authorization: fugazi` with all your http requests to authenticate it.  In addition a `X-Username` is required which contains the username or email address of the user taking the action. Note that this api is not intended to be exposed directly to people but other systems, developers interface through appkit-api project which handles permissions and passes requests through.

