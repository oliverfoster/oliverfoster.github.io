var View = Class.extend({

  id: "",
  cid: "",
  tagName: "div",

  constructor: function View(options) {
    this.cid = ++View.ids;
    Object.defineProperty(this, "_model", {
      value: null,
      writable: true,
      enumerable: false
    });
    this.model = options.model;
    this.id = options.id || this.id || "c"+ ++this.constructor.ids;
    this.el = elements(options.el || document.createElement(this.tagName))[0];
    typeof this.initialize === "function" && this.initialize(options);
  },

  initialize: function() {
    this.render();
  },

  model$set: function(model) {
    if (this._model) {
      if (this._model.attributes === model) {
        return;
      }
      this.stopListening(this._model.__model__);
    }
    var ModelClass = Model;
    if (model instanceof Model) {
      ModelClass = model.constructor;
    }
    this._model = model || {};
    this._model = new ModelClass(this._model, { preventPropagation: true });
    this.listenTo(this.model.__model__, "change", this.render);
    this.render();
  },

  model$get: function() {
    return this._model;
  },

  el$set: function(el) {
    this.$el = elements(el);
  },

  el$get: function() {
    return this.$el && this.$el[0];
  },

  children$get$enum: function() {
    this._children = this._children || [];
    return this._children;
  },

  $: function(selector) {
    return this.$el.query(selector);
  },

  render: function() {
    if (!this.el) return;
    typeof this.preRender === "function" && this.preRender();
    this.trigger("preRender");
    templates.in(this);
    this.el.view = this;
    var templateString = this.template.call(this);
    vode.updateOuterHTML(this.el, templateString, {
      injectRootAttributes: { view: this.cid },
      ignoreSubTreesWithAttributes: ['view']
    });
    this.seat = this.el.cloneNode().outerHTML;
    var eventSelector = "[onchange], [onclick]";
    elements(this.el).differenceQuery(eventSelector, elements(this.el).query("[view]").query(eventSelector)).forEach(function(element) {
      element.view = this;
    }.bind(this));
    templates.out(this);
    this.trigger("postRender");
    typeof this.postRender === "function" && this.postRender();
  },

  template: function() {
    return `<div view id="${this.id}"></div>`
  },

  clear: function() {
    this.el.innerHTML = "";
  }

}, {
  ids: 0
}, {
  instanceEvents: true
});
