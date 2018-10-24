var PollsView = View.extend({

  attach: function() {
    this.clear();
    this.model.fetchPolls(function() {
      this.render();
    }.bind(this));
  },

  template: function() {
    return `
<div id="${this.id}" class="content-outer">
  ${each(this.model.polls, (item, index)=>{
    return seat({ class: PollsItemView, model: item, id: "item-"+index });
  }, (items)=>{
    if (!items) {
      return '<div class="loading">Loading...</div>';
    }
    return '<div class="empty">No open polls found.</div>';
  })}
</div>
`;
  }

});
