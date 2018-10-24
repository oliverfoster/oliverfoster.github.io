var ContentTitleView = View.extend({

  template: function() {
    var parts = upvote.router && upvote.router.hash.split("=") || [`#login`];
    var name = parts[0];
    var id = parts[1];
    var className = name.slice(1);
    return `
<div id="${this.id}" class="content-title">
  <div class="inner">
  ${
    name==="#repos" ?
    `<div class="location">
    </div>` :
    name==="#polls" || name==="#poll" ?
    `<div class="location">
      ${svg.repo}<a class="username" href="https://github.com/${upvote.model.repo.user_name}" target="_blank"> ${upvote.model.repo.user_name} </a> / <a class="repo" href="https://github.com/${upvote.model.repo.repo_name}/${upvote.model.repo.repo_name}" target="_blank"> ${upvote.model.repo.repo_name} </a>
    </div>` :
    ``
  }
  ${
    name === "#poll" ?
    seat({ class: ContentBodyView, id: "content-body" }) :
    ""
  }
  ${
    name==="#repos" ?
    `<div class="menu">
      <ul>
        <li class="selected">
          <a class="repos" href="#repos">
            <div class="selector"></div>
            <div class="text">
              ${svg.repo}Repositories
            </div>
          </a>
        </li>
      </ul>
    </div>`:
    name==="#polls"?
    `<div class="menu">
      <ul>
        <li>
          <a class="repos" href="#repos">
            <div class="selector"></div>
            <div class="text">
              ${svg.repo}Repositories
            </div>
          </a>
        </li>
        <li class="selected">
          <a class="polls" href="#polls">
            <div class="selector"></div>
            <div class="text">
              ${svg.insight}Open polls
            </div>
          </a>
        </li>
      </ul>
    </div>`:
    name==="#poll"?
    `<div class="menu">
      <ul>
        <li>
          <a class="repos" href="#repos">
            <div class="selector"></div>
            <div class="text">
              ${svg.repo}Repositories
            </div>
          </a>
        </li>
        <li>
          <a class="polls" href="#polls">
            <div class="text">
              ${svg.insight}Open polls
            </div>
          </a>
        </li>
        <li class="selected">
          <a class="polls" href="#polls">
            <div class="selector"></div>
            <div class="text">
              ${svg.insight}Poll issues
            </div>
          </a>
        </li>
      </ul>
    </div>`:
    ``
  }
  </div>
</div>
`;
  }

});
