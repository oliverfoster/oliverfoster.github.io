var WrapperView = View.extend({

  id: "wrapper",

  initialize: function() {},

  template: function() {
    var parts = upvote.router.hash.split("=");
    var name = parts[0];
    var id = parts[1];
    var className = name.slice(1);
    return `
<div id="${this.id}" class="${className}">
  ${seat({ class: NavigationView, id: "content-navigation" })}
  ${
    name=== "#repos" || name === "#polls" || name === "#poll" ?
    seat({ class: ContentTitleView, id: "content-title" }) :
    ``
  }
  <div class="content-container">
    ${
      name === "#login" ?
      seat({ class: LoginView, id: "login" }) :
      name === "#repos" ?
      seat({ class: ReposView, model: this.model, id: "repos" }) :
      name === "#polls" ?
      seat({ class: PollsView, model: this.model.repo, id: "polls" }) :
      name === "#poll" ?
      seat({ class: PollView, model: this.model.poll, id: "poll" }) :
      ""
    }
  </div>
  ${seat({ class: ToolTipView, id: "tooltip"})}
</div>
`;
  }

});
