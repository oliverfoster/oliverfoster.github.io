var converter = new showdown.Converter();

var Upvote = View.extend({

    router: null,
    octo: null,
    user: "oliverfoster",
    repo: "adapt-process-recommendations",
    tag: "upvote",
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

    template: function() {
        var parts = this.router.hash.split("=");
        var name = parts[0];
        var id = parts[1];
        switch (name) {
            case "#login":
                return `
<div view-container="true" id="${this.id}">
    <div class="content-title">Github Login</div>
    <div class="content-container">
        ${seat({ class: LoginView, id: "login" })}
    </div>
</div>
`;
            case "#queues":
                return `
<div view-container="true" id="${this.id}">
    <div class="content-title">Tagged Issues</div>
    <div class="content-container">
        ${seat({ class: UpvoteQueuesView, model: this.model, id: "queues" })}
    </div>
</div>
`;
            case "#queue":
                return `
<div view-container="true" id="${this.id}">
    <div class="content-title">
        Issues referencing: <a href="${this.model.queue.htmlUrl}" target="_blank">${this.model.queue.title}</a>
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
                return upvote.issues[issue.number];
            }.bind(this));
        }.bind(this));
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

    onAuthenticate: function() {
        location.href = `https://github.com/login/oauth/authorize?client_id=${upvote.client_id}&scope=public_repo`;
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
    <div class="sso">
        <button onclick="this.view.onAuthenticate();">Single sign-on</button>
    </div>
    <div class="login">
        <label>Username</label><input id="username" autocomplete="current-username" type="text" onchange="this.view.model.username = this.value" />
        <label>password</label><input id="password" autocomplete="current-password" type="password" onchange="this.view.model.password = this.value" />
        <button onclick="this.view.onClick();">Login</button>
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

    onOpen: function(event) {
        window.open(this.model.htmlUrl);
        event.stopPropagation();
    },

    template: function() {
        return `
<div view-container="true" id="${this.id}" class="queues-item tile" onclick="this.view.onClick(event);">
    <div class="inner">
        <div class="content">
            <div class="title">${this.model.title}</div>
            <div class="body">${converter.makeHtml(this.model.body)}</div>
        </div>
        <div class="menubar">
            <button class="open" onclick="this.view.onOpen(event);">Open</button>
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

    attach: function() {
        var parentIssueNumber = upvote.model.queue.number;
        var issue = this.model;
        this.model.referenceComment = issue &&
                issue.referenceComments &&
                issue.referenceComments[parentIssueNumber] &&
                issue.referenceComments[parentIssueNumber][issue.referenceComments[parentIssueNumber].length-1];
        this.model.referenceComment = this.model.referenceComment || {
            upVotes: 0,
            downVotes: 0,
            upVotedUsers: 0,
            downVotedUsers: 0
        };
        upvote.model.fetchReferencedComments(parentIssueNumber, this.model.number, function(issue) {
            var upVotes = 0;
            var downVotes = 0;
            var upUsers = {};
            var downUsers = {};
            var referenceComment = issue &&
                issue.referenceComments &&
                issue.referenceComments[parentIssueNumber] &&
                issue.referenceComments[parentIssueNumber][issue.referenceComments[parentIssueNumber].length-1];
            referenceComment && referenceComment.reactions.forEach(function(reaction) {
                switch (reaction.content) {
                    case "+1":
                        upVotes++;
                        upUsers[reaction.user.login] = true;
                        break;
                    case "-1":
                        downVotes++;
                        downUsers[reaction.user.login] = true;
                        break;
                }
            });
            referenceComment.upVotes = upVotes;
            referenceComment.downVotes = downVotes;
            referenceComment.upVotedUsers = Object.keys(upUsers);
            referenceComment.downVotedUsers = Object.keys(downUsers);
            this.model.referenceComment = referenceComment;
            this.render();
        }.bind(this));
    },

    onOpen: function(event) {
        window.open(this.model.referenceComment.htmlUrl);
        event.stopPropagation();
    },

    template: function() {
        return `
<div view-container="true" id="${this.id}" class="queue-item tile">
    <div class="inner">
        <div class="content">
            <div class="title">${this.model.title}</div>
            <div class="body">${converter.makeHtml(this.model.body)}</div>
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
        <div class="menubar">
            <button class="open" onclick="this.view.onOpen(event);">Open</button>
        </div>
    </div>
</div>
`;
    }

});
