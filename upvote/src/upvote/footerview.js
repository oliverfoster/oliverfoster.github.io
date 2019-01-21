var FooterView = View.extend({

  template: function() {
    var hash = upvote.router.hash;
    var className = hash[0];
    return `
<div id="${this.id}">
  <div class="inner">
  </div>
</div>
`;
  }

});
