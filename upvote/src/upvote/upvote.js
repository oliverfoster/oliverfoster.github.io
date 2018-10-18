var converter = new showdown.Converter();

var Upvote = View.extend({

  id: "wrapper",

  router: null,
  octo: null,
  repo: null,
  user: null,
  acceptHeader: "application/vnd.github.mockingbird-preview, application/vnd.github.squirrel-girl-preview+json, application/vnd.github.echo-preview+json",
  user_name: "oliverfoster",
  repo_name: "adapt-process-recommendations",
  tag_name: "poll",
  // user_name: "adaptlearning",
  // repo_name: "adapt_framework",
  // tag_name: "enhancement",
  client_id: "ff5cf9bb34c83b06f2fb",

  initialize: function() {
    this.model = new QueuesModel();
    this.issues = {};
    this.router = new Router();
    this.listenTo(this.router, "change", this.onChange);

    if (this.router.cookie.oauth) {
      this.login({
        token :this.router.cookie.oauth
      });
      return;
    }

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

  login: function(options) {
    options.acceptHeader = upvote.acceptHeader;
    this.octo = new Octokat(options);
    this.octo.zen.read(function(err, value) {
      if (!err) return;
      document.cookie = `oauth=;path=/;max-age=31536000;samesite`;
      upvote.router.replace("#login");
    });
    this.repo = upvote.octo.repos(this.user_name, this.repo_name);
    this.octo.user.fetch().then(function(user) {
      this.user = user;
    }.bind(this));
    this.router.push("#queues");
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
      <li>Polls</li>
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
      <li><a href="#queues">Polls</a></li>
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
    this.queues = null;
    upvote.repo.issues.fetch({state:"open", labels: upvote.tag_name}).then(function(obj) {
      this.queues = new IssueCollection(obj.items);
      if (upvote.navigateTo) {
        upvote.router.replace(upvote.navigateTo);
        upvote.navigateTo = null;
      }
    }.bind(this));
  },

  fetchQueue: function() {
    this.queueItems = null;
    var rex = new RegExp(`https\:\/\/github\.com\/${upvote.user_name}\/`);
    upvote.repo.issues(this.queue.number).timeline.fetch().then(function(obj) {
      var events = obj.items.filter(function(item) {
        var isCrossReferencedIssue = (item.event === "cross-referenced" &&
          item.source.type === "issue");
        if (!isCrossReferencedIssue) return;
        var issue = item.source.issue;
        var isNativeToRepo = Boolean(issue.htmlUrl.match(rex));
        if (!isNativeToRepo) return;
        var hideFromPoll = issue.labels.find(function(label) {
          return label.name === "poll-hide";
        });
        if (hideFromPoll) return;
        return true;
      });
      var issues = events.map(function(event) { return event.source.issue; });
      this.queueItems =  new IssueCollection(issues);
      this.queueItems.update(function() {
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
  }

});

var IssueModel = Model.extend({

  constructor: function IssueModel() {
    return Model.apply(this, arguments);
  },

  fetchComments: function(callback) {
    var referenceIssueNumber = upvote.model.queue.number;
    var rex = new RegExp("(\\#"+referenceIssueNumber+"(\\W|$))|"+upvote.model.queue.htmlUrl);
    upvote.repo.issues(this.number).comments.fetch().then(function(obj) {
      this.commentItems = new CommentCollection(obj.items, { issueNumber: this.number });
      var done = 0;
      this.commentItems.forEach(function(comment) {
        comment.hasReference = (null !== comment.body.match(rex));
        if (comment.hasReference) {
          comment.references = comment.references || {};
          comment.references[upvote.model.queue.htmlUrl] = true;
        }
        comment.fetchReactions(function() {
          done++;
          if (this.commentItems.length !== done) return;
          callback(this);
        }.bind(this));
      }.bind(this));
    }.bind(this));
  },

  referenceComment$get: function() {
    var proxy = this.__proxy__;
    var parentIssueNumber = upvote.model.queue.number;
    var referenceComment;
    if (proxy.commentItems) {
      for (var i = proxy.commentItems.length-1; i > -1; i--) {
        if (!proxy.commentItems[i].hasReference) continue;
        referenceComment = proxy.commentItems[i];
        break;
      }
    }
    if (!referenceComment) {
      referenceComment = new CommentModel({
        body: "",
        reactions: {}
      }, {
        issueNumber: this.attributes.number
      });
    }
    return referenceComment;
  }

});

var IssueCollection = Collection.extend({

  constructor: function IssueCollection(data, options) {
    return Collection.call(this, data, {
      child: function(value) {
        if (value instanceof Array) return new IssueCollection(value, options);
        return new IssueModel(value, options);
      }
    });
  },

  update: function(callback) {
    var loaded = 0;
    this.forEach(function(issue) {
      issue.fetchComments(function(comments) {
        loaded++;
        if (loaded !== this.length) return;
        callback && callback();
      }.bind(this));
    }.bind(this));
  }

});


var CommentModel = Model.extend({

  constructor: function CommentModel(attributes, options) {
    attributes.issueNumber = options && options.issueNumber || attributes.issueNumber;
    return Model.apply(this, arguments);
  },

  update: function(callback) {
    upvote.repo.issues.comments(this.id).fetch().then(function(data) {
      for (var k in this.attributes) {
        if (!data[k]) continue;
        this[k] = data[k];
      }
      this.fetchReactions(function() {
        callback && callback();
      }.bind(this));
    }.bind(this));
  },

  toggleReaction: function(name, value, callback) {
    var complete = function() {
      this.update(callback);
    }.bind(this);
    if (value) {
      upvote.repo.issues.comments(this.id).reactions.create({
        content: name
      }).then(complete);
    } else {
      this.reactionItems.forEach(function(reaction) {
        if (reaction.content !== name) return;
        if (reaction.user.login !== upvote.user.login) return;
        upvote.octo.reactions(reaction.id).remove().then(complete);
      }.bind(this));
    }
  },

  toggleFlag: function(name, value, callback) {
    var rex = /\n\[\]\(file\:\/\/upvoter\.flag\?[^)]*\)/g;
    var matches = this.body.match(rex);
    var flags = {};
    if (matches) {
      this.body = this.body.replace(rex, "");
      var match = matches[0];
      var rawFlags = match.replace(/\n\[\]\(file\:\/\/upvoter\.flag\?/g, "").slice(0,-1);
      var rawPairs = rawFlags.split("&");
      rawPairs.forEach(function(rawPair) {
        var parts = rawPair.split("=");
        if (!parts[0]) return;
        flags[parts[0]] = true;
      });
    }
    if (!value) {
      delete flags[name];
    } else {
      flags[name] = true;
    }
    var rawFlags = [];
    for (var k in flags) {
      rawFlags.push(k + "=" + "1");
    }
    var pattern = "\n[](file://upvoter.flag?"+rawFlags.join("&")+")";
    this.body += pattern;
    upvote.repo.issues.comments(this.id).update({ body: this.body }).then(function() {
      callback && callback(flags);
    });
  },

  flags$get: function() {
    var rex = /\[\]\(file\:\/\/upvoter\.flag\?[^)]*\)/g;
    var matches = this.attributes.body.match(rex);
    var flags = {};
    if (matches) {
      var match = matches[0];
      var rawFlags = match.replace(/\[\]\(file\:\/\/upvoter\.flag\?/g, "").slice(0,-1);
      var rawPairs = rawFlags.split("&");
      rawPairs.forEach(function(rawPair) {
        var parts = rawPair.split("=");
        flags[parts[0]] = parts[1];
      });
    }
    return flags;
  },

  votedUsers: function(reactionName) {
    var users = [];
    this.reactionItems &&
    this.reactionItems.forEach(function(reaction) {
      if (reaction.content !== reactionName) return;
      if (!users.includes(reaction.user.login)) {
        users.push(reaction.user.login);
      }
    }.bind(this));
    return users;
  },

  hasVoted: function(reactionName) {
    return this.reactionItems &&
    this.reactionItems.find(function(reaction) {
      if (reaction.content !== reactionName) return;
      if (upvote.user.login !== reaction.user.login) return;
      return true;
    }.bind(this)) || false;
  },

  fetchReactions: function(callback) {
    upvote.repo.issues.comments(this.id).reactions.fetch().then(function(obj) {
      this.reactionItems = obj.items;
      callback && callback(this.reactionItems);
    }.bind(this));
  }

});

var CommentCollection = Collection.extend({

  constructor: function CommentCollection(data, options) {
    this.issueNumber = options.issueNumber || data.issueNumber;
    return Collection.call(this, data, {
      child: function(value) {
        if (value instanceof Array) return new Collection(value, options);
        return new CommentModel(value, options);
      }
    });
  }

});

var LoginView = View.extend({

  onClick: function() {
    upvote.login({
      username: elements("#username", this.el).value(),
      password: elements("#password", this.el).value()
    });
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
        Or try single sign-on through <a href="https://github.com/login/oauth/authorize?client_id=${upvote.client_id}&scope=public_repo,write:discussion">GitHub</a>?
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

  onLink: function(event) {
    event.stopPropagation();
  },

  onPublish: function(event) {
    event.stopPropagation();
  },

  template: function() {
    return `
<div view-container="true" id="${this.id}" class="queues-item tile" onclick="this.view.onClick(event);">
  <div class="inner">
    <div class="menubar">
      <div class="padding"></div>
      <button class="up menu-btn" onclick="this.view.onPublish(event);"> ${emoji['speech_balloon']} Publish</button>
    </div>
    <div class="content">
      <div class="header">
        <div class="text">
          <div class="title"><h1>${this.model.title}<a target="_blank" href="${this.model.htmlUrl}" onclick="this.view.onLink(event);"> <span class="issue-number">#${this.model.number}</span></h1></a></div>
          <div class="subtitle">
            <span class="state ${this.model.state}">${this.model.state === "closed" ? svg.closed + " Closed" : svg.open + " Open" }</span>
            <span class="avatar">
              <img src="${this.model.user.avatarUrl}" />
            </span>
            <span class="readline">${this.model.user.login} created this poll.</span>
          </div>
        </div>
      </div>
      <div class="body markdown">${converter.makeHtml(this.model.body)}</div>
      <div class="footer">
      </div>
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

  onUpVote: function() {
    var referenceComment = this.model.referenceComment;
    referenceComment &&
    referenceComment.toggleReaction("+1", !referenceComment.hasVoted("+1"), function() {
      this.render();
    }.bind(this));
  },

  onDownVote: function() {
    var referenceComment = this.model.referenceComment;
    referenceComment &&
    referenceComment.toggleReaction("-1", !referenceComment.hasVoted("-1"), function() {
      this.render();
    }.bind(this));
  },

  onInclude: function() {
    var referenceComment = this.model.referenceComment;
    referenceComment &&
    referenceComment.toggleFlag("accept", !this.model.referenceComment.flags.accept, function() {
      this.model.fetchComments(function() {
        this.render();
      }.bind(this));
    }.bind(this));

  },

  template: function() {
    return `
<div view-container="true" id="${this.id}" class="queue-item tile">
  <div class="inner">
    <div class="menubar">
      <div class="padding"></div>
      <button class="up menu-btn ${this.model.referenceComment.hasVoted("+1")?"voted":""}" onclick="this.view.onUpVote(event);"> ${emoji['+1']} ${or(this.model.referenceComment.reactions['+1'], 0)}</button>
      <button class="down menu-btn ${this.model.referenceComment.hasVoted("-1")?"voted":""}" onclick="this.view.onDownVote(event);"> ${emoji['-1']} ${or(this.model.referenceComment.reactions['1'], 0)}</button>
      <button class="include menu-btn emoji" onclick="this.view.onInclude(event);"> ${this.model.referenceComment.flags.accept?emoji['heavy_check_mark']:emoji['x']}${this.model.referenceComment.flags.accept?" Accepted":" Not accepted"}</button>
    </div>
    <div class="content">
      <div class="header">
        <div class="text">
          <div class="title"><h1>${this.model.title} <a href="${this.model.referenceComment.htmlUrl}" target="_blank"><span class="issue-number">#${this.model.number}</span></a></h1></div>
          <div class="subtitle">
            <span class="state ${this.model.state}">${this.model.state === "closed" ? svg.closed + " Closed" : svg.open + " Open" }</span>
            <span class="avatar">
              <img src="${this.model.user.avatarUrl}" />
            </span>
            <span class="readline">${this.model.user.login} created this issue. </span>
          </div>
        </div>
      </div>
      <div class="body markdown">${converter.makeHtml(this.model.body)}</div>
      <div class="footer">
        <!--
        <div class="up">
          <div class="voters">
            ${each(this.model.referenceComment.upVotedUsers, (name)=>{
              return '<div class="username">'+name+'</div>';
            })}
          </div>
        </div>
        <div class="down">
          <div class="voters">
            ${each(this.model.referenceComment.downVotedUsers, (name)=>{
              return '<div class="username">'+name+'</div>';
            })}
          </div>
        </div>
        --!>
      </div>
    </div>
  </div>
</div>
`;
  }

});
