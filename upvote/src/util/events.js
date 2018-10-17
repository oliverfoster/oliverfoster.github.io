var EventsInitialize = function(subject) {
  if (subject.events && subject.trigger) return;
  if (!subject.events) {
    Object.defineProperty(subject, 'events', {
      value: new EventsRegistry(),
      enumerable: false
    });
  }
  if (!subject.trigger) {
    Object.defineProperty(subject, 'trigger', {
      value: Events.trigger,
      enumerable: false
    });
  }
};

var EventsArgumentsNotation = function(name, callback, subject, each, that) {
  if (name instanceof Object) {
    var object = name;
    subject = callback || this;
    for (var k in object) {
      var names = k.split(" ");
      for (var i = 0, l = names.length; i < l; i++) {
        var eventName = names[i];
        var callback = object[k];
        each.call(that, eventName, callback, subject);
      }
    }
  } else if (typeof name === "string") {
    subject = subject || this;
    var names = name.split(" ");
    for (var i = 0, l = names.length; i < l; i++) {
      var eventName = names[i];
      each.call(that, eventName, callback, subject);
    }
  } else if (name === undefined && callback === undefined && subject === undefined) {
    return each.call(that, null, null, null);
  }
};

var EventsRegistry = function() {};
EventsRegistry.prototype = new Array();

var EventRegister = function(options) {
  if (!options.name) return;
  if (!options.callback) {
    throw "Cannot find callback";
  }
  EventsInitialize(options.from);
  EventsInitialize(options.to);
  this.from = options.from;
  this.to = options.to;
  this.context = options.context;
  this.name = options.name;
  this.callback = options.callback;
  this.once = options.once;
  this.from.events.push(this);
  if (this.from === this.to) return;
  this.to.events.push(this);
};
EventRegister.prototype.destroy = function() {
  this.from.events = this.from.events.filter(function(event) {
    return event !== this;
  }.bind(this));
  if (this.from === this.to) return;
  this.to.events = this.to.events.filter(function(event) {
    return event !== this;
  }.bind(this));
};

var Events = {

  events: null,

  listenTo: function(subject, name, callback) {
    EventsArgumentsNotation(name, callback, subject, function(name, callback, subject) {
      new EventRegister({
        from: subject,
        to: this,
        context: this,
        name: name,
        callback: callback,
        once: false
      });
    }, this);
  },

  listenToOnce: function(subject, name, callback) {
    EventsArgumentsNotation(name, callback, subject, function(name, callback, subject) {
      new EventRegister({
        from: subject,
        to: this,
        context: this,
        name: name,
        callback: callback,
        once: true
      });
    }, this);
  },

  stopListening: function(subject, name, callback) {
    EventsArgumentsNotation(name, callback, subject, function(name, callback, subject) {
      for (var i = this.events.length - 1; i > -1; i--) {
        var event = this.events[i];
        if (event.to.events !== this.events) continue;
        if (name !== null && event.name !== name) continue;
        if (callback !== null && event.callback !== callback) continue;
        event.destroy();
      }
    }, this);
  },

  on: function(name, callback, context) {
    EventsArgumentsNotation(name, callback, context, function(name, callback, context) {
      new EventRegister({
        from: this,
        to: this,
        context: context,
        name: name,
        callback: callback,
        once: false
      });
    }, this);
  },

  once: function(name, callback, context) {
    EventsArgumentsNotation(name, callback, context, function(name, callback, context) {
      new EventRegister({
        from: this,
        to: this,
        context: context,
        name: name,
        callback: callback,
        once: true
      });
    }, this);
  },

  off: function(name, callback, context) {
    EventsArgumentsNotation(name, callback, context, function(name, callback, context) {
      for (var i = this.events.length - 1; i > -1; i--) {
        var event = this.events[i];
        if (event.from.events !== this.events) continue;
        if (name !== null && event.name !== name) continue;
        if (callback !== null && event.callback !== callback) continue;
        event.destroy();
      }
    }, this);
  },

  trigger: function(name) {
    EventsInitialize(this);
    var events = [];
    for (var i = 0, l = this.events.length; i < l; i++) {
      var event = this.events[i];
      if (event.from.events !== this.events) continue;
      if (event.name !== "*" && event.name !== name) continue;
      events.push(event);
    }
    events.reverse();
    for (var i = events.length - 1; i > -1; i--) {
      var event = events[i];
      if (event.name === "*") {
        event.callback.apply(event.context, arguments);
      } else {
        event.callback.apply(event.context, toArray(arguments, 1));
      }
      if (!event.once) continue;
      event.destroy();
    }
  },

  destroy: function() {
    this.stopListening();
  }

};
