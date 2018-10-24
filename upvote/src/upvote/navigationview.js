var NavigationView = View.extend({

  template: function() {
    var hash = upvote.router && upvote.router.hash || { login: true };
    return `
<div id="${this.id}" class="content-navigation">
  <img class="logo logo-light" src="${upvote.config.logo}">
  <ul>
    <li><a href="#repos">${upvote.config.title}</a></li>
  ${
    hash.login ?
    `<li>Login with GitHub</li>` :
    hash.repos ?
    `` :
    hash.polls ?
    `<li>Open polls</li>` :
    hash.poll ?
    `<li><a href="#polls&path=${upvote.model.repo.path}">Open polls</a></li><li>Poll issues</li>` :
    `404 Not found`
  }
  </ul>
  ${
    !hash.login ?
    `<button id="logout" onclick="upvote.logout();">Log out</button>` :
    ``
  }
</div>
`;
  }
});
