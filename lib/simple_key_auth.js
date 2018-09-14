module.exports = function(keys) {
  let auth = function(req, provided_key) {
    if(provided_key && provided_key !== '' && provided_key !== null && keys.includes(provided_key)) {
      return true;
    } else {
      return false;
    }
  };
  return {auth};
};