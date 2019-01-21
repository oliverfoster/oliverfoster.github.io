var LoginView = View.extend({

  attach: function() {
    this.clear();
  },

  onClick: function() {
    upvote.login({
      username: elements("#username", this.el).value(),
      password: elements("#password", this.el).value()
    });
  },

  template: function() {
    return `
<div id="${this.id}" class="content-outer">
  <div class="login">
    <div class="inner">
      <div class="username">
        <label>Username (not email address)</label>
        <input id="username" autocomplete="current-username" type="text" onchange="this.view.model.username = this.value" />
      </div>
      <div class="password">
        <label>Password</label>
        <input id="password" autocomplete="current-password" type="password" onchange="this.view.model.password = this.value" />
      </div>
      <button class="btn" onclick="this.view.onClick();">Log in</button>
      <div class="sso">
        <div class="inner">
        Or try single sign-on through <a href="https://github.com/login/oauth/authorize?client_id=${upvote.config.client_id}&scope=public_repo,write:discussion">GitHub</a>?
        </div>
      </div>
    </div>
  </div>
</div>
`;
  }

});
