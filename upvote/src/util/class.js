/**
 * A simple class implementation akin to Backbonejs.
 * var cls = Class({
 *  instanceFunction: function() {
 *    console.log("parent function");
 *  }
 * }, {
 *  classFunction: function() {
 *    console.log("class function");
 *  }
 * }, {
 *    inheritClassEnumerables: false,
 *    classEvents: false,
 *    classProperties: true,
 *    instanceEvents: false,
 *    instanceProperties: true
 * });
 * @param {Object} proto  An object describing the Class prototype properties.
 * @param {Object} parent An object describing the Class properties.
 */
var ClassExtend = function(proto, cls, options) {
  var parent = this;
  var child;

  // Create or pick constructor
  if (proto && proto.hasOwnProperty("constructor")) child = proto.constructor;
  else child = function Class() { return parent.apply(this, arguments); };

  Object.defineProperty(child, 'options', {
    value: defaults(options, parent.options, {
      extendFunction: true,
      inheritClassEnumerables: false,
      classEvents: false,
      classProperties: true,
      instanceEvents: false,
      instanceProperties: true
    }),
    enumerable: false,
    writable: true
  });

  // Generate new prototype chain
  child.prototype = Object.create(parent.prototype);

  // Add extend function
  if (child.options.extendFunction) {
    extendNotEnumerable(child, {
      extend: ClassExtend
    });
  }

  // Add events system to Class
  if (child.options.classEvents) {
    extendNotEnumerable(child, Events);
  }

  // Extend constructor with parent functions and cls properties
  if (child.options.inheritClassEnumerables) extend(child, parent);
  extend(child, cls);

  // Add events system to prototype
  if (child.options.instanceEvents) {
    extendNotEnumerable(child.prototype, Events);
  }

  // Extend constructor.prototype with prototype chain
  extend(child.prototype, proto);

  // Apply properties pattern to constructor prototype
  if (child.options.instanceProperties) {
    Object.defineProperty(child.prototype, "defineProperties", {
      value: function(props) {
        return properties(this, props);
      },
      enumerable: false,
      writable: false,
      configurable: false
    });
    properties(child.prototype);
  }

  // Apply properties pattern to constructor
  if (child.options.classProperties) {
    Object.defineProperty(child, "defineProperties", {
      value: function(props) {
        return properties(this, props);
      },
      enumerable: false,
      writable: false,
      configurable: false
    });
    properties(child);
  }

  // Reassign constructor
  extendNotEnumerable(child.prototype, {
    constructor: child
  });

  return child;
};

var ClassParent = function Class(proto, cls) {};
var ListParent = function List(proto, cls) {};
ListParent.prototype = new Array();

// Create base Class and List prototypes
// Add Events system to both class and instances
var Class = ClassExtend.call(ClassParent, {}, {}, { classEvents: false, instanceEvents: false });
var List = ClassExtend.call(ListParent, {}, {}, { classEvents: false, instanceEvents: false });
