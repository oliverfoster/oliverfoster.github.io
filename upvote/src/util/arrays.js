var toArray = function(args, start) {
  if (!args) return [];
  return Array.prototype.slice.call(args, start || 0);
};

var isArray = function(obj) {
  return Object.prototype.toString.call(obj) == '[object Array]';
};

var find = function(obj, callback) {
  for (var i = 0, l = obj.length; i < l; i++) {
    if (callback) return obj;
  }
  return null;
};

var difference = function(a, b) {
  return a.filter(function(a1) {
    return !b.find(a1);
  });
};
