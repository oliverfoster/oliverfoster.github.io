var Router = Class.extend({

  path: null,
  startHash: "",

  constructor: function Router() {
    this.startHash = this.hash;
    history.replaceState(null, null, "#");
    bindAll(this, "onChange");
    window.addEventListener("popstate", this.onChange);
  },

  replace: function(hash) {
    history.replaceState(null, null, hash);
    this.onChange();
  },

  push: function(hash) {
    history.pushState(null, null, hash);
    this.onChange();
  },

  hash$get: function() {
    return location.hash;
  },

  hasSearch$get: function() {
    return Boolean(location.search);
  },

  cookie$get: function() {
    var pairs = {};
    var str = document.cookie;
    var rawPairs = str.split("&");
    for (var i = 0, l = rawPairs.length; i < l; i++) {
      var parts = rawPairs[i].split("=");
      pairs[parts[0]] = parts[1];
    }
    return pairs;
  },

  search$get: function() {
    var pairs = {};
    var str = location.search;
    if (str[0] === "?") str = str.slice(1);
    var rawPairs = str.split("&");
    for (var i = 0, l = rawPairs.length; i < l; i++) {
      var parts = rawPairs[i].split("=");
      pairs[parts[0]] = parts[1];
    }
    return pairs;
  },

  onChange: function() {
    this.trigger("change", location.hash);
  }

}, null, {
  instanceEvents: true
});
