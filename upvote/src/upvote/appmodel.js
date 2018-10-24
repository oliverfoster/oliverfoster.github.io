var AppModel = Model.extend({

  constructor: function AppModel() {
    return Model.apply(this, arguments);
  },

  fetchRepos: function(callback) {
    this.repos = new RepoCollection();
    upvote.config.repos.forEach(function (repoConfig) {
      upvote.octo.repos(repoConfig.user_name, repoConfig.repo_name).fetch().then(function(obj) {
        obj.repo_name = repoConfig.repo_name;
        obj.user_name = repoConfig.user_name;
        obj.tag_name = repoConfig.tag_name;
        this.repos.push(obj);
        if (this.repos.length !== upvote.config.repos.length) return;
        this.repos.sort(function(a,b) {
          var value = a.user_name.localeCompare(b.user_name);
          if (!value) value = a.repo_name.localeCompare(b.repo_name);
          return value;
        })
        callback && callback();
      }.bind(this));
    }.bind(this));
  }

});
