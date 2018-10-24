var ContentTitleView = View.extend({

  template: function() {
    var hash = upvote.router && upvote.router.hash || { login: true };
    return `
<div id="${this.id}" class="content-title">
  <div class="inner">
  ${
    hash.repos ?
    `<div class="location">
    </div>` :
    hash.polls || hash.poll ?
    `<div class="location">
      ${svg.repo}<a class="username" href="https://github.com/${upvote.model.repo.user_name}" target="_blank"> ${upvote.model.repo.user_name} </a> / <a class="repo" href="https://github.com/${upvote.model.repo.repo_name}/${upvote.model.repo.repo_name}" target="_blank"> ${upvote.model.repo.repo_name} </a>
    </div>` :
    ``
  }
  ${
    hash.poll ?
    seat({ class: ContentBodyView, id: "content-body" }) :
    ""
  }
  ${
    hash.repos ?
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
    hash.polls ?
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
          <a class="polls" href="#polls&path=${upvote.model.repo.path}">
            <div class="selector"></div>
            <div class="text">
              ${svg.insight}Open polls
            </div>
          </a>
        </li>
      </ul>
    </div>`:
    hash.poll ?
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
          <a class="polls" href="#polls&path=${upvote.model.repo.path}">
            <div class="text">
              ${svg.insight}Open polls
            </div>
          </a>
        </li>
        <li class="selected">
          <a class="polls" href="#poll&path=${upvote.model.repo.path}&number=${upvote.model.poll.number}">
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
