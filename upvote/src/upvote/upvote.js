var converter = new showdown.Converter();

var Upvote = Class.extend({

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

  constructor: function Upvote(options) {
    this.model = new PollsModel();
    this.router = new Router();
    this.wrapper = new WrapperView({
      el: options.el,
      model: this.model
    });

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
      if (this.navigateTo === "#login") this.navigateTo = "";
      this.router.replace("#login");
      return;
    }
    if (name === "#poll") {
      if (!id) {
        this.router.replace("#poll="+this.model.poll.number);
        return;
      }
      if (!this.model.poll && id || this.model.poll.number !== id) {
        this.model.poll = this.model.polls.find(function(poll) {
          return poll.number == id;
        });
      }
    }
    this.wrapper.render();
  },

  login: function(options) {
    options.acceptHeader = this.acceptHeader;
    this.octo = new Octokat(options);
    this.octo.zen.read(function(err, value) {
      if (!err) return;
      this.logout();
    }.bind(this));
    this.repo = this.octo.repos(this.user_name, this.repo_name);
    this.octo.user.fetch().then(function(user) {
      this.user = user;
    }.bind(this));
    this.navigateTo = this.router.startHash;
    if (this.navigateTo === "#login") this.navigateTo = "";
    this.router.replace("#polls");
  },

  logout: function() {
    document.cookie = `oauth=;path=/;max-age=31536000;samesite`;
    this.octo = null;
    this.router.replace("#login");
  }

}, null, {
  instanceEvents: true
});

var PollsModel = Model.extend({

  constructor: function PollsModel() {
    return Model.apply(this, arguments);
  },

  fetchPolls: function() {
    this.polls = null;
    upvote.repo.issues.fetch({state:"open", labels: upvote.tag_name}).then(function(obj) {
      this.polls = new IssueCollection(obj.items);
      if (upvote.navigateTo) {
        upvote.router.replace(upvote.navigateTo);
        upvote.navigateTo = null;
      }
    }.bind(this));
  }

});

var IssueCollection = Collection.extend({

  constructor: function IssueCollection(data, options) {
    this.parentIssue = options && options.parentIssue;
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
      issue.fetchReferencingComments(function(comments) {
        loaded++;
        if (loaded !== this.length) return;
        callback && callback();
      }.bind(this));
    }.bind(this));
  },

  order: function() {
    this.sort(function(a,b) {
      var aRef = a.referenceComment;
      var bRef = b.referenceComment;
      if (!aRef) return -1;
      if (!bRef) return 1;
      var positiveDifference = (bRef.reactions['+1'] - bRef.reactions['1']) -
        (aRef.reactions['+1'] - aRef.reactions['1']);
      if (!positiveDifference) {
        var totalDifference = (bRef.reactions['+1'] + bRef.reactions['1']) -
          (aRef.reactions['+1'] + aRef.reactions['1']);
        return totalDifference;
      }
      return positiveDifference;
    });
    return this;
  }

});

var IssueModel = Model.extend({

  constructor: function IssueModel(value, options) {
    this.parentIssue = options && options.parentIssue;
    return Model.apply(this, arguments);
  },

  fetchReferencingComments: function(callback) {
    var rex = new RegExp("(\\#"+this.parentIssue.number+"(\\W|$))|"+this.parentIssue.htmlUrl);
    upvote.repo.issues(this.number).comments.fetch().then(function(obj) {
      this.referenceCommentItems = new CommentCollection(obj.items, { issueNumber: this.number });
      var done = 0;
      this.referenceCommentItems.forEach(function(comment) {
        comment.hasReference = (null !== comment.body.match(rex));
        if (comment.hasReference) {
          comment.references = comment.references || {};
          comment.references[this.parentIssue.htmlUrl] = true;
        }
        comment.fetchReactions(function() {
          done++;
          if (this.referenceCommentItems.length !== done) return;
          callback(this);
        }.bind(this));
      }.bind(this));
    }.bind(this));
  },

  referenceComment$get: function() {
    var proxy = this.__proxy__;
    var referenceComment;
    if (proxy.referenceCommentItems) {
      for (var i = proxy.referenceCommentItems.length-1; i > -1; i--) {
        if (!proxy.referenceCommentItems[i].hasReference) continue;
        referenceComment = proxy.referenceCommentItems[i];
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
  },

  fetchComments: function(callback) {
    upvote.repo.issues(this.number).comments.fetch().then(function(obj) {
      this.commentItems = new CommentCollection(obj.items, { issueNumber: this.number });
      callback && callback();
    }.bind(this));
  },

  publish: function() {
    this.fetchPollIssues(function() {

      var table = [["Issue #", "Issue title", "Positive votes", "+1", "-1"]];
      this.pollIssues.order().filter(function(pollIssue) {
        if (pollIssue.state !== "open") return;
        if (!pollIssue.referenceComment) return;
        if (!pollIssue.referenceComment.flags.accept) return;
        return true;
      }).forEach(function(issue) {
        var comment = issue.referenceComment;
        table.push([
          `[#${issue.number}](${comment.htmlUrl})`,
          `[${issue.title}](${comment.htmlUrl})`,
          (comment.reactions['+1'] - comment.reactions['1']),
          comment.reactions['+1'],
          comment.reactions['1']
        ]);
      });

      var markdown = `### Poll Results - ${this.title}\n\n`;
      table.forEach(function(row, index) {
        var rowString = "| " + row.join(" | ") + " |\n";
        if (index !== 0) return markdown += rowString;
        rowString += "| " + (new Array(row.length)).join("----|----") + " |\n";
        return markdown += rowString;
      });

      this.fetchComments(function() {
        var resultsComments = this.commentItems.filter(function(comment) {
          return comment.flags['results'];
        }).reverse();

        if (resultsComments.length) {
          upvote.repo.issues.comments(resultsComments[0].id).update({
            body: markdown + "\n[](file://upvoter.flag?results=1)\n"
          }).then(function() {
            window.open(this.htmlUrl);
          }.bind(this));
          return;
        }

        upvote.repo.issues(this.number).comments.create({
          body: markdown + "\n[](file://upvoter.flag?results=1)\n"
        }).then(function() {
          window.open(this.htmlUrl);
        }.bind(this));

      }.bind(this));

    }.bind(this));
  },

  fetchPollIssues: function(callback) {
    this.pollIssues = null;
    var rex = new RegExp(`https\:\/\/github\.com\/${upvote.user_name}\/`);
    upvote.repo.issues(this.number).timeline.fetch().then(function(obj) {
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
      this.pollIssues =  new IssueCollection(issues, {
        parentIssue: this
      });
      this.pollIssues.update(function() {
        this.pollIssues.order();
        callback && callback();
      }.bind(this));
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

var WrapperView = View.extend({

  id: "wrapper",

  template: function() {
    var parts = upvote.router.hash.split("=");
    var name = parts[0];
    var id = parts[1];
    var className = name.slice(1);
    return `
<div id="${this.id}" class="${className}">
  ${seat({ class: NavigationView, id: "content-navigation" })}
  ${seat({ class: ContentTitleView, id: "content-title" })}
  ${
    name === "#poll" ?
    seat({ class: ContentBodyView, id: "content-body" }) :
    ""
  }
  <div class="content-container">
    ${
      name === "#login" ?
      seat({ class: LoginView, id: "login" }) :
      name === "#polls" ?
      seat({ class: PollsView, model: this.model, id: "polls" }) :
      name === "#poll" ?
      seat({ class: PollView, model: this.model.poll, id: "poll" }) :
      ""
    }
  </div>
</div>
`;
  }

});

var NavigationView = View.extend({

  template: function() {
    var parts = upvote.router && upvote.router.hash.split("=") || [`#login`];
    var name = parts[0];
    var id = parts[1];
    var className = name.slice(1);
    return `
<div id="${this.id}" class="content-navigation">
  <img class="logo logo-light" alt="Adapt Learning" src="https://www.adaptlearning.org/wp-content/uploads/2016/01/nav_logo_white-alt-2-1.png">
  <ul>
    <li>Upvoter:</li>
  ${
    name==="#login" ?
    `<li>Login with GitHub</li>` :
    name==="#polls" ?
    `<li>Polls</li>` :
    name==="#poll" ?
    `<li><a href="#polls">Polls</a></li><li>Issues</li>` :
    ``
  }
  </ul>
  ${
    name!=="#login" ?
    `<button id="logout" onclick="upvote.logout();">Logout</button>` :
    ``
  }
</div>
`;
  }
});

var ContentTitleView = View.extend({

  template: function() {
    var parts = upvote.router && upvote.router.hash.split("=") || [`#login`];
    var name = parts[0];
    var id = parts[1];
    var className = name.slice(1);
    return `
<div id="${this.id}" class="content-title">
  <div class="inner">
    <div>
      ${svg.repo}<a class="username" href="https://github.com/${upvote.user_name}" target="_blank"> ${upvote.user_name} </a> / <a class="repo" href="https://github.com/${upvote.user_name}/${upvote.repo_name}" target="_blank"> ${upvote.repo_name} </a>
    </div>
  ${
    name==="#polls"?
    `<div>
      ${svg.insight}<a class="polls" href="#polls">polls</a>
    </div>`:
    name==="#poll"?
    `<div>
      <span>
        ${svg.insight}<a class="polls" href="#polls">polls</a> / <a class="poll" href="#poll=${upvote.model.poll.number}">${upvote.model.poll.title}</a>
      </span>
      <a class="poll" href="${upvote.model.poll.htmlUrl}" target="_blank"><span class="issue-number">#${upvote.model.poll.number}</span></a>
    </div>`:
    ``
  }
  </div>
</div>
`;
  }

});

var ContentBodyView = View.extend({

  template: function() {
    var parts = upvote.router.hash.split("=");
    var name = parts[0];
    var id = parts[1];
    switch (name) {
      case "#login":
        return ``;
      case "#polls":
        return ``;
      case "#poll":
        return `
<div id="${this.id}" class="content-body">
  <div class="inner markdown">
    ${converter.makeHtml(upvote.model.poll.body)}
  </div>
</div>
`;
    }
  }

});

var PollsView = View.extend({

  attach: function() {
    this.clear();
    this.model.fetchPolls();
  },

  template: function() {
    return `
<div id="${this.id}" class="content-outer">
  ${each(this.model.polls, (item, index)=>{
    return seat({ class: PollsItemView, model: item, id: "item-"+index });
  }, (items)=>{
    if (!items) {
      return '<div class="loading">Loading...</div>';
    }
    return '<div class="empty">No polls found.</div>';
  })}
</div>
`;
  }

});

var PollsItemView = View.extend({

  onClick: function(event) {
    upvote.model.poll = this.model;
    upvote.router.push("#poll");
  },

  onLink: function(event) {
    event.stopPropagation();
  },

  onPublish: function(event) {
    event.stopPropagation();
    this.model.publish();
  },

  template: function() {
    return `
<div id="${this.id}" class="polls-item tile" onclick="this.view.onClick(event);">
  <div class="inner">
    <div class="menubar">
      <div class="padding"></div>
      <button class="publish menu-btn" onclick="this.view.onPublish(event);"> ${emoji['speech_balloon']} Publish</button>
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


var PollView = View.extend({

  attach: function() {
    this.clear();
    this.model.fetchPollIssues(function() {
      this.render();
    }.bind(this));
  },

  template: function() {
    return `
<div id="${this.id}" class="content-outer">
  ${each(this.model.pollIssues, (item, index)=>{
     return seat({ class: PollItemView, model: item, id: "item-"+index });
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

var PollItemView = View.extend({

  attach: function() {
    this.model.parentIssue = upvote.model.poll;
  },

  onUpVote: function() {
    var referenceComment = this.model.referenceComment;
    referenceComment &&
    referenceComment.toggleReaction("+1", !referenceComment.hasVoted("+1"), function() {
      upvote.model.poll.pollIssues.order();
      this.render();
    }.bind(this));
  },

  onDownVote: function() {
    var referenceComment = this.model.referenceComment;
    referenceComment &&
    referenceComment.toggleReaction("-1", !referenceComment.hasVoted("-1"), function() {
      upvote.model.poll.pollIssues.order();
      this.render();
    }.bind(this));
  },

  onInclude: function() {
    var referenceComment = this.model.referenceComment;
    referenceComment &&
    referenceComment.toggleFlag("accept", !this.model.referenceComment.flags.accept, function() {
      this.model.fetchReferencingComments(function() {
        this.render();
      }.bind(this));
    }.bind(this));

  },

  template: function() {
    return `
<div id="${this.id}" class="poll-item tile">
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
