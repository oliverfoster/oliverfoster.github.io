var PollView = View.extend({

  attach: function() {
    this.model.fetchPollIssues(function() {
      this.render();
    }.bind(this));
  },

  template: function() {
    return `
<div id="${this.id}" class="content-outer">
  ${each(this.model.pollIssues, (item, index)=>{
     return seat({ class: PollItemView, model: item, id: "item-"+index });
  }, (items)=>{
    if (!items) {
      return '<div class="loading">Loading...</div>';
    }
    return '<div class="empty">There are no issues associated with the poll yet.</div>';
  })}
</div>
`;
  }

});
