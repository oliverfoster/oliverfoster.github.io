var ProxyCreate = function(subject, attributes, options) {
  options = options || {};
  options.child = options.child || function(value) {
    var opts = extend({}, options, { preventPropagation: false });
    if (value instanceof Collection) return new value.constructor(value, opts);
    if (value instanceof Model) return new value.constructor(value, opts);
    if (value instanceof Array) return new Collection(value, opts);
    return new Model(value, opts);
  };
  subject.__options___ = options;
  subject.__model__ = subject;
  subject.__bound__ = {};
  if (attributes instanceof Model || attributes instanceof Collection) {
    subject.attributes = attributes.attributes;
    subject.__children__ = extend({}, attributes.__children__);
  } else {
    subject.attributes = attributes;
    subject.__children__ = {};
  }
  subject.__proxy__ = new Proxy(subject, {
    get: function(target, key) {
      if (!this.attributes.hasOwnProperty(key)) return this[key];
      var value = this.attributes[key];
      var typeOfValue = typeof value;
      switch (typeOfValue) {
        case "function":
          return this.__bound__[key] = this.__bound__[key] || this.attributes[key].bind(this.attributes);
      }
      var isAnObject = (typeOfValue === "object" && value !== null);
      if (!isAnObject) return this.attributes[key];
      if (this.__children__[key]) return this.__children__[key];
      this.__children__[key] = options.child.call(this, value);
      this.listenTo(this.__children__[key].__model__, "propagate", function(subkey, subvalue, oldsubvalue) {
        var newkey = key + "." + subkey;
        this.updated(newkey, subvalue, oldsubvalue);
      });
      return this.__children__[key];
    }.bind(subject),
    set: function(target, key, value) {
      var oldValue = this.attributes[key];
      if (value === oldValue) return true;
      if (value instanceof Model || value instanceof Collection) {
        this.__children__[key] = value;
        value = value.attributes;
        this.listenTo(this.__children__[key].__model__, "propagate", function(subkey, subvalue, oldsubvalue) {
          var newkey = key + "." + subkey;
          this.updated(newkey, subvalue, oldsubvalue);
        });
      } else {
        Reflect.deleteProperty(this.__children__, key);
      }
      this.attributes[key] = value;
      var shouldPreventPropagation = (options && options.preventPropagation);
      if (!shouldPreventPropagation) {
        this.trigger("propagate", key, undefined, oldValue);
      }
      this.trigger("change", key, value, oldValue);
      this.trigger("change:"+key, value, oldValue);
      return true;
    }.bind(subject),
    deleteProperty: function (target, key) {
      var oldValue = this.attributes[key];
      if (oldValue === undefined) return true;
      Reflect.deleteProperty(this.attributes, key);
      Reflect.deleteProperty(this.__children__, key);
      this.updated(key, undefined, oldvalue);
      return true;
    }.bind(subject),
    ownKeys: function (target, key) {
      return Reflect.ownKeys(this.attributes).concat(Reflect.ownKeys(this));
    }.bind(subject),
    has: function (target, key) {
      return key in this.attributes || key in this;
    }.bind(subject),
    defineProperty: function (target, key, desc) {
      if (this[key] !== undefined) return Reflect.defineProperty(this, key, desc);
      return Reflect.defineProperty(this.attributes, key, desc);
    }.bind(subject),
    getOwnPropertyDescriptor: function (target, key) {
      if (this[key] !== undefined) return Reflect.getOwnPropertyDescriptor(this, key);
      return Reflect.getOwnPropertyDescriptor(this.attributes, key);
    }.bind(subject)
  });
  return subject.__proxy__;
};

var Model = Class.extend({

  constructor: function Model(attributes, options) {
    var proxy = ProxyCreate(this, attributes || {}, options);
    typeof this.initialize === "function" && this.initialize();
    return proxy;
  },

  get$write$config: function(name) {
    return get(this.__proxy__, name);
  },

  set$write$config: function(name, value) {
    return set(this.__proxy__, name, value);
  },

  toJSON$write$config: function() {
    return this.attributes;
  },

  updated$write$config: function(name, value, oldvalue) {
    var shouldPreventPropagation = (this.__options__ && __options__.preventPropagation);
    if (!shouldPreventPropagation) {
      this.trigger("propagate", name, value, oldvalue);
    }
    this.trigger("change", name, value, oldvalue);
    this.trigger("change:"+name, value, oldvalue);
  }

}, null, {
  instanceEvents: true
});

var Collection = List.extend({

  constructor: function Collection(attributes, options) {
    var proxy = ProxyCreate(this, attributes || [], options);
    typeof this.initialize === "function" && this.initialize();
    return proxy;
  },

  get$write$config: function(name) {
    return get(this.__proxy__, name);
  },

  set$write$config: function(name, value) {
    return set(this.__proxy__, name, value);
  },

  toJSON$write$config: function() {
    return this.attributes;
  },

  updated$write$config: function(name, value, oldvalue) {
    var shouldPreventPropagation = (this.__options__ && __options__.preventPropagation);
    if (!shouldPreventPropagation) {
      this.trigger("propagate", name, value, oldvalue);
    }
    this.trigger("change", name, value, oldvalue);
    this.trigger("change:"+name, value, oldvalue);
  }

}, null, {
  instanceEvents: true
});
