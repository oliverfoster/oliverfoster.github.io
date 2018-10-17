var Upvote = View.extend({

    router: null,
    octo: null,
    user: "oliverfoster",
    repo: "adapt-process-recommendations",
    tag: "upvote",

    initialize: function() {
        this.model = new QueuesModel();
        this.issues = {};
        this.router = new Router();
        this.listenTo(this.router, "change", this.onChange);
        this.router.replace("#login");
    },

    onChange: function(hash) {
        if (!this.octo && hash !== "#login") {
            this.router.push("#login");
            return;
        }
        this.render();
    },

    template: function() {
        switch (this.router.hash) {
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
                return upvote.issues[issue.number];
            }.bind(this));
        }.bind(this));
    },

    fetchReferencedComments: function(issueNumber, callback) {
        var referenceIssueNumber = upvote.model.queue.number;
        var rex = new RegExp("(\\#"+referenceIssueNumber+"(\\W|$))|"+upvote.model.queue.htmlUrl);
        upvote.octo.repos(upvote.user, upvote.repo).issues(issueNumber).comments.fetch().then(function(obj) {
            upvote.issues[issueNumber].comments = obj.items;
            var count = 0, done = 0;
            upvote.issues[issueNumber].referenceComments = obj.items.filter(function(item) {
                var hasReference = (null !== item.body.match(rex));
                if (hasReference) {
                    item.references = item.references || {};
                    item.references[upvote.model.queue.htmlUrl] = true;
                }
                count++;
                this.fetchReferencedCommentReactions(issueNumber, item.id, function(reactions) {
                    item.reactions = reactions;
                    done++;
                    if (count !== done) return;
                    callback(upvote.issues[issueNumber]);
                });
                return hasReference;
            }.bind(this));
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

    template: function() {
        return `
<div view-container="true" id="${this.id}">
    <label>Username</label><input id="username" autocomplete="current-username" type="text" onchange="this.view.model.username = this.value" />
    <label>password</label><input id="password" autocomplete="current-password" type="password" onchange="this.view.model.password = this.value" />
    <button onclick="this.view.onClick();">Login</button>
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
<div view-container="true" id="${this.id}" class="queues-item" onclick="this.view.onClick(event);">
    <div class="inner">
        <div class="content">
            <div class="title">${this.model.title}</div>
            <div class="body">${this.model.body}</div>
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
        this.model.upVotes = this.model.upVotes || 0;
        this.model.downVotes = this.model.downVotes || 0;
        this.model.usersVoted = this.model.usersVoted || [];
        upvote.model.fetchReferencedComments(this.model.number, function(issue) {
            var upVotes = 0;
            var downVotes = 0;
            var users = {};
            var referenceComment = issue && issue.referenceComments && issue.referenceComments[issue.referenceComments.length-1];
            referenceComment && referenceComment.reactions.forEach(function(reaction) {
                switch (reaction.content) {
                    case "+1":
                        upVotes++;
                        break;
                    case "-1":
                        downVotes++;
                        break;
                }
                users[reaction.user.login] = true;
            });
            this.model.referenceComment = referenceComment;
            this.model.upVotes = upVotes;
            this.model.downVotes = downVotes;
            this.model.usersVoted = Object.keys(users);
            this.render();
        }.bind(this));
    },

    onOpen: function(event) {
        window.open(this.model.referenceComment.htmlUrl);
        event.stopPropagation();
    },

    template: function() {
        return `
<div view-container="true" id="${this.id}" class="queues-item">
    <div class="inner">
        <div class="content">
            <div class="title">${this.model.title}</div>
            <div class="body">${this.model.body}</div>
            <div class="votes">
                <div class="up">up votes: ${this.model.upVotes}</div>
                <div class="down">down votes: ${this.model.downVotes}</div>
            </div>
            <div class="voters">
                ${each(this.model.usersVoted, (name)=>{
                    return '<div class="username">'+name+'</div>';
                })}
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
