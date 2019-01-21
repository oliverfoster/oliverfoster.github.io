var ToolTipView = View.extend({

  initialize: function() {
    bindAll(this, "onMouseOver", "onMouseOut");
    elements(document.body)
      .on({
        "mouseover": this.onMouseOver,
        "mouseout": this.onMouseOut
      });
  },

  onMouseOver: function(event) {
    var element = elements(event.path).find(function(el) {
      return el.matches("[tooltip]");
    })
    if (!element) return;
    this.model.show = true;
    this.model.text = element.getAttribute("tooltip");
    this.$("#tooltip-text")[0].innerHTML = this.model.text;

    var elRect = element.getBoundingClientRect();
    elRect.height = element.clientHeight;
    elRect.width = element.clientWidth;

    var ttRect = {
      height: this.el.clientHeight + 8,
      width: this.el.clientWidth
    };
    var vpRect = {
      height: window.innerHeight,
      width: window.innerWidth
    };

    var overTop = (elRect.top - ttRect.height < 0);
    var underBottom = (elRect.top + elRect.height + ttRect.height > vpRect.height);
    if (overTop && underBottom) {
      // display up to top
    } else if (overTop) {
      // display under bottom
    } else {
      // display over top
      this.model.top = elRect.top - ttRect.height;
    }

    var overLeft = (elRect.left - ttRect.width < 0);
    var underRight = (elRect.left + elRect.width + ttRect.width > vpRect.width);
    if (overLeft && underRight) {
      // display up to left
    } else if (overLeft) {
      // display under right
    } else {
      // display over left
      this.model.left = elRect.left - (ttRect.width / 2);
    }

  },

  onMouseOut: function(event) {
    var element = elements(event.path).find(function(el) {
      return el.matches("[tooltip]");
    })
    if (!element) return;
    this.model.show = false;
  },

  template: function() {
    return `
<div id="${this.id}" class="${this.model.show?"show":""}" style="top:${this.model.top}px;left:${this.model.left}px;">
<div id="tooltip-text" view></div>
<div id="tooltip-triangle" style="left:${this.model.triangleLeft}px;"></div>
</div>
`;
  }

});
