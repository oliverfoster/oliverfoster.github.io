var converter = new showdown.Converter();

var Upvote = View.extend({

  id: "wrapper",

  router: null,
  octo: null,
  user: "oliverfoster",
  repo: "adapt-process-recommendations",
  tag: "upvote",
  // user: "adaptlearning",
  // repo: "adapt_framework",
  // tag: "enhancement",
  client_id: "ff5cf9bb34c83b06f2fb",

  initialize: function() {
    this.model = new QueuesModel();
    this.issues = {};
    this.router = new Router();
    this.listenTo(this.router, "change", this.onChange);
    this.onChange(this.router.hash);
  },

  onChange: function(hash) {
    if (!this.octo && this.router.hasSearch) {
      var search = this.router.search;
      if (search.code) {
        document.body.style.display = "none";
        getUrl(`https://adapt-upvote.herokuapp.com/authenticate/${search.code}`, function(data) {
          data = JSON.parse(data);
          document.cookie = `oauth=${data.token};path=/;max-age=31536000;samesite`;
          location.href = location.href.slice(0, location.href.indexOf("?"));
        });
        return;
      }
      return;
    }
    var parts = hash.split("=");
    var name = parts[0];
    var id = parts[1];
    if (!this.octo && hash !== "#login") {
      this.navigateTo = this.router.startHash;
      this.router.push("#login");
      return;
    }
    if (name === "#queue") {
      if (!id) {
        this.router.replace("#queue="+this.model.queue.number);
        return;
      }
      if (!this.model.queue && id || this.model.queue.number !== id) {
        this.model.queue = this.model.queues.find(function(queue) {
          return queue.number == id;
        });
      }
    }
    this.render();
  },

  onBack: function(event) {
    this.router.push("#queues");
  },

  template: function() {
    var parts = this.router.hash.split("=");
    var name = parts[0];
    var id = parts[1];
    switch (name) {
      case "#login":
        return `
<div view-container="true" id="${this.id}" class="login">
  <div class="content-navigation">
    <img class="logo logo-light" alt="Adapt Learning" src="https://www.adaptlearning.org/wp-content/uploads/2016/01/nav_logo_white-alt-2-1.png">
    <ul>
      <li>Upvoter:</li>
      <li>Login with GitHub</li>
    </ul>
  </div>
  <div class="content-container">
    ${seat({ class: LoginView, id: "login" })}
  </div>
</div>
`;
      case "#queues":
        return `
<div view-container="true" id="${this.id}" class="queues">
  <div class="content-navigation">
    <img class="logo logo-light" alt="Adapt Learning" src="https://www.adaptlearning.org/wp-content/uploads/2016/01/nav_logo_white-alt-2-1.png">
    <ul>
      <li>Upvoter:</li>
      <li>Votes</li>
    </ul>
  </div>
  <div class="content-container">
    ${seat({ class: UpvoteQueuesView, model: this.model, id: "queues" })}
  </div>
</div>
`;
      case "#queue":
        return `
<div view-container="true" id="${this.id}" class="queue">
  <div class="content-navigation">
    <img class="logo logo-light" alt="Adapt Learning" src="https://www.adaptlearning.org/wp-content/uploads/2016/01/nav_logo_white-alt-2-1.png">
    <ul>
      <li>Upvoter:</li>
      <li><a href="#queues">Votes</a></li>
      <li>Issues</li>
    </ul>
  </div>
  <div class="content-title">
    <div class="inner">
      <a href="${this.model.queue.htmlUrl}" target="_blank">${this.model.queue.title} <span class="issue-number">#${this.model.queue.number}</span></a>
    </div>
  </div>
  <div class="content-body">
    <div class="inner markdown">
      ${converter.makeHtml(this.model.queue.body)}
    </div>
  </div>
  <div class="content-container">
    ${seat({ class: UpvoteQueueView, model: this.model, id: "queue" })}
  </div>
</div>
`;
    }
  }

});

var QueuesModel = Model.extend({

  constructor: function QueuesModel() {
    return Model.apply(this, arguments);
  },

  fetchQueues: function() {
    upvote.issues = upvote.issues || {};
    this.queues = null;
    upvote.octo.repos(upvote.user, upvote.repo).issues.fetch({state:"open", labels: upvote.tag}).then(function(obj) {
      this.queues = obj.items.map(function(issue) {
        upvote.issues[issue.number] = upvote.issues[issue.number] || {};
        upvote.issues[issue.number].number = issue.number;
        upvote.issues[issue.number].title = issue.title;
        upvote.issues[issue.number].body = issue.body;
        upvote.issues[issue.number].htmlUrl = issue.htmlUrl;
        upvote.issues[issue.number].referenceComment = upvote.issues[issue.number].referenceComment || {
          upVotes: 0,
          downVotes: 0,
          positiveVotes: 0,
          totalVotes: 0,
          upVotedUsers: {},
          downVotedUsers: {},
          htmlUrl: ""
        };
        return upvote.issues[issue.number];
      }.bind(this));
      if (upvote.navigateTo) {
        upvote.router.replace(upvote.navigateTo);
        upvote.navigateTo = null;
      }
    }.bind(this));
  },

  fetchQueue: function() {
    this.queueItems = null;
    upvote.octo.repos(upvote.user, upvote.repo).issues(this.queue.number).timeline.fetch().then(function(obj) {
      var issues = obj.items.filter(function(item) {
        return item.event === "cross-referenced" &&
          item.source.type === "issue";
      });
      this.queueItems = issues.map(function(item) {
        var issue = item.source.issue;
        upvote.issues[issue.number] = upvote.issues[issue.number] || {};
        upvote.issues[issue.number].number = issue.number;
        upvote.issues[issue.number].title = issue.title;
        upvote.issues[issue.number].body = issue.body;
        upvote.issues[issue.number].htmlUrl = issue.htmlUrl;
        upvote.issues[issue.number].referenceComment = upvote.issues[issue.number].referenceComment || {
          upVotes: 0,
          downVotes: 0,
          positiveVotes: 0,
          totalVotes: 0,
          upVotedUsers: [],
          downVotedUsers: [],
          htmlUrl: ""
        };
        return upvote.issues[issue.number];
      }.bind(this));
      this.fetchQueueItems();
    }.bind(this));
  },

  fetchQueueItems: function() {
    var parentIssueNumber = upvote.model.queue.number;
    var parentIssueNumber = this.queue.number;
    var updated = 0;
    this.queueItems.forEach(function(issue) {
      this.calculateReferenceComment(parentIssueNumber, issue);
      this.fetchReferencedComments(parentIssueNumber, issue.number, function() {
        updated++;
        this.calculateReferenceComment(parentIssueNumber, issue);
        if (updated !== this.queueItems.length) return;
        this.queueItems.sort(function(a,b) {
          var aRef = a.referenceComment;
          var bRef = b.referenceComment;
          if (!aRef) return -1;
          if (!bRef) return 1;
          var positiveDifference = bRef.positiveVotes - aRef.positiveVotes;
          if (!positiveDifference) {
            return bRef.totalVotes - aRef.totalVotes;
          }
          return positiveDifference;
        });
      }.bind(this));
    }.bind(this));
  },

  calculateReferenceComment: function(parentIssueNumber, issue) {
    issue.referenceComment.upVotes = 0;
    issue.referenceComment.downVotes = 0;
    issue.referenceComment.positiveVotes = 0;
    issue.referenceComment.totalVotes = 0;
    issue.referenceComment.upVotedUsers = [];
    issue.referenceComment.downVotedUsers = [];
    var referenceComment = issue &&
      issue.referenceComments &&
      issue.referenceComments[parentIssueNumber] &&
      issue.referenceComments[parentIssueNumber][issue.referenceComments[parentIssueNumber].length-1];
    referenceComment && referenceComment.reactions.forEach(function(reaction) {
      switch (reaction.content) {
        case "+1":
          issue.referenceComment.upVotes++;
          if (!issue.referenceComment.upVotedUsers.includes(reaction.user.login)) {
            issue.referenceComment.upVotedUsers.push(reaction.user.login);
          }
          break;
        case "-1":
          issue.referenceComment.downVotes++;
          if (!issue.referenceComment.upVotedUsers.includes(reaction.user.login)) {
            issue.referenceComment.downVotedUsers.push(reaction.user.login);
          }
          break;
      }
    });
    issue.referenceComment.positiveVotes = issue.referenceComment.upVotes - issue.referenceComment.downVotes;
    issue.referenceComment.totalVotes = issue.referenceComment.upVotes + issue.referenceComment.downVotes;
    issue.referenceComment.htmlUrl = referenceComment && referenceComment.htmlUrl || "";
  },

  fetchReferencedComments: function(parentIssueNumber, issueNumber, callback) {
    var referenceIssueNumber = upvote.model.queue.number;
    var rex = new RegExp("(\\#"+referenceIssueNumber+"(\\W|$))|"+upvote.model.queue.htmlUrl);
    upvote.octo.repos(upvote.user, upvote.repo).issues(issueNumber).comments.fetch().then(function(obj) {
      upvote.issues[issueNumber].comments = obj.items;
      var count = 0, done = 0;
      var referenceComments = obj.items.filter(function(comment) {
        var hasReference = (null !== comment.body.match(rex));
        if (hasReference) {
          comment.references = comment.references || {};
          comment.references[upvote.model.queue.htmlUrl] = true;
        }
        count++;
        this.fetchReferencedCommentReactions(issueNumber, comment.id, function(reactions) {
          comment.reactions = reactions;
          done++;
          if (count !== done) return;
          callback(upvote.issues[issueNumber]);
        });
        return hasReference;
      }.bind(this));
      upvote.issues[issueNumber].referenceComments = upvote.issues[issueNumber].referenceComments || {};
      upvote.issues[issueNumber].referenceComments[parentIssueNumber] = referenceComments;
    }.bind(this));
  },

  fetchReferencedCommentReactions: function(issueNumber, commentId, callback) {
    upvote.octo.repos(upvote.user, upvote.repo).issues.comments(commentId).reactions.fetch().then(function(obj) {
      var comment = upvote.issues[issueNumber].comments.find(function(comment) {
        return comment.id === commentId;
      });
      comment.reactions = obj.items;
      callback(comment.reactions);
    }.bind(this));
  }

});

var LoginView = View.extend({

  onClick: function() {
    upvote.octo = new Octokat({
      username: this.model.username,
      password: this.model.password,
      acceptHeader: 'application/vnd.github.mockingbird-preview, application/vnd.github.squirrel-girl-preview+json'
    });
    upvote.router.push("#queues");
  },

  attach: function() {
    if (upvote.router.cookie.oauth) {
      upvote.octo = new Octokat({
        token: upvote.router.cookie.oauth,
        acceptHeader: 'application/vnd.github.mockingbird-preview, application/vnd.github.squirrel-girl-preview+json'
      });
      upvote.router.push("#queues");
    }
  },

  template: function() {
    return `
<div view-container="true" id="${this.id}">
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
      <button class="btn" onclick="this.view.onClick();">Login</button>
      <div class="sso">
        <div class="inner">
        Or try single sign-on through <a href="https://github.com/login/oauth/authorize?client_id=${upvote.client_id}&scope=public_repo">GitHub</a>?
        </div>
      </div>
    </div>
  </div>
</div>
`;
  }

});

var UpvoteQueuesView = View.extend({

  attach: function() {
    this.el.innerHTML = "";
    this.model.fetchQueues();
  },

  template: function() {
    return `
<div view-container="true" id="${this.id}">
  ${each(this.model.queues, (item, index)=>{
    return seat({ class: UpvoteQueuesItemView, model: item, id: "item-"+index });
  }, (items)=>{
    if (!items) {
      return '<div class="loading">Loading...</div>';
    }
    return '<div class="empty">No queues found.</div>';
  })}
</div>
`;
  }

});

var UpvoteQueuesItemView = View.extend({

  onClick: function(event) {
    upvote.model.queue = this.model;
    upvote.router.push("#queue");
  },

  template: function() {
    return `
<div view-container="true" id="${this.id}" class="queues-item tile" onclick="this.view.onClick(event);">
  <div class="inner">
    <div class="menubar">
    </div>
    <div class="content">
      <div class="title"><h1><a href="${this.model.htmlUrl}">${this.model.title}</a> <span class="issue-number">#${this.model.number}</span></h1></div>
      <div class="body markdown">${converter.makeHtml(this.model.body)}</div>
    </div>
  </div>
</div>
`;
  }

});


var UpvoteQueueView = View.extend({

  attach: function() {
    this.el.innerHTML = "";
    this.model.fetchQueue();
  },

  template: function() {
    return `
<div view-container="true" id="${this.id}">
  ${each(this.model.queueItems, (item, index)=>{
     return seat({ class: UpvoteQueueItemView, model: item, id: "item-"+index });
  }, (items)=>{
    if (!items) {
      return '<div class="loading">Loading...</div>';
    }
    return '<div class="empty">No referenced issues found.</div>';
  })}
</div>
`;
  }

});

var UpvoteQueueItemView = View.extend({

  template: function() {
    return `
<div view-container="true" id="${this.id}" class="queue-item tile">
  <div class="inner">
    <div class="menubar">
      <button class="up" onclick="this.view.onUp(event);">Up</button>
      <button class="down" onclick="this.view.onDown(event);">Down</button>
      <button class="include" onclick="this.view.onInclude(event);">Include</button>
      <button class="exclude" onclick="this.view.onExclude(event);">Exclude</button>
    </div>
    <div class="content">
      <div class="title"><h1><a href="${this.model.referenceComment.htmlUrl}" target="_blank">${this.model.title} <span class="issue-number">#${this.model.number}</span></a></h1></div>
      <div class="body markdown">${converter.makeHtml(this.model.body)}</div>
      <div class="votes">
        <div class="up">
          <div class="text">up votes: ${this.model.referenceComment.upVotes}</div>
          <div class="voters">
            ${each(this.model.referenceComment.upVotedUsers, (name)=>{
              return '<div class="username">'+name+'</div>';
            })}
          </div>
        </div>
        <div class="down">
          <div class="text">down votes: ${this.model.referenceComment.downVotes}</div>
          <div class="voters">
            ${each(this.model.referenceComment.downVotedUsers, (name)=>{
              return '<div class="username">'+name+'</div>';
            })}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
`;
  }

});
