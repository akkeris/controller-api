module.exports = function(key) {
  var auth = function(req, auth) {
    if(auth && auth === key) {
      return true;
    } else {
      return false;
    }
  };
  return {auth:auth};
};