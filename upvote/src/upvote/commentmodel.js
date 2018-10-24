var CommentModel = Model.extend({

  constructor: function CommentModel(attributes, options) {
    attributes.issueNumber = options && options.issueNumber || attributes.issueNumber;
    return Model.apply(this, arguments);
  },

  update: function(callback) {
    upvote.model.repo.issues.comments(this.id).fetch().then(function(data) {
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
      upvote.model.repo.issues.comments(this.id).reactions.create({
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
    upvote.model.repo.issues.comments(this.id).update({ body: this.body }).then(function() {
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
    this.reactions = {};
    upvote.model.repo.issues.comments(this.id).reactions.fetch().then(function(obj) {
      obj.items.forEach(function(reaction) {
        this.reactions[reaction.content] = this.reactions[reaction.content] || 0;
        this.reactions[reaction.content]++;
      }.bind(this));
      this.reactionItems = obj.items;
      callback && callback(this.reactionItems);
    }.bind(this));
  }

});
