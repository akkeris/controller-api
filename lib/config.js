require('dotenv').config();
const http_help = require('./http_helper.js');

const config = {
  database_url: process.env.DATABASE_URL,
  build_shuttle_url: http_help.clean_forward_slash(process.env.BUILD_SHUTTLE_URL),
  simple_key: [],
  encrypt_key: process.env.ENCRYPT_KEY,
  akkeris_app_controller_url: http_help.clean_forward_slash(
    process.env.AKKERIS_APP_CONTROLLER_URL || process.env.ALAMO_APP_CONTROLLER_URL,
  ),
  akkeris_api_url: http_help.clean_forward_slash(process.env.AKKERIS_API_URL || process.env.APPKIT_API_URL),
  akkeris_ui_url: http_help.clean_forward_slash(process.env.AKKERIS_UI_URL || process.env.APPKIT_UI_URL),
  gm_registry_host: process.env.DOCKER_REGISTRY_HOST,
  gm_registry_repo: process.env.DOCKER_REPO || process.env.DOCKER_REGISTRY_ORG, // DOCKER_REPO deprecated
  gm_registry_auth: process.env.DOCKER_REGISTRY_AUTH ? JSON.parse(process.env.DOCKER_REGISTRY_AUTH) : null,
  prometheus_metrics_url: process.env.PROMETHEUS_METRICS_URL,
  log_shuttle_url: http_help.clean_forward_slash(process.env.LOG_SHUTTLE_URL),
  log_session_url: http_help.clean_forward_slash(process.env.LOG_SESSION_URL),
  default_port: process.env.DEFAULT_PORT ? parseInt(process.env.DEFAULT_PORT, 10) : 9000,
  envs_blacklist: process.env.BLACKLIST_ENV || 'PASS,KEY,SECRET,PRIVATE,TOKEN,SALT,AUTH,HASH',
  influxdb_metrics_url: process.env.INFLUXDB_METRICS_URL,
  dyno_default_size: process.env.DYNO_DEFAULT_SIZE || 'gp1',
  anomaly_metrics_drain: process.env.ANOMALY_METRICS_DRAIN,
  papertrail_drain: process.env.PAPERTRAIL_DRAIN,
  twilio_auth: process.env.TWILIO_AUTH_KEY,
  default_github_username: process.env.DEFAULT_GITHUB_USERNAME,
  default_github_token: process.env.DEFAULT_GITHUB_TOKEN,
  jwt_public_cert: process.env.JWT_RS256_PUBLIC_CERT,
  jwt_private_key: process.env.JWT_RS256_PRIVATE_KEY,
  alamo_headers: {},
  csp_report_uri: process.env.CSP_REPORT_URI,
  csp_ignore_domains: process.env.CSP_IGNORE_DOMAINS,
};

if (process.env.ALAMO_APP_CONTROLLER_URL && !process.env.AKKERIS_APP_CONTROLLER_URL) {
  console.warn('WARNING: This env is still using ALAMO_APP_CONTROLLER_URL which was renamed to AKKERIS_APP_CONTROLLER_URL. Please switch immediately!');
}
if (process.env.APPKIT_API_URL && !process.env.AKKERIS_API_URL) {
  console.warn('WARNING: This env is still using APPKIT_API_URL which was renamed to AKKERIS_API_URL. Please switch immediately!');
}
if (process.env.APPKIT_UI_URL && !process.env.AKKERIS_UI_URL) {
  console.warn('WARNING: This env is still using APPKIT_UI_URL which was renamed to AKKERIS_UI_URL. Please switch immediately!');
}

if (config.simple_key.length === 0 && process.env.AUTH_KEY && process.env.AUTH_KEY !== '') {
  config.simple_key = [process.env.AUTH_KEY];
}
if (config.simple_key.length === 0 && process.env.SECURE_KEY && process.env.SECURE_KEY !== '') {
  config.simple_key = process.env.SECURE_KEY.split(',');
}


module.exports = config;
