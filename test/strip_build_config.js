/* eslint-disable no-unused-expressions */
process.env.DEFAULT_PORT = '5000';
process.env.PORT = 5000;
process.env.ALAMO_API_URL = 'http://nope.com';
process.env.AUTH_KEY = 'hello';
// const alamo_headers = {
//   Authorization: process.env.AUTH_KEY, 'User-Agent': 'Hello', 'x-username': 'test', 'x-elevated-access': 'true',
// };

describe('builds: ensure logs are properly tripped', () => {
  const { expect } = require('chai');

  it('covers removing test app for builds', (done) => {
    const builds = require('../lib/builds.js');
    const result = builds.strip_build_results(`
Started by user ss-dd-aapp
[Pipeline] node
Running on perm_dockerbuild_a (i-0265b83805255b3dc) in /jenkins/workspace/api-62dc0fd3-2cba-4925-8fca-d1129d296d2c
[Pipeline] {
[Pipeline] stage (Retrieving source code)
Using the ‘stage’ step without a block argument is deprecated
Entering stage Retrieving source code
Proceeding
[Pipeline] writeFile
[Pipeline] writeFile
[Pipeline] sh
[api-62dc0fd3-2cba-4925-8fca-d1129d296d2c] Running shell script
+ rm -rf build
[Pipeline] sh
[api-62dc0fd3-2cba-4925-8fca-d1129d296d2c] Running shell script
+ grep -q -x '^data:.*' code_url
+ wget -i code_url -O sources
--2017-06-12 21:17:47--  https://aa.aa.aa.io/771fff97-67bb-4496-9c3e-4dc9bcfdc68d
Resolving aa.aa.aa.io (aa.aa.aa.io)... 10.70.1.11
Connecting to bs.aa.ll.io (aa.aa.aa.io)|10.70.1.11|:443... connected.
HTTP request sent, awaiting response... 200 OK
Length: 234730 (229K) [application/octet-stream]
Saving to: ‘sources’

     0K .......... .......... .......... .......... .......... 21% 1.48M 0s
    50K .......... .......... .......... .......... .......... 43% 5.56M 0s
   100K .......... .......... .......... .......... .......... 65% 6.17M 0s
   150K .......... .......... .......... .......... .......... 87% 28.3M 0s
   200K .......... .......... .........                       100% 3.53M=0.06s

2017-06-12 21:17:48 (3.77 MB/s) - ‘sources’ saved [234730/234730]

FINISHED --2017-06-12 21:17:48--
Total wall clock time: 0.2s
Downloaded: 1 files, 229K in 0.06s (3.77 MB/s)
[Pipeline] sh
[api-62dc0fd3-2cba-4925-8fca-d1129d296d2c] Running shell script
+ tar zxf sources -C build
gzip: stdin has more than one entry--rest ignored
tar: Child returned status 2
tar: Error is not recoverable: exiting now
+ unzip sources -d build
Archive:  sources
34540cea68f3432c2716f4d1a0e8bba794dd86cb
   creating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/.gitignore  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/Dockerfile  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/Jenkinsfile  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/README.md  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/TODO.md  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/heroku_compatibility.html  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/index.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/jenkins_build_template.xml  
   creating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/addon-attachments.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/addon-services.js  
   creating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/addons/
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/addons/addons.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/addons/alamo-addons.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/addons/alamo-amazon-s3.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/addons/alamo-memcached.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/addons/alamo-postgres.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/addons/alamo-rabbitmq.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/addons/alamo-redis.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/addons/anomaly.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/addons/logging-endpoint.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/addons/papertrail.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/addons/twilio.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/addons/vault.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/alamo.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/apps.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/builds.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/common.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/config-var.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/config.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/dynos.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/favorites.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/formations.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/github.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/hooks.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/http_helper.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/invoices.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/jenkins.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/lifecycle.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/log-drains.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/logs.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/metrics.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/octhc.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/organizations.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/pipelines.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/plugins.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/query.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/queue.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/releases.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/router.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/routes.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/simple_key_auth.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/sites.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib/spaces.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/package.json  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/regional-alamo-api-swagger.json  
   creating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/create.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/create_testing.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/delete_app.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/delete_auto_build.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/delete_favorite.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/delete_formation.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/delete_hook.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/delete_pipeline.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/delete_pipeline_coupling.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/delete_pipeline_couplings_by_pipeline.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/delete_plugin.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/delete_route.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/delete_service.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/delete_service_attachment.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/delete_service_attachments_by_app.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/delete_services_by_app.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/delete_site.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_app.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_authorization.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_auto_build.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_build.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_favorite.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_formation.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_formation_changes.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_hook.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_hook_result.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_org.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_pipeline.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_pipeline_coupling.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_pipeline_promotion.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_pipeline_promotion_target.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_plugin.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_release.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_route.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_service.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_service_attachment.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_site.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/insert_space.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/invoice.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/invoice_by_org.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/invoice_by_space.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/invoices.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/invoices_by_org.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/invoices_by_space.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_all_service_attachments.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_app.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_apps.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_auto_build.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_auto_releases.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_build.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_building_builds.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_builds.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_favorite.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_favorites.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_formation.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_formations.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_hook.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_hooks.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_latest_image.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_latest_release_by_app.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_next_release.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_org.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_orgs.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_pipeline.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_pipeline_coupling.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_pipeline_coupling_by_app.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_pipeline_couplings.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_pipeline_couplings_by_pipeline.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_pipeline_couplings_by_stage.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_pipeline_promotion.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_pipeline_promotions.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_pipelines.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_plugin.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_plugins.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_release.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_releases.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_route.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_route_by_details.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_routes.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_routes_by_app.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_routes_by_detail.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_routes_by_site.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_service.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_service_attachment.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_service_attachment_owner.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_service_attachments.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_services.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_site.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_sites.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_space.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_spaces.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/select_validation_token.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/update_app.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/update_build_status.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/update_favorite.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/update_formation.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/update_formation_changes.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/update_hook.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/update_plugin.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/update_route.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/update_site.sql  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql/update_space.sql  
   creating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/addon-attachments.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/addon-services.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/addons.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/apps.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/builds.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/common.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/config-var.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/favorites.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/formations.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/github.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/health.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/hooks.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/invoices.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/lifecycle.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/logs.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/metrics.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/organizations.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/pipelines.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/plugins.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/queue.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/releases.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/sites_routes.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/spaces.js  
   creating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/
   creating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/lifecycle-app/
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/lifecycle-app/Dockerfile  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/lifecycle-app/index.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/lifecycle-app/package.json  
   creating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/no-hidden-file/
   creating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/no-hidden-file/somedir/
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/no-hidden-file/somedir/Dockerfile  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/no-hidden-file/somedir/index.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/no-hidden-file/somedir/package.json  
   creating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/sample-app/
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/sample-app/Dockerfile  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/sample-app/index.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/sample-app/package.json  
   creating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/worker-app/
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/worker-app/Dockerfile  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/worker-app/index.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/worker-app/package.json  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/support/worker-app/worker.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test/vault.js  
  inflating: build/oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/tools.sh  
[Pipeline] sh
[api-62dc0fd3-2cba-4925-8fca-d1129d296d2c] Running shell script
+ cd build
++ ls -d oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/
++ wc -l
+ '[' 1 = 1 ']'
++ ls .
++ wc -l
+ '[' 1 = 1 ']'
+ mv oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/Dockerfile oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/heroku_compatibility.html oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/index.js oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/jenkins_build_template.xml oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/Jenkinsfile oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/lib oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/package.json oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/README.md oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/regional-alamo-api-swagger.json oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/sql oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/test oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/TODO.md oo-aaa-pp-ccc-34540cea68f3432c2716f4d1a0e8bba794dd86cb/tools.sh .
[Pipeline] stage (Building slug)
Using the ‘stage’ step without a block argument is deprecated
Entering stage Building slug
Proceeding
[Pipeline] dir
Running in /jenkins/workspace/api-62dc0fd3-2cba-4925-8fca-d1129d296d2c/build
[Pipeline] {
[Pipeline] sh
[build] Running shell script
+ sed -i -e '/FROM/r ../config_vars' Dockerfile
[Pipeline] sh
[build] Running shell script
+ echo -n 'Generating build for api for space default build uuid 771fff97-67bb-4496-9c3e-4dc9bcfdc68d'
Generating build for api for space default build uuid 771fff97-67bb-4496-9c3e-4dc9bcfdc68d[build] Running shell script
[Pipeline] sh
+ echo -n 'Getting source code for https://github.com/abcd/abcd-app-controller/master SHA abcd... '
Getting source code for https://github.com/abcd/abcd-app-controller/master SHA abcd... [Pipeline] withEnv
[Pipeline] {
[Pipeline] withDockerRegistry
[Pipeline] {
[Pipeline] sh
[build] Running shell script
+ docker build -t abcd/api-62dc0fd3-2cba-4925-8fca-d1129d296d2c:0.330 .
Sending build context to Docker daemon 557.1 kB
Sending build context to Docker daemon 981.5 kB

Step 1 : FROM v.a.io/b/oct-node:6.9.1
 ---> 2374b0c78338
Step 2 : ARG DOCKER_REPO="x"
 ---> Running in 44211c732b38
 ---> 6399c4ab939c
Removing intermediate container 44211c732b38
Step 3 : ARG LOG_SESSION_URL="https://fugazi@ls.a.o.io"
 ---> Running in 572424cdfa04
 ---> 1f6c6897001d
Removing intermediate container 572424cdfa04
Step 4/4 : ARG ENCRYPT_KEY="fugazi"
 ---> Running in 0dcc2343bd40
 ---> 2cf68906f5b5
Removing intermediate container 0dcc2343bd40
Step 5 : ARG PROMETHEUS_METRICS_URL="http://fugazi.c.s.a.x:9090"
 ---> Running in 6e72f9bebf7c
 ---> f4f19a8dd844
Removing intermediate container 6e72f9bebf7c
Step 6 : ARG LOG_SHUTTLE_URL="https://fugazi@ss.aa.hh.io"
 ---> Running in 4a65ff35406d
 ---> 3dd4d406e9bb
Removing intermediate container 4a65ff35406d
Step 7 : ARG APPKIT_API_URL="https://a.o.io/fugazi"
 ---> Running in 433c5b12bdcc
 ---> fe88128fbe4f
Removing intermediate container 433c5b12bdcc
Step 8 : ARG PAPERTRAIL_DRAIN="syslog+tls://logs.abcd.com:4444/fugazi"
 ---> Running in 9f69030fca84
 ---> e7aef1623906
Removing intermediate container 9f69030fca84
Step 9 : ARG DOCKER_REGISTRY_HOST="q.d.x/fugazi"
 ---> Running in 050050dd9b15
 ---> e97484520141
Removing intermediate container 050050dd9b15
Step 10 : ARG AUTH_KEY="obert"
 ---> Running in df74d3374c73
 ---> 2a25a56e1d6b
Removing intermediate container df74d3374c73
Step 11 : ARG HTTP_METRICS_URL="http://asdf:4242"
 ---> Running in 81240512c571
 ---> 5af9b61a891f
Removing intermediate container 81240512c571
Step 12 : ARG ANOMALY_METRICS_DRAIN="syslog://asdf:9000"
 ---> Running in 88f4ff60c27f
 ---> db112d90d768
Removing intermediate container 88f4ff60c27f
Step 13 : ARG ALAMO_API_URL="https://a.d.x/"
 ---> Running in 9165ebaf64c8
 ---> e9641069e739
Removing intermediate container 9165ebaf64c8
Step 14 : ARG BUILD_SHUTTLE_URL="https://b.d.a.qq"
 ---> Running in fe96da5529da
 ---> b635ceb625cc
Removing intermediate container fe96da5529da
Step 15 : ARG ALAMO_APP_CONTROLLER_URL="https://c.a.d.io"
 ---> Running in dd2df0fdfdef
 ---> 67735a036037
Removing intermediate container dd2df0fdfdef
Step 16 : ARG NODE_ENV="production"
 ---> Running in 1f72f86d3326
 ---> 17305797360e
Removing intermediate container 1f72f86d3326
Step 17 : ARG ALAMO_INTERNAL_URL_TEMPLATE="https://{s}-{c}.a.d.io/"
 ---> Running in 7caabcd5fb38
 ---> 8f226ca75e08
Removing intermediate container 7caabcd5fb38
Step 18 : ARG JENKINS_URL="http://ss-dd-aa:fugazi@d.a.b.io"
 ---> Running in bb7ff7ea5e2f
 ---> b44c40737f59
Removing intermediate container bb7ff7ea5e2f
Step 19 : ARG ALAMO_URL_TEMPLATE="https://{nn}-{ss}.a.fugazi.io/"
 ---> Running in 9366f9aab969
 ---> dab2231730ee
Removing intermediate container 9366f9aab969
Step 20 : ARG TWILIO_AUTH_KEY="fugazi:fugazi"
 ---> Running in fb3fb8e59479
 ---> 910a1a7e0331
Removing intermediate container fb3fb8e59479
Step 21 : ARG COMMIT_SHA=fugazi
 ---> Running in 5f08363f5eb9
 ---> a6cd6d4edf88
Removing intermediate container 5f08363f5eb9
Step 22 : ARG COMMIT_BRANCH=fugazi
 ---> Running in 314fa11b398c
 ---> 1780fa5105c5
Removing intermediate container 314fa11b398c
Step 23 : ARG COMMIT_REPO=https://x.fugazi/x/y
 ---> Running in ff84dc5e0565
 ---> 05b57112c8f7
Removing intermediate container ff84dc5e0565
Step 24 : RUN mkdir -p /usr/src/app
 ---> Running in 69bf5cfe6ccf
 ---> 519a1c3a0f68
Removing intermediate container 69bf5cfe6ccf
Step 25 : WORKDIR /usr/src/app
 ---> Running in 7898c12b0efb
 ---> 0ff26aa838d6
Removing intermediate container 7898c12b0efb
Step 26 : COPY . /usr/src/app
 ---> 3182b1f7d8ac
Removing intermediate container 5a4dfb3b0711
Step 27/27 : RUN npm install
 ---> Running in 838c5d4741c6
[91mnpm[0m[91m info it worked if it ends with ok
npm[0m[91m info using npm@3.10.8
npm info using node@v6.9.1
[0m[91mnpm info attempt[0m[91m registry request try #1 at 9:19:04 PM
[0m[91mnpm http request[0m[91m GET https://art.oo.net/api/npm/npmjs-repo/elasticsearch
[0m[91mnpm info[0m[91m attempt[0m[91m registry request try #1 at 9:19:04 PM
[0m[91mnpm http [0m[91mrequest GET https://art.oo.net/api/npm/npmjs-repo/pg
[0m[91mnpm info attempt registry request try #1 at 9:19:04 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/request
[0m[91mnpm info[0m[91m attempt registry request try #1 at 9:19:04 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/uuid
[0m[91mnpm http 200[0m[91m https://art.oo.net/api/npm/npmjs-repo/uuid
[0m[91mnpm [0m[91minfo retry fetch attempt 1 at 9:19:05 PM
[0m[91mnpm info attempt registry request try #1 at 9:19:05 PM
[0m[91mnpm http[0m[91m fetch GET https://art.oo.net/api/npm/npmjs-repo/uuid/-/uuid-2.0.3.tgz
[0m[91mnpm[0m[91m http[0m[91m fetch 200 https://art.oo.net/api/npm/npmjs-repo/uuid/-/uuid-2.0.3.tgz
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/pg
[0m[91mnpm http [0m[91m200 https://art.oo.net/api/npm/npmjs-repo/request
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:05 PM
npm info attempt registry request try #1 at 9:19:05 PM
npm[0m[91m [0m[91mhttp[0m[91m [0m[91mfetch GET https://art.oo.net/api/npm/npmjs-repo/pg/-/pg-6.2.4.tgz
[0m[91mnpm [0m[91minfo retry[0m[91m fetch attempt 1 at 9:19:05 PM
[0m[91mnpm info attempt registry request try #1 at 9:19:05 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/request/-/request-2.81.0.tgz
[0m[91mnpm [0m[91mhttp fetch 200 https://art.oo.net/api/npm/npmjs-repo/pg/-/pg-6.2.4.tgz
[0m[91mnpm http fetch[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/request/-/request-2.81.0.tgz
[0m[91mnpm[0m[91m http[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/elasticsearch
[0m[91mnpm[0m[91m [0m[91minfo retry fetch attempt 1 at 9:19:05 PM
npm info attempt registry request try #1 at 9:19:05 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/elasticsearch/-/elasticsearch-11.0.1.tgz
[0m[91mnpm http [0m[91mfetch 200 https://art.oo.net/api/npm/npmjs-repo/elasticsearch/-/elasticsearch-11.0.1.tgz
[0m[91mnpm[0m[91m info attempt registry request try #1 at 9:19:05 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/chalk
[0m[91mnpm info attempt registry request try #1 at 9:19:05 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/forever-agent
[0m[91mnpm info attempt registry request try #1 at 9:19:05 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/lodash
[0m[91mnpm info attempt registry request try #1 at 9:19:05 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/lodash-compat
[0m[91mnpm[0m[91m info attempt[0m[91m registry request try #1 at 9:19:05 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/promise
[0m[91mnpm http[0m[91m [0m[91m200 https://art.oo.net/api/npm/npmjs-repo/forever-agent
[0m[91mnpm info[0m[91m retry[0m[91m fetch attempt 1 at 9:19:05 PM
npm info attempt registry request try #1 at 9:19:05 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/forever-agent/-/forever-agent-0.6.1.tgz
[0m[91mnpm http[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/lodash-compat
[0m[91mnpm http[0m[91m fetch 200 https://art.oo.net/api/npm/npmjs-repo/forever-agent/-/forever-agent-0.6.1.tgz
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:05 PM
npm info attempt registry request try #1 at 9:19:05 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/lodash-compat/-/lodash-compat-3.10.2.tgz
[0m[91mnpm http fetch[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/lodash-compat/-/lodash-compat-3.10.2.tgz
[0m[91mnpm[0m[91m http 200 https://art.oo.net/api/npm/npmjs-repo/chalk
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:05 PM
npm info attempt registry request try #1 at 9:19:05 PM
[0m[91mnpm http fetch[0m[91m GET https://art.oo.net/api/npm/npmjs-repo/chalk/-/chalk-1.1.3.tgz
[0m[91mnpm [0m[91mhttp 200 https://art.oo.net/api/npm/npmjs-repo/lodash
[0m[91mnpm[0m[91m http[0m[91m fetch 200 https://art.oo.net/api/npm/npmjs-repo/chalk/-/chalk-1.1.3.tgz
[0m[91mnpm [0m[91minfo retry fetch attempt 1 at 9:19:05 PM
[0m[91mnpm info attempt registry request try #1 at 9:19:05 PM
[0m[91mnpm http fetch GET https://art.oo.net/api/npm/npmjs-repo/lodash/-/lodash-3.10.1.tgz
[0m[91mnpm [0m[91mhttp 200 https://art.oo.net/api/npm/npmjs-repo/promise
[0m[91mnpm [0m[91mhttp fetch 200 https://art.oo.net/api/npm/npmjs-repo/lodash/-/lodash-3.10.1.tgz
[0m[91mnpm [0m[91minfo[0m[91m retry fetch attempt 1 at 9:19:06 PM
npm info attempt registry request try #1 at 9:19:06 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/promise/-/promise-7.1.1.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/promise/-/promise-7.1.1.tgz
[0m[91mnpm info attempt registry request try #1 at 9:19:06 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/ansi-styles
[0m[91mnpm info attempt registry request try #1 at 9:19:06 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/escape-string-regexp
[0m[91mnpm info attempt registry request try #1 at 9:19:06 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/has-ansi
[0m[91mnpm[0m[91m info attempt registry request try #1 at 9:19:06 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/strip-ansi
[0m[91mnpm info[0m[91m attempt registry request try #1 at 9:19:06 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/supports-color
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/escape-string-regexp
[0m[91mnpm info retry[0m[91m fetch attempt 1 at 9:19:06 PM
npm info attempt registry request try #1 at 9:19:06 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/escape-string-regexp/-/escape-string-regexp-1.0.5.tgz
[0m[91mnpm http 200[0m[91m https://art.oo.net/api/npm/npmjs-repo/strip-ansi
[0m[91mnpm info retry[0m[91m fetch attempt 1 at 9:19:06 PM
npm info attempt registry request try #1 at 9:19:06 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/strip-ansi/-/strip-ansi-3.0.1.tgz
[0m[91mnpm http[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/supports-color
[0m[91mnpm http[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/has-ansi
[0m[91mnpm http [0m[91m200 https://art.oo.net/api/npm/npmjs-repo/ansi-styles
[0m[91mnpm [0m[91minfo retry fetch attempt 1 at 9:19:06 PM
npm info attempt registry request try #1 at 9:19:06 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/supports-color/-/supports-color-2.0.0.tgz
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:06 PM
npm info attempt registry request try #1 at 9:19:06 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/has-ansi/-/has-ansi-2.0.0.tgz
[0m[91mnpm http [0m[91mfetch 200 https://art.oo.net/api/npm/npmjs-repo/escape-string-regexp/-/escape-string-regexp-1.0.5.tgz
[0m[91mnpm [0m[91minfo retry fetch attempt 1 at 9:19:06 PM
npm info attempt registry request try #1 at 9:19:06 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/ansi-styles/-/ansi-styles-2.2.1.tgz
[0m[91mnpm http[0m[91m fetch 200 https://art.oo.net/api/npm/npmjs-repo/strip-ansi/-/strip-ansi-3.0.1.tgz
[0m[91mnpm http [0m[91mfetch 200 https://art.oo.net/api/npm/npmjs-repo/has-ansi/-/has-ansi-2.0.0.tgz
[0m[91mnpm [0m[91mhttp fetch 200 https://art.oo.net/api/npm/npmjs-repo/supports-color/-/supports-color-2.0.0.tgz
[0m[91mnpm http [0m[91mfetch 200 https://art.oo.net/api/npm/npmjs-repo/ansi-styles/-/ansi-styles-2.2.1.tgz
[0m[91mnpm info attempt[0m[91m registry request try #1 at 9:19:06 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/ansi-regex
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/ansi-regex
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:06 PM
npm info attempt registry request try #1 at 9:19:06 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/ansi-regex/-/ansi-regex-2.1.1.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/ansi-regex/-/ansi-regex-2.1.1.tgz
[0m[91mnpm info [0m[91mattempt registry request try #1 at 9:19:06 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/asap
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/asap
[0m[91mnpm info retry fetch attempt 1 at 9:19:06 PM
[0m[91mnpm info attempt registry request try #1 at 9:19:06 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/asap/-/asap-2.0.5.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/asap/-/asap-2.0.5.tgz
[0m[91mnpm info attempt[0m[91m registry request try #1 at 9:19:06 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/buffer-writer
[0m[91mnpm info attempt registry request try #1 at 9:19:06 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/packet-reader
npm info attempt registry request try #1 at 9:19:06 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/pg-connection-string
[0m[91mnpm info attempt registry request try #1 at 9:19:06 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/pg-pool
npm info attempt registry request try #1 at 9:19:06 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/pg-types
[0m[91mnpm info attempt registry request try #1 at 9:19:06 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/pgpass
[0m[91mnpm info [0m[91mattempt registry request try #1 at 9:19:06 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/semver
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/packet-reader
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:06 PM
[0m[91mnpm info attempt registry request try #1 at 9:19:06 PM
[0m[91mnpm http fetch GET https://art.oo.net/api/npm/npmjs-repo/packet-reader/-/packet-reader-0.3.1.tgz
[0m[91mnpm http 200[0m[91m https://art.oo.net/api/npm/npmjs-repo/buffer-writer
[0m[91mnpm info retry[0m[91m fetch attempt 1 at 9:19:06 PM
npm info attempt registry request try #1 at 9:19:06 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/buffer-writer/-/buffer-writer-1.0.1.tgz
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/pg-connection-string
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:06 PM
npm info attempt registry request try #1 at 9:19:06 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/pg-connection-string/-/pg-connection-string-0.1.3.tgz
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/pg-types
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:06 PM
npm info [0m[91mattempt[0m[91m registry request try #1 at 9:19:06 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/pg-types/-/pg-types-1.12.0.tgz
[0m[91mnpm http fetch[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/packet-reader/-/packet-reader-0.3.1.tgz
[0m[91mnpm http [0m[91mfetch 200 https://art.oo.net/api/npm/npmjs-repo/buffer-writer/-/buffer-writer-1.0.1.tgz
[0m[91mnpm[0m[91m http fetch 200 https://art.oo.net/api/npm/npmjs-repo/pg-connection-string/-/pg-connection-string-0.1.3.tgz
[0m[91mnpm [0m[91mhttp[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/pg-pool
[0m[91mnpm info retry[0m[91m fetch attempt 1 at 9:19:06 PM
npm info attempt registry request try #1 at 9:19:06 PM
[0m[91mnpm http fetch GET https://art.oo.net/api/npm/npmjs-repo/pg-pool/-/pg-pool-1.7.1.tgz
[0m[91mnpm http[0m[91m fetch 200 https://art.oo.net/api/npm/npmjs-repo/pg-types/-/pg-types-1.12.0.tgz
[0m[91mnpm http [0m[91m200 https://art.oo.net/api/npm/npmjs-repo/pgpass
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:07 PM
npm info attempt registry request try #1 at 9:19:07 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/pgpass/-/pgpass-1.0.2.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/pg-pool/-/pg-pool-1.7.1.tgz
[0m[91mnpm http [0m[91mfetch 200 https://art.oo.net/api/npm/npmjs-repo/pgpass/-/pgpass-1.0.2.tgz
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/semver
[0m[91mnpm info retry[0m[91m fetch attempt 1 at 9:19:07 PM
npm info attempt registry request try #1 at 9:19:07 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/semver/-/semver-4.3.2.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/semver/-/semver-4.3.2.tgz
[0m[91mnpm info [0m[91mattempt registry request try #1 at 9:19:07 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/generic-pool
[0m[91mnpm info attempt registry request try #1 at 9:19:07 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/object-assign
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/object-assign
[0m[91mnpm [0m[91minfo retry fetch attempt 1 at 9:19:07 PM
npm info attempt registry request try #1 at 9:19:07 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/object-assign/-/object-assign-4.1.0.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/object-assign/-/object-assign-4.1.0.tgz
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/generic-pool
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:07 PM
npm info attempt registry request try #1 at 9:19:07 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/generic-pool/-/generic-pool-2.4.3.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/generic-pool/-/generic-pool-2.4.3.tgz
[0m[91mnpm info [0m[91mattempt registry request try #1 at 9:19:07 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/ap
[0m[91mnpm info[0m[91m attempt registry request try #1 at 9:19:07 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/postgres-array
[0m[91mnpm info attempt registry request try #1 at 9:19:07 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/postgres-bytea
npm info attempt registry request try #1 at 9:19:07 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/postgres-date
[0m[91mnpm info [0m[91mattempt registry request try #1 at 9:19:07 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/postgres-interval
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/postgres-array
[0m[91mnpm info retry[0m[91m fetch attempt 1 at 9:19:07 PM
npm info attempt registry request try #1 at 9:19:07 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/postgres-array/-/postgres-array-1.0.2.tgz
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/postgres-bytea
[0m[91mnpm http[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/ap
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:07 PM
npm info attempt registry request try #1 at 9:19:07 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/postgres-bytea/-/postgres-bytea-1.0.0.tgz
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:07 PM
npm info attempt registry request try #1 at 9:19:07 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/ap/-/ap-0.2.0.tgz
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/postgres-date
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:07 PM
npm info attempt registry request try #1 at 9:19:07 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/postgres-date/-/postgres-date-1.0.3.tgz
[0m[91mnpm http [0m[91m200 https://art.oo.net/api/npm/npmjs-repo/postgres-interval
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/postgres-array/-/postgres-array-1.0.2.tgz
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:07 PM
npm info attempt registry request try #1 at 9:19:07 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/postgres-interval/-/postgres-interval-1.1.0.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/postgres-bytea/-/postgres-bytea-1.0.0.tgz
[0m[91mnpm http fetch[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/ap/-/ap-0.2.0.tgz
[0m[91mnpm http fetch[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/postgres-date/-/postgres-date-1.0.3.tgz
[0m[91mnpm http[0m[91m fetch 200 https://art.oo.net/api/npm/npmjs-repo/postgres-interval/-/postgres-interval-1.1.0.tgz
[0m[91mnpm info [0m[91mattempt registry request try #1 at 9:19:07 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/xtend
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/xtend
[0m[91mnpm info retry[0m[91m fetch attempt 1 at 9:19:07 PM
npm info attempt registry request try #1 at 9:19:07 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/xtend/-/xtend-4.0.1.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/xtend/-/xtend-4.0.1.tgz
[0m[91mnpm info[0m[91m attempt registry request try #1 at 9:19:07 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/split
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/split
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:08 PM
npm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/split/-/split-1.0.0.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/split/-/split-1.0.0.tgz
[0m[91mnpm info [0m[91mattempt registry request try #1 at 9:19:08 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/through
[0m[91mnpm http 200[0m[91m https://art.oo.net/api/npm/npmjs-repo/through
[0m[91mnpm[0m[91m info retry fetch attempt 1 at 9:19:08 PM
[0m[91mnpm info[0m[91m attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/through/-/through-2.3.8.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/through/-/through-2.3.8.tgz
[0m[91mnpm info attempt registry request try #1 at 9:19:08 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/aws-sign2
[0m[91mnpm [0m[91minfo attempt registry request try #1 at 9:19:08 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/aws4
[0m[91mnpm[0m[91m info attempt registry request try #1 at 9:19:08 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/caseless
[0m[91mnpm[0m[91m info attempt registry request try #1 at 9:19:08 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/combined-stream
[0m[91mnpm[0m[91m info attempt registry request try #1 at 9:19:08 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/extend
[0m[91mnpm[0m[91m info attempt registry request try #1 at 9:19:08 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/form-data
[0m[91mnpm[0m[91m info attempt registry request try #1 at 9:19:08 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/har-validator
[0m[91mnpm info attempt registry request try #1 at 9:19:08 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/hawk
[0m[91mnpm info attempt registry request try #1 at 9:19:08 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/http-signature
[0m[91mnpm info attempt registry request try #1 at 9:19:08 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/is-typedarray
[0m[91mnpm info attempt registry request try #1 at 9:19:08 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/isstream
[0m[91mnpm info attempt registry request try #1 at 9:19:08 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/json-stringify-safe
npm info attempt registry request try #1 at 9:19:08 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/mime-types
[0m[91mnpm info attempt registry request try #1 at 9:19:08 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/oauth-sign
[0m[91mnpm info attempt registry request try #1 at 9:19:08 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/performance-now
[0m[91mnpm info attempt registry request try #1 at 9:19:08 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/qs
npm info attempt registry request try #1 at 9:19:08 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/safe-buffer
[0m[91mnpm info attempt registry request try #1 at 9:19:08 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/stringstream
[0m[91mnpm info attempt registry request try #1 at 9:19:08 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/tough-cookie
[0m[91mnpm info attempt registry request try #1 at 9:19:08 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/tunnel-agent
[0m[91mnpm info retry fetch attempt 1 at 9:19:08 PM
[0m[91mnpm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/uuid/-/uuid-3.0.1.tgz
[0m[91mnpm [0m[91mhttp 200 https://art.oo.net/api/npm/npmjs-repo/caseless
[0m[91mnpm http 200[0m[91m https://art.oo.net/api/npm/npmjs-repo/combined-stream
[0m[91mnpm info retry fetch attempt 1 at 9:19:08 PM
[0m[91mnpm info attempt registry request try #1 at 9:19:08 PM
[0m[91mnpm http fetch GET https://art.oo.net/api/npm/npmjs-repo/caseless/-/caseless-0.12.0.tgz
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:08 PM
npm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/combined-stream/-/combined-stream-1.0.5.tgz
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/aws-sign2
[0m[91mnpm http [0m[91m200 https://art.oo.net/api/npm/npmjs-repo/extend
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:08 PM
npm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/aws-sign2/-/aws-sign2-0.6.0.tgz
[0m[91mnpm http[0m[91m fetch 200 https://art.oo.net/api/npm/npmjs-repo/uuid/-/uuid-3.0.1.tgz
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:08 PM
npm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/extend/-/extend-3.0.1.tgz
[0m[91mnpm [0m[91mhttp 200 https://art.oo.net/api/npm/npmjs-repo/form-data
[0m[91mnpm info retry[0m[91m fetch attempt 1 at 9:19:08 PM
[0m[91mnpm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/form-data/-/form-data-2.1.4.tgz
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/aws4
[0m[91mnpm [0m[91minfo retry fetch attempt 1 at 9:19:08 PM
npm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/aws4/-/aws4-1.6.0.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/combined-stream/-/combined-stream-1.0.5.tgz
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/is-typedarray
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:08 PM
npm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/is-typedarray/-/is-typedarray-1.0.0.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/form-data/-/form-data-2.1.4.tgz
[0m[91mnpm http 200[0m[91m https://art.oo.net/api/npm/npmjs-repo/oauth-sign
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:08 PM
npm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/oauth-sign/-/oauth-sign-0.8.2.tgz
[0m[91mnpm http [0m[91mfetch 200 https://art.oo.net/api/npm/npmjs-repo/caseless/-/caseless-0.12.0.tgz
[0m[91mnpm http [0m[91mfetch 200 https://art.oo.net/api/npm/npmjs-repo/aws4/-/aws4-1.6.0.tgz
[0m[91mnpm http [0m[91mfetch 200 https://art.oo.net/api/npm/npmjs-repo/extend/-/extend-3.0.1.tgz
[0m[91mnpm http[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/json-stringify-safe
[0m[91mnpm [0m[91mhttp fetch 200 https://art.oo.net/api/npm/npmjs-repo/is-typedarray/-/is-typedarray-1.0.0.tgz
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:08 PM
npm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/json-stringify-safe/-/json-stringify-safe-5.0.1.tgz
[0m[91mnpm http 200[0m[91m https://art.oo.net/api/npm/npmjs-repo/tunnel-agent
[0m[91mnpm http [0m[91m200 https://art.oo.net/api/npm/npmjs-repo/har-validator
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:08 PM
npm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/tunnel-agent/-/tunnel-agent-0.6.0.tgz
[0m[91mnpm http fetch[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/aws-sign2/-/aws-sign2-0.6.0.tgz
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/performance-now
[0m[91mnpm [0m[91mhttp fetch 200 https://art.oo.net/api/npm/npmjs-repo/oauth-sign/-/oauth-sign-0.8.2.tgz
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:08 PM
npm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/har-validator/-/har-validator-4.2.1.tgz
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:08 PM
npm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/performance-now/-/performance-now-0.2.0.tgz
[0m[91mnpm http[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/safe-buffer
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/json-stringify-safe/-/json-stringify-safe-5.0.1.tgz
[0m[91mnpm[0m[91m http 200 https://art.oo.net/api/npm/npmjs-repo/isstream
[0m[91mnpm http 200[0m[91m https://art.oo.net/api/npm/npmjs-repo/stringstream
[0m[91mnpm http [0m[91mfetch 200 https://art.oo.net/api/npm/npmjs-repo/tunnel-agent/-/tunnel-agent-0.6.0.tgz
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:08 PM
npm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/safe-buffer/-/safe-buffer-5.1.0.tgz
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:08 PM
npm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/isstream/-/isstream-0.1.2.tgz
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:08 PM
npm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/stringstream/-/stringstream-0.0.5.tgz
[0m[91mnpm[0m[91m http fetch 200 https://art.oo.net/api/npm/npmjs-repo/har-validator/-/har-validator-4.2.1.tgz
[0m[91mnpm http[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/tough-cookie
[0m[91mnpm http [0m[91m200 https://art.oo.net/api/npm/npmjs-repo/http-signature
[0m[91mnpm http fetch[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/performance-now/-/performance-now-0.2.0.tgz
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:08 PM
npm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/tough-cookie/-/tough-cookie-2.3.2.tgz
[0m[91mnpm http[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/mime-types
[0m[91mnpm info retry[0m[91m fetch attempt 1 at 9:19:08 PM
npm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/http-signature/-/http-signature-1.1.1.tgz
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:08 PM
npm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/mime-types/-/mime-types-2.1.15.tgz
[0m[91mnpm http [0m[91mfetch 200 https://art.oo.net/api/npm/npmjs-repo/safe-buffer/-/safe-buffer-5.1.0.tgz
[0m[91mnpm http fetch[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/stringstream/-/stringstream-0.0.5.tgz
[0m[91mnpm [0m[91mhttp fetch 200 https://art.oo.net/api/npm/npmjs-repo/isstream/-/isstream-0.1.2.tgz
[0m[91mnpm http [0m[91m200 https://art.oo.net/api/npm/npmjs-repo/qs
[0m[91mnpm http[0m[91m fetch 200 https://art.oo.net/api/npm/npmjs-repo/tough-cookie/-/tough-cookie-2.3.2.tgz
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:08 PM
npm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/qs/-/qs-6.4.0.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/http-signature/-/http-signature-1.1.1.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/mime-types/-/mime-types-2.1.15.tgz
[0m[91mnpm http 200[0m[91m https://art.oo.net/api/npm/npmjs-repo/hawk
[0m[91mnpm info retry[0m[91m fetch attempt 1 at 9:19:08 PM
[0m[91mnpm info attempt registry request try #1 at 9:19:08 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/hawk/-/hawk-3.1.3.tgz
[0m[91mnpm http [0m[91mfetch 200 https://art.oo.net/api/npm/npmjs-repo/qs/-/qs-6.4.0.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/hawk/-/hawk-3.1.3.tgz
[0m[91mnpm info attempt registry request try #1 at 9:19:08 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/delayed-stream
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/delayed-stream
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:09 PM
npm info attempt registry request try #1 at 9:19:09 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/delayed-stream/-/delayed-stream-1.0.0.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/delayed-stream/-/delayed-stream-1.0.0.tgz
[0m[91mnpm[0m[91m info attempt registry request try #1 at 9:19:09 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/asynckit
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/asynckit
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:09 PM
npm info attempt registry request try #1 at 9:19:09 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/asynckit/-/asynckit-0.4.0.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/asynckit/-/asynckit-0.4.0.tgz
[0m[91mnpm info [0m[91mattempt registry request try #1 at 9:19:09 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/mime-db
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/mime-db
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:09 PM
npm info attempt registry request try #1 at 9:19:09 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/mime-db/-/mime-db-1.27.0.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/mime-db/-/mime-db-1.27.0.tgz
[0m[91mnpm info[0m[91m attempt registry request try #1 at 9:19:09 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/ajv
[0m[91mnpm info attempt registry request try #1 at 9:19:09 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/har-schema
[0m[91mnpm http [0m[91m200 https://art.oo.net/api/npm/npmjs-repo/har-schema
[0m[91mnpm info[0m[91m retry[0m[91m fetch attempt 1 at 9:19:09 PM
npm info attempt registry request try #1 at 9:19:09 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/har-schema/-/har-schema-1.0.5.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/har-schema/-/har-schema-1.0.5.tgz
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/ajv
[0m[91mnpm info retry fetch attempt 1 at 9:19:10 PM
[0m[91mnpm info attempt registry request try #1 at 9:19:10 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/ajv/-/ajv-4.11.8.tgz
[0m[91mnpm http fetch[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/ajv/-/ajv-4.11.8.tgz
[0m[91mnpm info attempt[0m[91m registry request try #1 at 9:19:10 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/co
[0m[91mnpm info attempt registry request try #1 at 9:19:10 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/json-stable-stringify
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/json-stable-stringify
[0m[91mnpm info retry[0m[91m fetch attempt 1 at 9:19:10 PM
npm info attempt registry request try #1 at 9:19:10 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/json-stable-stringify/-/json-stable-stringify-1.0.1.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/json-stable-stringify/-/json-stable-stringify-1.0.1.tgz
[0m[91mnpm[0m[91m http 200[0m[91m https://art.oo.net/api/npm/npmjs-repo/co
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:10 PM
npm info attempt registry request try #1 at 9:19:10 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/co/-/co-4.6.0.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/co/-/co-4.6.0.tgz
[0m[91mnpm info [0m[91mattempt registry request try #1 at 9:19:10 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/jsonify
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/jsonify
[0m[91mnpm[0m[91m info retry fetch attempt 1 at 9:19:10 PM
npm info attempt registry request try #1 at 9:19:10 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/jsonify/-/jsonify-0.0.0.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/jsonify/-/jsonify-0.0.0.tgz
[0m[91mnpm info attempt[0m[91m registry request try #1 at 9:19:11 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/hoek
[0m[91mnpm [0m[91minfo attempt registry request try #1 at 9:19:11 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/boom
[0m[91mnpm info attempt registry request try #1 at 9:19:11 PM
npm[0m[91m http request GET https://art.oo.net/api/npm/npmjs-repo/cryptiles
[0m[91mnpm info [0m[91mattempt registry request try #1 at 9:19:11 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/sntp
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/sntp
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/cryptiles
[0m[91mnpm info retry fetch attempt 1 at 9:19:11 PM
npm info attempt registry request try #1 at 9:19:11 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/sntp/-/sntp-1.0.9.tgz
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:11 PM
npm info attempt registry request try #1 at 9:19:11 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/cryptiles/-/cryptiles-2.0.5.tgz
[0m[91mnpm http [0m[91mfetch 200 https://art.oo.net/api/npm/npmjs-repo/sntp/-/sntp-1.0.9.tgz
[0m[91mnpm http [0m[91mfetch 200 https://art.oo.net/api/npm/npmjs-repo/cryptiles/-/cryptiles-2.0.5.tgz
[0m[91mnpm http 200[0m[91m https://art.oo.net/api/npm/npmjs-repo/boom
[0m[91mnpm[0m[91m info retry[0m[91m fetch attempt 1 at 9:19:11 PM
npm info attempt registry request try #1 at 9:19:11 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/boom/-/boom-2.10.1.tgz
[0m[91mnpm [0m[91mhttp fetch 200 https://art.oo.net/api/npm/npmjs-repo/boom/-/boom-2.10.1.tgz
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/hoek
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:11 PM
npm info attempt registry request try #1 at 9:19:11 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/hoek/-/hoek-2.16.3.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/hoek/-/hoek-2.16.3.tgz
[0m[91mnpm info attempt registry request try #1 at 9:19:11 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/assert-plus
[0m[91mnpm [0m[91minfo attempt registry request try #1 at 9:19:11 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/jsprim
[0m[91mnpm info[0m[91m attempt registry request try #1 at 9:19:11 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/sshpk
[0m[91mnpm http[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/assert-plus
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:11 PM
npm info attempt registry request try #1 at 9:19:11 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/assert-plus/-/assert-plus-0.2.0.tgz
[0m[91mnpm http [0m[91m200 https://art.oo.net/api/npm/npmjs-repo/jsprim
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:11 PM
[0m[91mnpm [0m[91minfo attempt registry request try #1 at 9:19:11 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/jsprim/-/jsprim-1.4.0.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/assert-plus/-/assert-plus-0.2.0.tgz
[0m[91mnpm http fetch[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/jsprim/-/jsprim-1.4.0.tgz
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/sshpk
[0m[91mnpm info retry[0m[91m fetch attempt 1 at 9:19:11 PM
npm info attempt registry request try #1 at 9:19:11 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/sshpk/-/sshpk-1.13.1.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/sshpk/-/sshpk-1.13.1.tgz
[0m[91mnpm info attempt registry request try #1 at 9:19:11 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/extsprintf
[0m[91mnpm[0m[91m info attempt registry request try #1 at 9:19:11 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/json-schema
[0m[91mnpm info attempt registry request try #1 at 9:19:11 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/verror
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:11 PM
npm info attempt registry request try #1 at 9:19:11 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/assert-plus/-/assert-plus-1.0.0.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/assert-plus/-/assert-plus-1.0.0.tgz
[0m[91mnpm http[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/json-schema
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:11 PM
npm info attempt registry request try #1 at 9:19:11 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/json-schema/-/json-schema-0.2.3.tgz
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/extsprintf
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:11 PM
[0m[91mnpm [0m[91minfo attempt[0m[91m registry request try #1 at 9:19:11 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/extsprintf/-/extsprintf-1.0.2.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/json-schema/-/json-schema-0.2.3.tgz
[0m[91mnpm http 200[0m[91m https://art.oo.net/api/npm/npmjs-repo/verror
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:11 PM
npm info attempt registry request try #1 at 9:19:11 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/verror/-/verror-1.3.6.tgz
[0m[91mnpm http [0m[91mfetch 200 https://art.oo.net/api/npm/npmjs-repo/extsprintf/-/extsprintf-1.0.2.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/verror/-/verror-1.3.6.tgz
[0m[91mnpm[0m[91m info attempt registry request try #1 at 9:19:12 PM
npm http[0m[91m [0m[91mrequest[0m[91m GET https://art.oo.net/api/npm/npmjs-repo/asn1
[0m[91mnpm info[0m[91m attempt registry request try #1 at 9:19:12 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/dashdash
[0m[91mnpm info attempt registry request try #1 at 9:19:12 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/getpass
[0m[91mnpm info attempt registry request try #1 at 9:19:12 PM
npm http request GET https://art.oo.net/api/npm/npmjs-repo/jsbn
[0m[91mnpm info attempt registry request try #1 at 9:19:12 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/tweetnacl
[0m[91mnpm info attempt registry request try #1 at 9:19:12 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/ecc-jsbn
[0m[91mnpm info attempt registry request try #1 at 9:19:12 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/bcrypt-pbkdf
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/jsbn
[0m[91mnpm [0m[91minfo retry fetch attempt 1 at 9:19:12 PM
npm info attempt registry request try #1 at 9:19:12 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/jsbn/-/jsbn-0.1.1.tgz
[0m[91mnpm http[0m[91m 200 https://art.oo.net/api/npm/npmjs-repo/bcrypt-pbkdf
[0m[91mnpm info retry fetch attempt 1 at 9:19:12 PM
npm info attempt registry request try #1 at 9:19:12 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/bcrypt-pbkdf/-/bcrypt-pbkdf-1.0.1.tgz
[0m[91mnpm http 200[0m[91m https://art.oo.net/api/npm/npmjs-repo/ecc-jsbn
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:12 PM
npm info attempt registry request try #1 at 9:19:12 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/ecc-jsbn/-/ecc-jsbn-0.1.1.tgz
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/getpass
[0m[91mnpm http[0m[91m fetch 200 https://art.oo.net/api/npm/npmjs-repo/jsbn/-/jsbn-0.1.1.tgz
[0m[91mnpm http [0m[91m200 https://art.oo.net/api/npm/npmjs-repo/asn1
[0m[91mnpm http [0m[91mfetch 200 https://art.oo.net/api/npm/npmjs-repo/bcrypt-pbkdf/-/bcrypt-pbkdf-1.0.1.tgz
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:12 PM
npm info attempt registry request try #1 at 9:19:12 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/getpass/-/getpass-0.1.7.tgz
[0m[91mnpm http [0m[91mfetch 200 https://art.oo.net/api/npm/npmjs-repo/ecc-jsbn/-/ecc-jsbn-0.1.1.tgz
[0m[91mnpm info retry[0m[91m fetch attempt 1 at 9:19:12 PM
npm info attempt registry request try #1 at 9:19:12 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/asn1/-/asn1-0.2.3.tgz
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/tweetnacl
[0m[91mnpm http [0m[91mfetch 200 https://art.oo.net/api/npm/npmjs-repo/getpass/-/getpass-0.1.7.tgz
[0m[91mnpm [0m[91mhttp fetch 200 https://art.oo.net/api/npm/npmjs-repo/asn1/-/asn1-0.2.3.tgz
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:12 PM
npm info attempt registry request try #1 at 9:19:12 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/tweetnacl/-/tweetnacl-0.14.5.tgz
[0m[91mnpm http 200[0m[91m https://art.oo.net/api/npm/npmjs-repo/dashdash
[0m[91mnpm info [0m[91mretry fetch attempt 1 at 9:19:12 PM
npm info attempt registry request try #1 at 9:19:12 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/dashdash/-/dashdash-1.14.1.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/tweetnacl/-/tweetnacl-0.14.5.tgz
[0m[91mnpm[0m[91m http fetch 200 https://art.oo.net/api/npm/npmjs-repo/dashdash/-/dashdash-1.14.1.tgz
[0m[91mnpm info attempt registry request try #1 at 9:19:12 PM
[0m[91mnpm http request GET https://art.oo.net/api/npm/npmjs-repo/punycode
[0m[91mnpm http 200 https://art.oo.net/api/npm/npmjs-repo/punycode
[0m[91mnpm info[0m[91m retry fetch attempt 1 at 9:19:12 PM
npm info attempt registry request try #1 at 9:19:12 PM
npm http fetch GET https://art.oo.net/api/npm/npmjs-repo/punycode/-/punycode-1.4.1.tgz
[0m[91mnpm http fetch 200 https://art.oo.net/api/npm/npmjs-repo/punycode/-/punycode-1.4.1.tgz
[0m[91mnpm info lifecycle alamo-app-controller@1.0.2~preinstall: alamo-app-controller@1.0.2
[0m[91mnpm info lifecycle ansi-regex@2.1.1~preinstall: ansi-regex@2.1.1
[0m[91mnpm info lifecycle ansi-styles@2.2.1~preinstall: ansi-styles@2.2.1
npm info lifecycle ap@0.2.0~preinstall: ap@0.2.0
[0m[91mnpm info lifecycle asap@2.0.5~preinstall: asap@2.0.5
[0m[91mnpm info lifecycle asn1@0.2.3~preinstall: asn1@0.2.3
npm info lifecycle assert-plus@0.2.0~preinstall: assert-plus@0.2.0
npm info lifecycle asynckit@0.4.0~preinstall: asynckit@0.4.0
[0m[91mnpm info lifecycle aws-sign2@0.6.0~preinstall: aws-sign2@0.6.0
npm info lifecycle aws4@1.6.0~preinstall: aws4@1.6.0
npm info lifecycle buffer-writer@1.0.1~preinstall: buffer-writer@1.0.1
npm info lifecycle caseless@0.12.0~preinstall: caseless@0.12.0
[0m[91mnpm info lifecycle co@4.6.0~preinstall: co@4.6.0
npm info lifecycle assert-plus@1.0.0~preinstall: assert-plus@1.0.0
npm info lifecycle dashdash@1.14.1~preinstall: dashdash@1.14.1
[0m[91mnpm info lifecycle delayed-stream@1.0.0~preinstall: delayed-stream@1.0.0
npm info lifecycle combined-stream@1.0.5~preinstall: combined-stream@1.0.5
npm info lifecycle escape-string-regexp@1.0.5~preinstall: escape-string-regexp@1.0.5
[0m[91mnpm info lifecycle extend@3.0.1~preinstall: extend@3.0.1
npm info lifecycle extsprintf@1.0.2~preinstall: extsprintf@1.0.2
npm info lifecycle forever-agent@0.6.1~preinstall: forever-agent@0.6.1
npm info lifecycle generic-pool@2.4.3~preinstall: generic-pool@2.4.3
npm info lifecycle assert-plus@1.0.0~preinstall: assert-plus@1.0.0
[0m[91mnpm info lifecycle getpass@0.1.7~preinstall: getpass@0.1.7
npm info lifecycle har-schema@1.0.5~preinstall: har-schema@1.0.5
npm info lifecycle has-ansi@2.0.0~preinstall: has-ansi@2.0.0
npm info lifecycle hoek@2.16.3~preinstall: hoek@2.16.3
npm info lifecycle boom@2.10.1~preinstall: boom@2.10.1
[0m[91mnpm info lifecycle cryptiles@2.0.5~preinstall: cryptiles@2.0.5
npm info lifecycle is-typedarray@1.0.0~preinstall: is-typedarray@1.0.0
npm info lifecycle isstream@0.1.2~preinstall: isstream@0.1.2
npm info lifecycle jsbn@0.1.1~preinstall: jsbn@0.1.1
[0m[91mnpm info lifecycle ecc-jsbn@0.1.1~preinstall: ecc-jsbn@0.1.1
npm info lifecycle json-schema@0.2.3~preinstall: json-schema@0.2.3
npm info lifecycle json-stringify-safe@5.0.1~preinstall: json-stringify-safe@5.0.1
npm info lifecycle jsonify@0.0.0~preinstall: jsonify@0.0.0
[0m[91mnpm info lifecycle json-stable-stringify@1.0.1~preinstall: json-stable-stringify@1.0.1
npm info lifecycle ajv@4.11.8~preinstall: ajv@4.11.8
npm info lifecycle har-validator@4.2.1~preinstall: har-validator@4.2.1
npm info lifecycle assert-plus@1.0.0~preinstall: assert-plus@1.0.0
npm info lifecycle lodash@3.10.1~preinstall: lodash@3.10.1
npm info lifecycle lodash-compat@3.10.2~preinstall: lodash-compat@3.10.2
[0m[91mnpm info lifecycle mime-db@1.27.0~preinstall: mime-db@1.27.0
npm info lifecycle mime-types@2.1.15~preinstall: mime-types@2.1.15
npm info lifecycle form-data@2.1.4~preinstall: form-data@2.1.4
npm info lifecycle oauth-sign@0.8.2~preinstall: oauth-sign@0.8.2
[0m[91mnpm info lifecycle object-assign@4.1.0~preinstall: object-assign@4.1.0
npm info lifecycle packet-reader@0.3.1~preinstall: packet-reader@0.3.1
npm info lifecycle performance-now@0.2.0~preinstall: performance-now@0.2.0
npm info lifecycle pg-connection-string@0.1.3~preinstall: pg-connection-string@0.1.3
npm info lifecycle pg-pool@1.7.1~preinstall: pg-pool@1.7.1
npm info lifecycle postgres-array@1.0.2~preinstall: postgres-array@1.0.2
npm info lifecycle postgres-bytea@1.0.0~preinstall: postgres-bytea@1.0.0
npm info lifecycle postgres-date@1.0.3~preinstall: postgres-date@1.0.3
npm info lifecycle promise@7.1.1~preinstall: promise@7.1.1
npm info lifecycle punycode@1.4.1~preinstall: punycode@1.4.1
npm info lifecycle qs@6.4.0~preinstall: qs@6.4.0
npm info lifecycle uuid@3.0.1~preinstall: uuid@3.0.1
npm info lifecycle safe-buffer@5.1.0~preinstall: safe-buffer@5.1.0
npm info lifecycle semver@4.3.2~preinstall: semver@4.3.2
npm info lifecycle sntp@1.0.9~preinstall: sntp@1.0.9
npm info lifecycle hawk@3.1.3~preinstall: hawk@3.1.3
[0m[91mnpm info lifecycle assert-plus@1.0.0~preinstall: assert-plus@1.0.0
npm info lifecycle stringstream@0.0.5~preinstall: stringstream@0.0.5
npm info lifecycle strip-ansi@3.0.1~preinstall: strip-ansi@3.0.1
npm info lifecycle supports-color@2.0.0~preinstall: supports-color@2.0.0
npm info lifecycle chalk@1.1.3~preinstall: chalk@1.1.3
npm info lifecycle through@2.3.8~preinstall: through@2.3.8
npm info lifecycle split@1.0.0~preinstall: split@1.0.0
[0m[91mnpm info lifecycle pgpass@1.0.2~preinstall: pgpass@1.0.2
npm info lifecycle tough-cookie@2.3.2~preinstall: tough-cookie@2.3.2
npm info lifecycle tunnel-agent@0.6.0~preinstall: tunnel-agent@0.6.0
npm info lifecycle tweetnacl@0.14.5~preinstall: tweetnacl@0.14.5
npm info lifecycle bcrypt-pbkdf@1.0.1~preinstall: bcrypt-pbkdf@1.0.1
[0m[91mnpm info lifecycle sshpk@1.13.1~preinstall: sshpk@1.13.1
[0m[91mnpm info lifecycle verror@1.3.6~preinstall: verror@1.3.6
[0m[91mnpm info lifecycle jsprim@1.4.0~preinstall: jsprim@1.4.0
npm info lifecycle http-signature@1.1.1~preinstall: http-signature@1.1.1
npm info lifecycle xtend@4.0.1~preinstall: xtend@4.0.1
npm info lifecycle postgres-interval@1.1.0~preinstall: postgres-interval@1.1.0
[0m[91mnpm info lifecycle pg-types@1.12.0~preinstall: pg-types@1.12.0
npm info lifecycle elasticsearch@11.0.1~preinstall: elasticsearch@11.0.1
npm info lifecycle pg@6.2.4~preinstall: pg@6.2.4
npm info lifecycle request@2.81.0~preinstall: request@2.81.0
npm info lifecycle uuid@2.0.3~preinstall: uuid@2.0.3
[0m[91mnpm info linkStuff ansi-regex@2.1.1
[0m[91mnpm info[0m[91m linkStuff ansi-styles@2.2.1
[0m[91mnpm info[0m[91m linkStuff ap@0.2.0
[0m[91mnpm info[0m[91m linkStuff asap@2.0.5
[0m[91mnpm info [0m[91mlinkStuff asn1@0.2.3
[0m[91mnpm info [0m[91mlinkStuff assert-plus@0.2.0
[0m[91mnpm info [0m[91mlinkStuff asynckit@0.4.0
[0m[91mnpm info[0m[91m linkStuff aws-sign2@0.6.0
[0m[91mnpm info linkStuff[0m[91m aws4@1.6.0
[0m[91mnpm info [0m[91mlinkStuff buffer-writer@1.0.1
[0m[91mnpm info [0m[91mlinkStuff caseless@0.12.0
[0m[91mnpm info [0m[91mlinkStuff co@4.6.0
[0m[91mnpm info [0m[91mlinkStuff assert-plus@1.0.0
[0m[91mnpm info [0m[91mlinkStuff dashdash@1.14.1
[0m[91mnpm info linkStuff[0m[91m delayed-stream@1.0.0
[0m[91mnpm [0m[91minfo linkStuff combined-stream@1.0.5
[0m[91mnpm info [0m[91mlinkStuff escape-string-regexp@1.0.5
[0m[91mnpm info[0m[91m linkStuff extend@3.0.1
[0m[91mnpm info linkStuff[0m[91m extsprintf@1.0.2
[0m[91mnpm info [0m[91mlinkStuff forever-agent@0.6.1
[0m[91mnpm info linkStuff[0m[91m generic-pool@2.4.3
[0m[91mnpm info [0m[91mlinkStuff assert-plus@1.0.0
[0m[91mnpm info [0m[91mlinkStuff getpass@0.1.7
[0m[91mnpm info linkStuff[0m[91m har-schema@1.0.5
[0m[91mnpm info [0m[91mlinkStuff has-ansi@2.0.0
[0m[91mnpm info [0m[91mlinkStuff hoek@2.16.3
[0m[91mnpm info [0m[91mlinkStuff boom@2.10.1
[0m[91mnpm info[0m[91m linkStuff cryptiles@2.0.5
[0m[91mnpm info [0m[91mlinkStuff is-typedarray@1.0.0
[0m[91mnpm info [0m[91mlinkStuff isstream@0.1.2
[0m[91mnpm info [0m[91mlinkStuff jsbn@0.1.1
[0m[91mnpm [0m[91minfo linkStuff ecc-jsbn@0.1.1
[0m[91mnpm[0m[91m info linkStuff json-schema@0.2.3
[0m[91mnpm info [0m[91mlinkStuff json-stringify-safe@5.0.1
[0m[91mnpm info[0m[91m linkStuff jsonify@0.0.0
[0m[91mnpm info linkStuff json-stable-stringify@1.0.1
[0m[91mnpm info linkStuff ajv@4.11.8
[0m[91mnpm info linkStuff har-validator@4.2.1
[0m[91mnpm info linkStuff[0m[91m assert-plus@1.0.0
[0m[91mnpm info [0m[91mlinkStuff[0m[91m lodash@3.10.1
[0m[91mnpm info[0m[91m linkStuff lodash-compat@3.10.2
[0m[91mnpm info[0m[91m linkStuff mime-db@1.27.0
[0m[91mnpm[0m[91m info linkStuff mime-types@2.1.15
[0m[91mnpm info [0m[91mlinkStuff form-data@2.1.4
[0m[91mnpm info linkStuff[0m[91m oauth-sign@0.8.2
[0m[91mnpm info [0m[91mlinkStuff object-assign@4.1.0
[0m[91mnpm[0m[91m info linkStuff packet-reader@0.3.1
[0m[91mnpm info linkStuff performance-now@0.2.0
[0m[91mnpm info[0m[91m linkStuff pg-connection-string@0.1.3
[0m[91mnpm info [0m[91mlinkStuff pg-pool@1.7.1
[0m[91mnpm info [0m[91mlinkStuff postgres-array@1.0.2
[0m[91mnpm info [0m[91mlinkStuff postgres-bytea@1.0.0
[0m[91mnpm info [0m[91mlinkStuff postgres-date@1.0.3
[0m[91mnpm info[0m[91m linkStuff promise@7.1.1
[0m[91mnpm info[0m[91m linkStuff punycode@1.4.1
[0m[91mnpm info [0m[91mlinkStuff qs@6.4.0
[0m[91mnpm info [0m[91mlinkStuff uuid@3.0.1
[0m[91mnpm info [0m[91mlinkStuff safe-buffer@5.1.0
[0m[91mnpm info [0m[91mlinkStuff semver@4.3.2
[0m[91mnpm info[0m[91m linkStuff sntp@1.0.9
[0m[91mnpm info[0m[91m linkStuff hawk@3.1.3
[0m[91mnpm info[0m[91m linkStuff assert-plus@1.0.0
[0m[91mnpm info [0m[91mlinkStuff stringstream@0.0.5
[0m[91mnpm info [0m[91mlinkStuff strip-ansi@3.0.1
[0m[91mnpm info [0m[91mlinkStuff supports-color@2.0.0
[0m[91mnpm info linkStuff[0m[91m chalk@1.1.3
[0m[91mnpm info [0m[91mlinkStuff through@2.3.8
[0m[91mnpm info [0m[91mlinkStuff split@1.0.0
[0m[91mnpm info[0m[91m linkStuff pgpass@1.0.2
[0m[91mnpm info[0m[91m linkStuff tough-cookie@2.3.2
[0m[91mnpm info[0m[91m linkStuff tunnel-agent@0.6.0
[0m[91mnpm [0m[91minfo linkStuff tweetnacl@0.14.5
[0m[91mnpm info[0m[91m linkStuff bcrypt-pbkdf@1.0.1
[0m[91mnpm info[0m[91m linkStuff sshpk@1.13.1
[0m[91mnpm info[0m[91m linkStuff verror@1.3.6
[0m[91mnpm info [0m[91mlinkStuff jsprim@1.4.0
[0m[91mnpm info[0m[91m linkStuff http-signature@1.1.1
[0m[91mnpm info[0m[91m linkStuff xtend@4.0.1
[0m[91mnpm info [0m[91mlinkStuff postgres-interval@1.1.0
[0m[91mnpm info[0m[91m linkStuff pg-types@1.12.0
[0m[91mnpm info [0m[91mlinkStuff elasticsearch@11.0.1
[0m[91mnpm info[0m[91m linkStuff pg@6.2.4
[0m[91mnpm [0m[91minfo linkStuff request@2.81.0
[0m[91mnpm info[0m[91m linkStuff uuid@2.0.3
[0m[91mnpm [0m[91minfo lifecycle ansi-regex@2.1.1~install: ansi-regex@2.1.1
[0m[91mnpm info[0m[91m lifecycle ansi-styles@2.2.1~install: ansi-styles@2.2.1
[0m[91mnpm info[0m[91m lifecycle ap@0.2.0~install: ap@0.2.0
[0m[91mnpm info[0m[91m lifecycle asap@2.0.5~install: asap@2.0.5
[0m[91mnpm info[0m[91m lifecycle asn1@0.2.3~install: asn1@0.2.3
[0m[91mnpm info[0m[91m lifecycle assert-plus@0.2.0~install: assert-plus@0.2.0
[0m[91mnpm info[0m[91m lifecycle asynckit@0.4.0~install: asynckit@0.4.0
[0m[91mnpm info[0m[91m lifecycle aws-sign2@0.6.0~install: aws-sign2@0.6.0
[0m[91mnpm [0m[91minfo lifecycle aws4@1.6.0~install: aws4@1.6.0
[0m[91mnpm [0m[91minfo lifecycle buffer-writer@1.0.1~install: buffer-writer@1.0.1
[0m[91mnpm info[0m[91m lifecycle caseless@0.12.0~install: caseless@0.12.0
[0m[91mnpm info[0m[91m lifecycle co@4.6.0~install: co@4.6.0
[0m[91mnpm info[0m[91m lifecycle assert-plus@1.0.0~install: assert-plus@1.0.0
[0m[91mnpm info[0m[91m lifecycle dashdash@1.14.1~install: dashdash@1.14.1
[0m[91mnpm info[0m[91m lifecycle delayed-stream@1.0.0~install: delayed-stream@1.0.0
[0m[91mnpm info[0m[91m lifecycle combined-stream@1.0.5~install: combined-stream@1.0.5
[0m[91mnpm info[0m[91m lifecycle escape-string-regexp@1.0.5~install: escape-string-regexp@1.0.5
[0m[91mnpm info[0m[91m lifecycle extend@3.0.1~install: extend@3.0.1
[0m[91mnpm info[0m[91m lifecycle extsprintf@1.0.2~install: extsprintf@1.0.2
[0m[91mnpm info[0m[91m lifecycle forever-agent@0.6.1~install: forever-agent@0.6.1
[0m[91mnpm info[0m[91m lifecycle generic-pool@2.4.3~install: generic-pool@2.4.3
[0m[91mnpm info[0m[91m lifecycle assert-plus@1.0.0~install: assert-plus@1.0.0
[0m[91mnpm info[0m[91m lifecycle getpass@0.1.7~install: getpass@0.1.7
[0m[91mnpm info[0m[91m lifecycle har-schema@1.0.5~install: har-schema@1.0.5
[0m[91mnpm info[0m[91m lifecycle has-ansi@2.0.0~install: has-ansi@2.0.0
[0m[91mnpm info[0m[91m lifecycle hoek@2.16.3~install: hoek@2.16.3
[0m[91mnpm info[0m[91m lifecycle boom@2.10.1~install: boom@2.10.1
[0m[91mnpm info[0m[91m lifecycle cryptiles@2.0.5~install: cryptiles@2.0.5
[0m[91mnpm info[0m[91m lifecycle is-typedarray@1.0.0~install: is-typedarray@1.0.0
[0m[91mnpm info[0m[91m lifecycle isstream@0.1.2~install: isstream@0.1.2
[0m[91mnpm info[0m[91m lifecycle jsbn@0.1.1~install: jsbn@0.1.1
[0m[91mnpm info[0m[91m lifecycle ecc-jsbn@0.1.1~install: ecc-jsbn@0.1.1
[0m[91mnpm info[0m[91m lifecycle json-schema@0.2.3~install: json-schema@0.2.3
[0m[91mnpm info[0m[91m lifecycle json-stringify-safe@5.0.1~install: json-stringify-safe@5.0.1
[0m[91mnpm info[0m[91m lifecycle jsonify@0.0.0~install: jsonify@0.0.0
[0m[91mnpm info[0m[91m lifecycle json-stable-stringify@1.0.1~install: json-stable-stringify@1.0.1
[0m[91mnpm info[0m[91m lifecycle ajv@4.11.8~install: ajv@4.11.8
[0m[91mnpm info[0m[91m lifecycle har-validator@4.2.1~install: har-validator@4.2.1
[0m[91mnpm info[0m[91m lifecycle assert-plus@1.0.0~install: assert-plus@1.0.0
[0m[91mnpm info[0m[91m lifecycle lodash@3.10.1~install: lodash@3.10.1
[0m[91mnpm info[0m[91m lifecycle lodash-compat@3.10.2~install: lodash-compat@3.10.2
[0m[91mnpm info[0m[91m lifecycle mime-db@1.27.0~install: mime-db@1.27.0
[0m[91mnpm info [0m[91mlifecycle mime-types@2.1.15~install: mime-types@2.1.15
[0m[91mnpm info[0m[91m lifecycle form-data@2.1.4~install: form-data@2.1.4
[0m[91mnpm info[0m[91m lifecycle oauth-sign@0.8.2~install: oauth-sign@0.8.2
[0m[91mnpm info[0m[91m lifecycle object-assign@4.1.0~install: object-assign@4.1.0
[0m[91mnpm info [0m[91mlifecycle packet-reader@0.3.1~install: packet-reader@0.3.1
[0m[91mnpm info lifecycle[0m[91m performance-now@0.2.0~install: performance-now@0.2.0
[0m[91mnpm info lifecycle[0m[91m pg-connection-string@0.1.3~install: pg-connection-string@0.1.3
[0m[91mnpm info lifecycle[0m[91m pg-pool@1.7.1~install: pg-pool@1.7.1
[0m[91mnpm info lifecycle[0m[91m postgres-array@1.0.2~install: postgres-array@1.0.2
[0m[91mnpm info lifecycle[0m[91m postgres-bytea@1.0.0~install: postgres-bytea@1.0.0
[0m[91mnpm info[0m[91m lifecycle postgres-date@1.0.3~install: postgres-date@1.0.3
[0m[91mnpm info [0m[91mlifecycle promise@7.1.1~install: promise@7.1.1
[0m[91mnpm info [0m[91mlifecycle punycode@1.4.1~install: punycode@1.4.1
[0m[91mnpm info [0m[91mlifecycle qs@6.4.0~install: qs@6.4.0
[0m[91mnpm info[0m[91m lifecycle uuid@3.0.1~install: uuid@3.0.1
[0m[91mnpm info [0m[91mlifecycle safe-buffer@5.1.0~install: safe-buffer@5.1.0
[0m[91mnpm info [0m[91mlifecycle semver@4.3.2~install: semver@4.3.2
[0m[91mnpm info[0m[91m lifecycle sntp@1.0.9~install: sntp@1.0.9
[0m[91mnpm info [0m[91mlifecycle hawk@3.1.3~install: hawk@3.1.3
[0m[91mnpm info[0m[91m lifecycle assert-plus@1.0.0~install: assert-plus@1.0.0
[0m[91mnpm info[0m[91m lifecycle stringstream@0.0.5~install: stringstream@0.0.5
[0m[91mnpm info[0m[91m lifecycle strip-ansi@3.0.1~install: strip-ansi@3.0.1
[0m[91mnpm info[0m[91m lifecycle supports-color@2.0.0~install: supports-color@2.0.0
[0m[91mnpm info[0m[91m lifecycle chalk@1.1.3~install: chalk@1.1.3
[0m[91mnpm info[0m[91m lifecycle through@2.3.8~install: through@2.3.8
[0m[91mnpm info[0m[91m lifecycle split@1.0.0~install: split@1.0.0
[0m[91mnpm info[0m[91m lifecycle pgpass@1.0.2~install: pgpass@1.0.2
[0m[91mnpm info[0m[91m lifecycle tough-cookie@2.3.2~install: tough-cookie@2.3.2
[0m[91mnpm info[0m[91m lifecycle tunnel-agent@0.6.0~install: tunnel-agent@0.6.0
[0m[91mnpm info[0m[91m lifecycle tweetnacl@0.14.5~install: tweetnacl@0.14.5
[0m[91mnpm info [0m[91mlifecycle bcrypt-pbkdf@1.0.1~install: bcrypt-pbkdf@1.0.1
[0m[91mnpm info[0m[91m lifecycle sshpk@1.13.1~install: sshpk@1.13.1
[0m[91mnpm info[0m[91m lifecycle verror@1.3.6~install: verror@1.3.6
[0m[91mnpm [0m[91minfo lifecycle jsprim@1.4.0~install: jsprim@1.4.0
[0m[91mnpm info[0m[91m lifecycle http-signature@1.1.1~install: http-signature@1.1.1
[0m[91mnpm info[0m[91m lifecycle xtend@4.0.1~install: xtend@4.0.1
[0m[91mnpm info[0m[91m lifecycle postgres-interval@1.1.0~install: postgres-interval@1.1.0
[0m[91mnpm info[0m[91m lifecycle pg-types@1.12.0~install: pg-types@1.12.0
[0m[91mnpm info[0m[91m lifecycle elasticsearch@11.0.1~install: elasticsearch@11.0.1
[0m[91mnpm info[0m[91m lifecycle pg@6.2.4~install: pg@6.2.4
[0m[91mnpm info [0m[91mlifecycle request@2.81.0~install: request@2.81.0
[0m[91mnpm info[0m[91m lifecycle uuid@2.0.3~install: uuid@2.0.3
[0m[91mnpm info [0m[91mlifecycle ansi-regex@2.1.1~postinstall: ansi-regex@2.1.1
[0m[91mnpm info[0m[91m lifecycle ansi-styles@2.2.1~postinstall: ansi-styles@2.2.1
[0m[91mnpm info [0m[91mlifecycle ap@0.2.0~postinstall: ap@0.2.0
[0m[91mnpm info[0m[91m lifecycle asap@2.0.5~postinstall: asap@2.0.5
[0m[91mnpm info[0m[91m lifecycle asn1@0.2.3~postinstall: asn1@0.2.3
[0m[91mnpm info[0m[91m lifecycle assert-plus@0.2.0~postinstall: assert-plus@0.2.0
[0m[91mnpm info[0m[91m lifecycle asynckit@0.4.0~postinstall: asynckit@0.4.0
[0m[91mnpm info[0m[91m lifecycle aws-sign2@0.6.0~postinstall: aws-sign2@0.6.0
[0m[91mnpm info[0m[91m lifecycle aws4@1.6.0~postinstall: aws4@1.6.0
[0m[91mnpm info[0m[91m lifecycle buffer-writer@1.0.1~postinstall: buffer-writer@1.0.1
[0m[91mnpm info[0m[91m lifecycle caseless@0.12.0~postinstall: caseless@0.12.0
[0m[91mnpm info[0m[91m lifecycle co@4.6.0~postinstall: co@4.6.0
[0m[91mnpm [0m[91minfo lifecycle assert-plus@1.0.0~postinstall: assert-plus@1.0.0
[0m[91mnpm info[0m[91m lifecycle dashdash@1.14.1~postinstall: dashdash@1.14.1
[0m[91mnpm info[0m[91m lifecycle delayed-stream@1.0.0~postinstall: delayed-stream@1.0.0
[0m[91mnpm info[0m[91m lifecycle combined-stream@1.0.5~postinstall: combined-stream@1.0.5
[0m[91mnpm info[0m[91m lifecycle escape-string-regexp@1.0.5~postinstall: escape-string-regexp@1.0.5
[0m[91mnpm info[0m[91m lifecycle extend@3.0.1~postinstall: extend@3.0.1
[0m[91mnpm info[0m[91m lifecycle extsprintf@1.0.2~postinstall: extsprintf@1.0.2
[0m[91mnpm info lifecycle[0m[91m forever-agent@0.6.1~postinstall: forever-agent@0.6.1
[0m[91mnpm info[0m[91m lifecycle generic-pool@2.4.3~postinstall: generic-pool@2.4.3
[0m[91mnpm info[0m[91m lifecycle assert-plus@1.0.0~postinstall: assert-plus@1.0.0
[0m[91mnpm info[0m[91m lifecycle getpass@0.1.7~postinstall: getpass@0.1.7
[0m[91mnpm [0m[91minfo lifecycle har-schema@1.0.5~postinstall: har-schema@1.0.5
[0m[91mnpm info[0m[91m lifecycle has-ansi@2.0.0~postinstall: has-ansi@2.0.0
[0m[91mnpm info[0m[91m lifecycle hoek@2.16.3~postinstall: hoek@2.16.3
[0m[91mnpm info[0m[91m lifecycle boom@2.10.1~postinstall: boom@2.10.1
[0m[91mnpm info[0m[91m lifecycle cryptiles@2.0.5~postinstall: cryptiles@2.0.5
[0m[91mnpm info[0m[91m lifecycle is-typedarray@1.0.0~postinstall: is-typedarray@1.0.0
[0m[91mnpm info[0m[91m lifecycle isstream@0.1.2~postinstall: isstream@0.1.2
[0m[91mnpm info[0m[91m lifecycle jsbn@0.1.1~postinstall: jsbn@0.1.1
[0m[91mnpm info[0m[91m lifecycle ecc-jsbn@0.1.1~postinstall: ecc-jsbn@0.1.1
[0m[91mnpm info[0m[91m lifecycle json-schema@0.2.3~postinstall: json-schema@0.2.3
[0m[91mnpm info[0m[91m lifecycle json-stringify-safe@5.0.1~postinstall: json-stringify-safe@5.0.1
[0m[91mnpm [0m[91minfo lifecycle jsonify@0.0.0~postinstall: jsonify@0.0.0
[0m[91mnpm info[0m[91m lifecycle json-stable-stringify@1.0.1~postinstall: json-stable-stringify@1.0.1
[0m[91mnpm info[0m[91m lifecycle ajv@4.11.8~postinstall: ajv@4.11.8
[0m[91mnpm info[0m[91m lifecycle har-validator@4.2.1~postinstall: har-validator@4.2.1
[0m[91mnpm info[0m[91m lifecycle assert-plus@1.0.0~postinstall: assert-plus@1.0.0
[0m[91mnpm info[0m[91m lifecycle lodash@3.10.1~postinstall: lodash@3.10.1
[0m[91mnpm info[0m[91m lifecycle lodash-compat@3.10.2~postinstall: lodash-compat@3.10.2
[0m[91mnpm info[0m[91m lifecycle mime-db@1.27.0~postinstall: mime-db@1.27.0
[0m[91mnpm info[0m[91m lifecycle mime-types@2.1.15~postinstall: mime-types@2.1.15
[0m[91mnpm info[0m[91m lifecycle form-data@2.1.4~postinstall: form-data@2.1.4
[0m[91mnpm info[0m[91m lifecycle oauth-sign@0.8.2~postinstall: oauth-sign@0.8.2
[0m[91mnpm [0m[91minfo lifecycle object-assign@4.1.0~postinstall: object-assign@4.1.0
[0m[91mnpm info[0m[91m lifecycle packet-reader@0.3.1~postinstall: packet-reader@0.3.1
[0m[91mnpm info[0m[91m lifecycle performance-now@0.2.0~postinstall: performance-now@0.2.0
[0m[91mnpm info[0m[91m lifecycle pg-connection-string@0.1.3~postinstall: pg-connection-string@0.1.3
[0m[91mnpm info[0m[91m lifecycle pg-pool@1.7.1~postinstall: pg-pool@1.7.1
[0m[91mnpm info[0m[91m lifecycle postgres-array@1.0.2~postinstall: postgres-array@1.0.2
[0m[91mnpm info[0m[91m lifecycle postgres-bytea@1.0.0~postinstall: postgres-bytea@1.0.0
[0m[91mnpm info[0m[91m lifecycle postgres-date@1.0.3~postinstall: postgres-date@1.0.3
[0m[91mnpm info[0m[91m lifecycle promise@7.1.1~postinstall: promise@7.1.1
[0m[91mnpm info[0m[91m lifecycle punycode@1.4.1~postinstall: punycode@1.4.1
[0m[91mnpm info[0m[91m lifecycle qs@6.4.0~postinstall: qs@6.4.0
[0m[91mnpm [0m[91minfo lifecycle uuid@3.0.1~postinstall: uuid@3.0.1
[0m[91mnpm [0m[91minfo lifecycle safe-buffer@5.1.0~postinstall: safe-buffer@5.1.0
[0m[91mnpm info[0m[91m lifecycle semver@4.3.2~postinstall: semver@4.3.2
[0m[91mnpm info[0m[91m lifecycle sntp@1.0.9~postinstall: sntp@1.0.9
[0m[91mnpm info[0m[91m lifecycle hawk@3.1.3~postinstall: hawk@3.1.3
[0m[91mnpm info[0m[91m lifecycle assert-plus@1.0.0~postinstall: assert-plus@1.0.0
[0m[91mnpm info[0m[91m lifecycle stringstream@0.0.5~postinstall: stringstream@0.0.5
[0m[91mnpm info[0m[91m lifecycle strip-ansi@3.0.1~postinstall: strip-ansi@3.0.1
[0m[91mnpm info[0m[91m lifecycle supports-color@2.0.0~postinstall: supports-color@2.0.0
[0m[91mnpm info[0m[91m lifecycle chalk@1.1.3~postinstall: chalk@1.1.3
[0m[91mnpm info[0m[91m lifecycle through@2.3.8~postinstall: through@2.3.8
[0m[91mnpm info[0m[91m lifecycle split@1.0.0~postinstall: split@1.0.0
[0m[91mnpm info[0m[91m lifecycle pgpass@1.0.2~postinstall: pgpass@1.0.2
[0m[91mnpm info[0m[91m lifecycle tough-cookie@2.3.2~postinstall: tough-cookie@2.3.2
[0m[91mnpm info[0m[91m lifecycle tunnel-agent@0.6.0~postinstall: tunnel-agent@0.6.0
[0m[91mnpm info[0m[91m lifecycle tweetnacl@0.14.5~postinstall: tweetnacl@0.14.5
[0m[91mnpm info[0m[91m lifecycle bcrypt-pbkdf@1.0.1~postinstall: bcrypt-pbkdf@1.0.1
[0m[91mnpm info[0m[91m lifecycle sshpk@1.13.1~postinstall: sshpk@1.13.1
[0m[91mnpm info[0m[91m lifecycle verror@1.3.6~postinstall: verror@1.3.6
[0m[91mnpm info[0m[91m lifecycle jsprim@1.4.0~postinstall: jsprim@1.4.0
[0m[91mnpm info[0m[91m lifecycle http-signature@1.1.1~postinstall: http-signature@1.1.1
[0m[91mnpm info[0m[91m lifecycle xtend@4.0.1~postinstall: xtend@4.0.1
[0m[91mnpm info[0m[91m lifecycle postgres-interval@1.1.0~postinstall: postgres-interval@1.1.0
[0m[91mnpm info[0m[91m lifecycle pg-types@1.12.0~postinstall: pg-types@1.12.0
[0m[91mnpm info[0m[91m lifecycle elasticsearch@11.0.1~postinstall: elasticsearch@11.0.1
[0m[91mnpm info[0m[91m lifecycle pg@6.2.4~postinstall: pg@6.2.4
[0m[91mnpm info[0m[91m lifecycle request@2.81.0~postinstall: request@2.81.0
[0m[91mnpm info[0m[91m lifecycle uuid@2.0.3~postinstall: uuid@2.0.3
[0m[91mnpm info[0m[91m linkStuff a-a-a@1.0.2
[0m[91mnpm info [0m[91mlifecycle a-a-a@1.0.2~install: a-a-a@1.0.2
[0m[91mnpm info [0m[91mlifecycle a-a-a@1.0.2~postinstall: a-a-a@1.0.2
[a-app-a@1.0.2 /usr/src/app
+-- elasticsearch@11.0.1 
| +-- chalk@1.1.3 
| | +-- ansi-styles@2.2.1 
| | +-- escape-string-regexp@1.0.5 
| | +-- has-ansi@2.0.0 

[91mnpm WARN a-a-a@1.0.2 No description
[0m[91mnpm WARN a-a-a@1.0.2 No repository field.
[0m[91mnpm info [0m[91mok 
[0m ---> 59c989a71278
Removing intermediate container 838c5d4741c6
Step 28 : EXPOSE 5000
 ---> Running in 5142d844e6ab
 ---> 801d709081fc
Removing intermediate container 5142d844e6ab
Step 29 : CMD npm start
 ---> Running in c721591c3ef4
 ---> 1858a1becf78
Removing intermediate container c721591c3ef4
Successfully built 1858a1becf78
[Pipeline] dockerFingerprintFrom
[Pipeline] sh
[build] Running shell script
+ docker tag --force=true abcd/api-62dc0fd3-2cba-4925-8fca-d1129d296d2c:0.330 qq.oo.io/ot/api-62dc0fd3-2cba-4925-8fca-d1129d296d2c:0.330
unknown flag: --force
See 'docker tag --help'.
+ docker tag abcd/api-62dc0fd3-2cba-4925-8fca-d1129d296d2c:0.330 qq.oo.io/ot/api-62dc0fd3-2cba-4925-8fca-d1129d296d2c:0.330
[Pipeline] sh
[build] Running shell script
+ docker push qq.oo.io/ot/api-62dc0fd3-2cba-4925-8fca-d1129d296d2c:0.330
The push refers to a repository [qq.oo.io/ot/api-62dc0fd3-2cba-4925-8fca-d1129d296d2c]
7c979a8536fb: Preparing
a87d6fbbdb7d: Preparing
ae557825fc79: Preparing
e6a61eb4f11b: Preparing
8458a31734fc: Preparing
759936b7abd1: Preparing
f996ccadbde0: Preparing
6780f242d0d3: Preparing
162784991167: Preparing
5f70bf18a086: Preparing
5f70bf18a086: Preparing
5f70bf18a086: Preparing
5f70bf18a086: Preparing
35d7944060ff: Preparing
b6ca02dfe5e6: Preparing
f996ccadbde0: Waiting
6780f242d0d3: Waiting
162784991167: Waiting
5f70bf18a086: Waiting
35d7944060ff: Waiting
b6ca02dfe5e6: Waiting
759936b7abd1: Waiting
e6a61eb4f11b: Pushed
ae557825fc79: Pushed
a87d6fbbdb7d: Pushed
759936b7abd1: Pushed
7c979a8536fb: Pushed
f996ccadbde0: Pushed
6780f242d0d3: Pushed
5f70bf18a086: Pushed
162784991167: Pushed
8458a31734fc: Pushed
b6ca02dfe5e6: Pushed
35d7944060ff: Pushed
0.330: digest: sha256:a7a887ba416f89abb440605d9dc706c1bb4fd52e7fc4b6413df185d0eef392ed size: 27744
[Pipeline] }
[Pipeline] // withDockerRegistry
[Pipeline] }
[Pipeline] // withEnv
[Pipeline] }
[Pipeline] // dir
[Pipeline] }
[Pipeline] // node
[Pipeline] End of Pipeline
Finished: SUCCESS
`);
    expect(result.indexOf('fugazi') === -1, 'Something leaked through.');
    expect(result.indexOf('RUN mkdir') !== -1, 'Build command did not make it through.');
    expect(result.indexOf('CMD npm start') !== -1, 'Run command did not make it through.');
    done();
  });
});
