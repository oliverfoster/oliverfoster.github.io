var Elements = List.extend({

  subject: null,

  constructor: function Elements(selector, subject) {
    this.subject = subject || document;
    this.add(selector, this.subject);
    this.selector = selector;
  },

  filterByAttribute: function(attrName, filterValue) {
    var items = this.filter(function(item) {
      var attrValue = item.getAttribute(attrName);
      if (!attrValue) return;
      var attrValues = attrValue.split(" ");
      if (includes(attrValues, filterValue)) return true;
    });
    return new Elements(items);
  },

  filterByTypes: function(type) {
    var types = type.split(",").map(function(type) { return type.trim(); });
    var items = this.filter(function(item) {
      var typeValue = item.tagName.toLowerCase();
      if (includes(types, typeValue)) return true;
    });
    return new Elements(items);
  },

  find: function(selector) {
    var result = new Elements();
    this.forEach(function(item) {
      result.push.apply(result, item.querySelectorAll(selector));
    });
    return result;
  },

  stack: function(selector) {
    var stack = this.parents();
    stack.unshift(this[0]);
    if (selector) {
      stack = stack.filter(function(item) {
        return (item.matches(selector));
      });
    }
    return stack;
  },

  parents: function(selector) {
    var parent = this[0];
    var parents = new Elements();
    do {
      parent = parent.parentNode;
      if (parent) parents.add(parent);
    } while (parent)
    if (selector) {
      parents = parents.filter(function(item) {
        return (item.matches(selector));
      });
    }
    return parents;
  },

  value: function() {
    return this[0].value;
  },

  add: function(selector, subject) {
    this.selector = "";
    subject = subject || document;
    if (selector instanceof HTMLElement) {
      this.push(selector);
      return this;
    }
    if (selector instanceof Array || selector instanceof NodeList) {
      for (var i = 0, l = selector.length; i < l; i++) {
        this.add(selector[i]);
      }
      return this;
    }
    if (typeof selector === "string") {
      var elements = subject.querySelectorAll(selector);
      for (var i = 0, l = elements.length; i < l; i++) {
        this.push(elements[i]);
      }
      return this;
    }
    return this;
  },

  clone: function(deep) {
    var clones = [];
    for (var i = 0, l = this.length; i < l; i++) {
      clones.push(this[i].cloneNode(deep));
    }
    return new Elements(clones, this.subject);
  },

  on: function(name, callback, options) {
    if (name instanceof Object) {
      for (var k in name) {
        this.on(k, name[k], callback);
      }
      return this;
    }
    this.forEach(function(element) {
      element.addEventListener(name, callback, options);
    });
    return this;
  },

  off: function(name, callback) {
    if (name instanceof Object) {
      for (var k in name) {
        this.off(k, name[k]);
      }
      return this;
    }
    this.forEach(function(element) {
      element.removeEventListener(name, callback);
    });
    return this;
  },

  attr: function(name, value) {
    if (name instanceof Object) {
      for (var k in name) {
        this.attr(k, name[k]);
      }
      return this;
    }
    this.forEach(function(element) {
      element.setAttribute(name, value);
    });
  },

  toggleClass: function(name, value) {
    this.forEach(function(element) {
      toggleClass(element, name, value);
    });
  }

});

var elements = function(selector, subject) { return new Elements(selector, subject); };
extend(elements, Elements);
