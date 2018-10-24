var markdown = new showdown.Converter();

var Upvote = Class.extend({

  defaultRoute: "#repos",

  router: null,

  octo: null,
  repo: null,
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
        this.model.poll = this.model.repo.polls.find(function(poll) {
          return poll.number == id;
        });
      }
    }
    delay(function() {
    this.wrapper.render();
  }.bind(this), 10);
  },

  login: function(options) {
    options.acceptHeader = this.config.acceptHeader || "";
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
    this.router.replace(this.defaultRoute);
  },

  logout: function() {
    document.cookie = `oauth=;path=/;max-age=31536000;samesite`;
    this.octo = null;
    this.router.replace("#login");
  }

}, null, {
  instanceEvents: true
});
