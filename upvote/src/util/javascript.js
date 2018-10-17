var delay = function(callback, time) {
  setTimeout(callback, time);
};

var debounce = function(callback, time) {
  var handle = null;
  return function() {
    var args = arguments;
    clearTimeout(handle);
    handle = setTimeout(function() {
      callback.apply(this, args);
    }.bind(this), time || 0);
  }
};

var bindAll = function(subject, fromArgs) {
  var startIndex = 0;
  var names = fromArgs;
  if (!(fromArgs instanceof Array)) {
    names = arguments;
    startIndex = 1;
  }
  var enumerableNames = {};
  for (var k in subject) enumerableNames[k] = true;
  for (var i = startIndex, l = names.length; i < l; i++) {
    var name = names[i];
    var desc = Object.getOwnPropertyDescriptor(subject, name);
    if (desc && !desc.writable) continue;
    if (!(subject[name] instanceof Function)) {
      var error = "Cannot bindAll to non-function '"+name+"'";
      console.log(error, subject);
      throw error;
    }
    var isEnumerable = enumerableNames[name];
    Object.defineProperty(subject, name, {
      value: subject[name].bind(subject),
      enumerable: isEnumerable,
      writable: true,
      configurable: true
    });
  }
};

var getUrl = function(url, callback, context) {
  var req = new XMLHttpRequest();
  req.addEventListener("load", function(event) {
    callback.call(context, event.target.responseText);
  });
  req.open("GET", url);
  req.send();
};


var postUrl = function(url, data, callback, context) {
  var req = new XMLHttpRequest();
  req.addEventListener("load", function(event) {
    callback.call(context, event.target.responseText);
  });
  req.open("POST", url);
  req.send(data);
};
