var Router = Class.extend({

  path: null,

  constructor: function Router() {
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

  onChange: function() {
    this.trigger("change", location.hash);
  }

}, null, {
  instanceEvents: true
});
