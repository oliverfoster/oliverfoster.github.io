var ReposItemView = View.extend({

  onClick: function(event) {
    upvote.model.repo = this.model;
    upvote.router.push("#polls&path="+this.model.user_name+"/"+this.model.repo_name);
  },

  onLink: function(event) {
    event.stopPropagation();
  },

  template: function() {
    return `
<div id="${this.id}" class="repos-item tile">
  <div class="inner">
    <div class="menubar">
      <div class="padding"></div>
      <button ${this.model.disable?"disabled":""} class="vote menu-btn" onclick="this.view.onClick(event);">${svg.project} Open polls</button>
    </div>
    <div class="content">
      <div class="header">
        <div class="text">
          <span class="avatar">
            <img src="${this.model.owner.avatarUrl}" />
          </span>
          <div class="title"><h1><a href="#polls&path=${this.model.user_name}/${this.model.repo_name}" onclick="this.view.onLink(event);">${this.model.user_name}</a> / <a href="#polls&path=${this.model.user_name}/${this.model.repo_name}" onclick="this.view.onLink(event);">${this.model.repo_name}</a></h1></div>
        </div>
      </div>
      <div class="body markdown">${markdown.makeHtml(this.model.description)}</div>
    </div>
  </div>
</div>
`;
  }

});
