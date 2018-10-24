var markdown = new showdown.Converter();

var Upvote = Class.extend({

  defaultRoute: "#repos",

  router: null,

  octo: null,
  user: null,

  config: null,

  constructor: function Upvote(options) {
    getUrl(options.config, function(config) {
      upvote.config = JSON.parse(config);
      document.querySelector("head").append(createElement("link", {
        rel: "shortcut icon",
        href: upvote.config.favicon
      }));
      document.querySelector("head").append(createElement("title", {
        html: upvote.config.title
      }));

      this.model = new AppModel();
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
    }.bind(this));
  },

  onChange: function(hash) {
    if (!this.octo && this.router.hasSearch) {
      var search = this.router.search;
      if (search.code) {
        document.body.style.display = "none";
        getUrl(template(upvote.config.authenticator, {search: search}), function(data) {
          data = JSON.parse(data);
          document.cookie = `oauth=${data.token};path=/;max-age=31536000;samesite`;
          location.href = location.href.slice(0, location.href.indexOf("?"));
        });
        return;
      }
      return;
    }

    if (!this.octo && !hash.login) {
      this.navigateTo = this.router.startHash;
      if (this.navigateTo.login) this.navigateTo = {};
      this.router.replace("#login");
      return;
    }

    if (hash.polls && (!this.model.repo || this.model.repo.path != hash.path)) {
      this.prepRepo(hash, function() {
        this.navigate();
      }.bind(this));
    } else if (hash.poll && (!this.model.poll || this.model.poll.number != hash.number)) {
      this.prepPoll(hash, function() {
        this.navigate();
      }.bind(this));
    } else {
      this.navigate();
    }

  },

  navigate: function() {
    delay(function() {
      this.wrapper.render();
    }.bind(this), 10);
  },

  prepRepo: function(hash, callback) {
    this.model.fetchRepos(function() {
      this.model.repo = this.model.repos.find(function(repo) {
        return repo.path === hash.path;
      });
      callback && callback();
    }.bind(this));
  },

  prepPoll: function(hash, callback) {
    this.prepRepo(hash, function() {
      this.model.repo.fetchPolls(function() {
        this.model.poll = this.model.repo.polls.find(function(poll) {
          return poll.number == hash.number;
        });
        callback && callback();
      }.bind(this));
    }.bind(this));
  },

  login: function(options) {
    options.acceptHeader = this.config.acceptHeader || "";
    this.octo = new Octokat(options);
    this.octo.zen.read(function(err, value) {
      if (!err) return;
      this.logout();
    }.bind(this));
    this.octo.user.fetch().then(function(user) {
      this.user = user;
    }.bind(this));
    this.navigateTo = this.router.startHash;
    if (this.navigateTo.login || !this.navigateTo[0]) this.navigateTo = this.defaultRoute;
    this.router.replace(this.navigateTo);
  },

  logout: function() {
    document.cookie = `oauth=;path=/;max-age=31536000;samesite`;
    this.octo = null;
    this.router.replace("#login");
  }

}, null, {
  instanceEvents: true
});
