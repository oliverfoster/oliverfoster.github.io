var IssueModel = Model.extend({

  constructor: function IssueModel(value, options) {
    this.parentIssue = (options && options.parentIssue) || (value && value.parentIssue);
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
      if (!this.referenceCommentItems.length) {
        callback && callback();
        return;
      }
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

  addLinkToPoll: function(permalink) {
    if (!this.isAssignee) return;
    var linkRex = /\n\n\[Link to poll\]\([^\)]*\)/;
    var matches = this.body.match(linkRex);
    if (matches) return;
    this.body = this.body+`\n\n[Link to poll](${permalink})`
    upvote.model.repo.issues(this.number).update({
      body: this.body
    });
  },

  acceptState$get$enum: function() {
    var referenceComment = this.referenceComment;
    if (!referenceComment) {
      return this.flags.accept ? "accepted" : "notaccepted";
    }
    return referenceComment.flags.accept ? "accepted" : "notaccepted";
  },

  isIssueAssignee$get: function() {
    return this.parentIssue && this.parentIssue.isAssignee;
  },

  accepted$get: function() {
    var referenceComment = this.referenceComment;
    if (!referenceComment) {
      return this.flags.accept;
    }
    return this.referenceComment.flags.accept
  },

  hasVoted: function(reactionName) {
    var referenceComment = this.referenceComment;
    if (!referenceComment) {
      return this.reactionItems &&
        this.reactionItems.find(function(reaction) {
          if (reaction.content !== reactionName) return;
          if (upvote.user.login !== reaction.user.login) return;
          return true;
        }.bind(this)) || false;
    }
    return this.referenceComment.hasVoted(reactionName);
  },

  fetchReactions: function(callback) {
    this.reactions = {};
    upvote.model.repo.issues(this.number).reactions.fetch().then(function(obj) {
      obj.items.forEach(function(reaction) {
        this.reactions[reaction.content] = this.reactions[reaction.content] || 0;
        this.reactions[reaction.content]++;
      }.bind(this));
      this.reactionItems = obj.items;
      callback && callback(this.reactionItems);
    }.bind(this));
  },

  biasReactions$get: function() {
    var referenceComment = this.referenceComment;
    if (!referenceComment) {
      return this.attributes.reactions || {};
    }
    return referenceComment.reactions;
  },

  toggleReaction: function(name, value, callback) {
    var referenceComment = this.referenceComment;
    if (!referenceComment) {
      var complete = function() {
        this.fetchReactions(callback);
      }.bind(this);
      if (value) {
        upvote.model.repo.issues(this.number).reactions.create({
          content: name
        }).then(complete);
      } else {
        this.reactionItems.forEach(function(reaction) {
          if (reaction.content !== name) return;
          if (reaction.user.login !== upvote.user.login) return;
          upvote.octo.reactions(reaction.id).remove().then(complete);
        }.bind(this));
      }
      return;
    }
    referenceComment.toggleReaction(name, value, callback);
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
        if (!pollIssue.accepted) return;
        return true;
      }).forEach(function(issue) {
        var comment = issue.referenceComment
        table.push([
          `[#${issue.number}](${comment && comment.htmlUrl || issue.htmlUrl})`,
          `[${issue.title}](${comment  && comment.htmlUrl || issue.htmlUrl})`,
          (issue.biasReactions['+1'] - issue.biasReactions['-1']),
          issue.biasReactions['+1'],
          issue.biasReactions['-1']
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
    upvote.model.repo.fetchMilestones(function() {
      var milestone = upvote.model.repo.biasMilestones && (upvote.model.repo.biasMilestones.find(function(milestone) {
        return milestone.number === existingMilestoneNumber;
      }.bind(this)) || upvote.model.repo.biasMilestones.find(function(milestone) {
        return milestone.title === this.title;
      }.bind(this)));
      if (!milestone) {
        upvote.model.repo.createMilestone({
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
        if (!issue.accepted) return done();
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
      if (!obj || !obj.items || !obj.items.length) {
        callback && callback();
        return;
      }
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
