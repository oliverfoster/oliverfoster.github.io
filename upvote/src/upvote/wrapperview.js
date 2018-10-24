var WrapperView = View.extend({

  id: "wrapper",

  initialize: function() {},

  template: function() {
    var hash = upvote.router.hash;
    var className = hash[0];
    return `
<div id="${this.id}" class="${className}">
  ${seat({ class: NavigationView, id: "content-navigation" })}
  ${
    hash.repos || hash.polls || hash.poll ?
    seat({ class: ContentTitleView, id: "content-title" }) :
    ``
  }
  <div class="content-container">
    ${
      hash.login ?
      seat({ class: LoginView, id: "login" }) :
      hash.repos ?
      seat({ class: ReposView, model: this.model, id: "repos" }) :
      hash.polls ?
      seat({ class: PollsView, model: this.model.repo, id: "polls" }) :
      hash.poll ?
      seat({ class: PollView, model: this.model.poll, id: "poll" }) :
      ""
    }
  </div>
  ${seat({ class: ToolTipView, id: "tooltip"})}
  ${seat({ class: FooterView, id: "footer"})}
</div>
`;
  }

});
