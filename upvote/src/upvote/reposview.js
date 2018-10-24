var ReposView = View.extend({

  attach: function() {
    this.clear();
    this.model.fetchRepos(function() {
      this.render();
    }.bind(this));
  },

  template: function() {
    return `
<div id="${this.id}" class="content-outer">
  ${each(this.model.repos, (item, index)=>{
    return seat({ class: ReposItemView, model: item, id: "item-"+index });
  }, (items)=>{
    return '<div class="loading">Loading...</div>';
  })}
</div>
`;
  }

});
