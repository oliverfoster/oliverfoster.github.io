var IssueModel = Model.extend({

  constructor: function IssueModel(value, options) {
    this.parentIssue = options && options.parentIssue;
    return Model.apply(this, arguments);
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
        flags[parts[0]] = parts[1];
      });
    }
    if (!value) {
      delete flags[name];
    } else {
      flags[name] = value;
    }
    var rawFlags = [];
    for (var k in flags) {
      rawFlags.push(k + "=" + flags[k]);
    }
    var pattern = "\n[](file://upvoter.flag?"+rawFlags.join("&")+")";
    this.body += pattern;
    upvote.model.repo.issues(this.number).update({ body: this.body }).then(function() {
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

  fetchReferencingComments: function(callback) {
    var rex = new RegExp("(\\#"+this.parentIssue.number+"(\\W|$))|"+this.parentIssue.htmlUrl);
    upvote.model.repo.issues(this.number).comments.fetch().then(function(obj) {
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
    upvote.model.repo.issues(this.number).comments.fetch().then(function(obj) {
      this.commentItems = new CommentCollection(obj.items, { issueNumber: this.number });
      callback && callback();
    }.bind(this));
  },

  publish: function(callback) {
    this.fetchPollIssues(function() {

      var table = [
        ["Issue", "Title", "Votes", "+1", "-1"],
        [":----", ":----", ":----:", ":----:", ":----:"]
      ];
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
        return markdown += rowString;
      });

      this.fetchComments(function() {
        var resultsComments = this.commentItems.filter(function(comment) {
          return comment.flags['results'];
        }).reverse();

        if (resultsComments.length) {
          upvote.model.repo.issues.comments(resultsComments[0].id).update({
            body: markdown + "\n[](file://upvoter.flag?results=1)\n"
          }).then(function() {
            callback && callback(resultsComments[0]);
          }.bind(this));
          return;
        }

        upvote.model.repo.issues(this.number).comments.create({
          body: markdown + "\n[](file://upvoter.flag?results=1)\n"
        }).then(function(obj) {
          callback && callback(obj);
        }.bind(this));

      }.bind(this));

    }.bind(this));
  },

  milestone: function(callback) {
    var existingMilestoneNumber = parseInt(this.flags.milestone) || -1;
    var complete = function(milestone) {
      this.toggleFlag("milestone", milestone.number, function() {
          this.attachPollIssuesToMilestone(milestone, callback);
      }.bind(this));
    }.bind(this);
    upvote.model.fetchMilestones(function() {
      var milestone = upvote.model.milestones && (upvote.model.milestones.find(function(milestone) {
        return milestone.number === existingMilestoneNumber;
      }.bind(this)) || upvote.model.milestones.find(function(milestone) {
        return milestone.title === this.title;
      }.bind(this)));
      if (!milestone) {
        upvote.model.createMilestone({
          title: this.title,
          description: `Create from poll: ${this.title} #${this.number}`
        }, function(milestone) {
          complete(milestone);
        });
        return;
      }
      complete(milestone);
    }.bind(this));
  },

  attachPollIssuesToMilestone: function(milestone, callback) {
    var count = 0;
    var done = function() {
      count++;
      if (count !== this.pollIssues.length) return;
      callback && callback(milestone);
    }.bind(this);
    this.fetchPollIssues(function() {
      this.pollIssues.forEach(function(issue) {
        if (issue.state !== "open") return done();
        if (!issue.referenceComment) return done();
        if (!issue.referenceComment.flags.accept) return done();
        upvote.model.repo.issues(issue.number).update({
          milestone: milestone.number
        }).then(function() {
          done();
        }.bind(this));
      }.bind(this));
    }.bind(this));
  },

  fetchPollIssues: function(callback) {
    this.pollIssues = null;
    var rex = new RegExp(`https\:\/\/github\.com\/${upvote.model.repo.user_name}\/`);
    upvote.model.repo.issues(this.number).timeline.fetch().then(function(obj) {
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
  },

  isAssignee$get: function() {
    return Boolean(this.attributes.assignees.find(function(assignee) {
      if (assignee.login !== (upvote.user && upvote.user.login)) return;
      return true;
    }));
  }

});
