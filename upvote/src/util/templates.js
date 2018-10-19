var Templates = List.extend({

  constructor: function Templates() {},

  in: function(context) {
    this.push(context);
  },

  out: function(context) {
    // TODO: process view containers on out rather than wait for mutation observer
    var oldContext = this.pop();
    if (context !== oldContext) throw "Bad context management";
    this.attachChildren(oldContext);
  },

  children$get$enum: function() {
    return this[this.length-1].children;
  },

  attachChildren: function(view) {
    var children = view.children;
    if (!Object.keys(children).length) return;
    var seats = elements(":not([view]) [view]", view.el);
    for (var i = 0, l = seats.length; i < l; i++) {
      var seat = seats[i];
      var existing = children[seat.id];
      if (!existing) continue;
      existing.attach && existing.attach();
      if (existing.el === seat) continue;
      replaceWith(seat, existing.el);
      existing.render();
    }
  }

});

var templates = new Templates();

var each = function(arr, cb, elsecb) {
  if (!arr || !arr.length) return (elsecb && elsecb(arr) || "");
  return arr.map(cb).join("");
};

var or = function(args) {
  for (var i = 0, l = arguments.length; i < l; i++) {
    switch (arguments[i]) {
      case undefined:
      case null:
        continue;
      default:
        return arguments[i];
    }
  }
  return "";
};

var seat = function(obj) {
  var children = templates.children;
  var existing = children[obj.id];
  if (!existing) {
    existing = new obj.class(obj);
    templates.children[existing.id] = (existing);
    return `<${existing.tagName} view id="${existing.id}"></${existing.tagName}>`;
  }
  existing.model = obj.model;
  return existing.seat || existing.el.cloneNode().outerHTML;
};
