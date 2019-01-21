var Router = Class.extend({

  path: null,
  startHash: "",

  constructor: function Router() {
    this.startHash = this.hash;
    bindAll(this, "onChange");
    window.addEventListener("popstate", this.onChange);
    this.initialize && this.initialize.call(this, arguments);
  },

  replace: function(hash) {
    if (typeof hash === "object") {
      hash = this.permalink(hash);
    }
    history.replaceState(null, null, hash);
    this.onChange();
  },

  push: function(hash) {
    if (typeof hash === "object") {
      hash = this.permalink(hash);
    }
    history.pushState(null, null, hash);
    this.onChange();
  },

  hash$get: function() {
    var pairs = [];
    var str = location.hash;
    if (str[0] === "#") str = str.slice(1);
    var rawPairs = str.split("&");
    for (var i = 0, l = rawPairs.length; i < l; i++) {
      var parts = rawPairs[i].split("=");
      pairs[parts[0]] = parts[1] || true;
      if (!i) pairs.push(parts[0]);
    }
    return pairs;
  },

  permahash: function(hash) {
    hash = hash || this.hash;
    var link = [];
    for (var k in hash) {
      if (!isNaN(k)) continue;
      if (k === hash[0]) {
        link.unshift(k);
        continue;
      }
      link.push(k+"="+hash[k]);
    }
    return `${link.join("&")}`;
  },

  permalink: function(hash) {
    return `${location.origin}${location.pathname}#${this.permahash(hash)}`;
  },

  hasSearch$get: function() {
    return Boolean(location.search);
  },

  cookie$get: function() {
    var pairs = {};
    var str = document.cookie;
    var rawPairs = str.split(";");
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
      pairs[parts[0]] = parts[1] || true;
    }
    return pairs;
  },

  onChange: function() {
    this.trigger("change", this.hash);
  }

}, null, {
  instanceEvents: true
});
