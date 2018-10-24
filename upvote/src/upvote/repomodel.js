var RepoModel = Model.extend({

  constructor: function RepoModel() {
    return Model.apply(this, arguments);
  },

  path$get: function() {
    return this.attributes.user_name + "/" + this.attributes.repo_name;
  },

  fetchPolls: function(callback) {
    this.polls = null;
    upvote.model.repo.issues.fetch({state:"open", labels: upvote.model.repo.tag_name}).then(function(obj) {
      this.polls = new IssueCollection(obj.items);
      callback && callback();
    }.bind(this));
  },

  fetchMilestones: function(callback) {
    this.milestones = null;
    upvote.model.repo.milestones.fetch().then(function(obj) {
      this.milestones = new Collection(obj.items);
      callback && callback();
    }.bind(this));
  },

  createMilestone: function(options, callback) {
    upvote.model.repo.milestones.create(options).then(function(obj) {
      this.fetchMilestones(function() {
        callback && callback(obj);
      });
    }.bind(this));
  }

});
