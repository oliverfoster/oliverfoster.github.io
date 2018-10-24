var NavigationView = View.extend({

  template: function() {
    var parts = upvote.router && upvote.router.hash.split("=") || [`#login`];
    var name = parts[0];
    var id = parts[1];
    var className = name.slice(1);
    return `
<div id="${this.id}" class="content-navigation">
  <img class="logo logo-light" src="${upvote.config.logo}">
  <ul>
    <li><a href="#repos">${upvote.config.title}</a></li>
  ${
    name==="#login" ?
    `<li>Login with GitHub</li>` :
    name==="#repos" ?
    `` :
    name==="#polls" ?
    `<li>Open polls</li>` :
    name==="#poll" ?
    `<li><a href="#polls">Open polls</a></li><li>Poll issues</li>` :
    ``
  }
  </ul>
  ${
    name!=="#login" ?
    `<button id="logout" onclick="upvote.logout();">Log out</button>` :
    ``
  }
</div>
`;
  }
});
