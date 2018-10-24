var PollItemView = View.extend({

  attach: function() {
    this.model.parentIssue = upvote.model.poll;
  },

  onOpen: function(event) {
    if (this.model.referenceComment) {
      window.open(this.model.referenceComment.htmlUrl);
      return;
    }
    window.open(this.model.htmlUrl);
  },

  onUpVote: function(event) {
    this.model.disable = true;
    this.model.toggleReaction("+1", !this.model.hasVoted("+1"), function() {
      this.model.disable = false;
      this.render();
    }.bind(this));
  },

  onDownVote: function() {
    this.model.disable = true;
    this.model.toggleReaction("-1", !this.model.hasVoted("-1"), function() {
      this.model.disable = false;
      this.render();
    }.bind(this));
  },

  onInclude: function() {
    this.model.disable = true;
    this.model.toggleFlag("accept", !this.model.flags.accept, function() {
      this.model.fetchReferencingComments(function() {
        this.model.fetchReactions(function() {
          this.model.disable = false;
          this.render();
        }.bind(this));
      }.bind(this));
    }.bind(this));

  },

  permahash: function() {
    return `poll&path=${upvote.model.repo.path}&number=${upvote.model.poll.number}&issue=${this.model.number}`;
  },

  template: function() {
    return `
<div id="${this.id}" class="poll-item tile ${this.model.state} ${this.model.acceptState}" link="perm${sha256(this.permahash())}">
  <div class="inner">
    <div class="menubar">
      <div class="padding"></div>
      <button ${this.model.disable?"disabled":""} class="open menu-btn" onclick="this.view.onOpen(event);">${svg['comment']} Conversation</button>
      <button ${this.model.disable?"disabled":""} class="up menu-btn ${this.model.hasVoted("+1")?"voted":""}" tooltip="${this.model.hasVoted("+1")?"Voted +1.":"Not voted +1."}" onclick="this.view.onUpVote(event);"> ${emoji['+1']} ${or(this.model.biasReactions['+1'], 0)}</button>
      <button ${this.model.disable?"disabled":""} class="down menu-btn ${this.model.hasVoted("-1")?"voted":""}" tooltip="${this.model.hasVoted("-1")?"Voted -1.":"Not voted -1."}"  onclick="this.view.onDownVote(event);"> ${emoji['-1']} ${or(this.model.biasReactions['-1'], 0)}</button>
      ${this.model.isIssueAssignee?
      `<button ${this.model.disable?"disabled":""} class="include menu-btn emoji" onclick="this.view.onInclude(event);"> ${this.model.accepted?emoji['heavy_check_mark']:emoji['x']}${this.model.accepted?" Accepted":" Not accepted"}</button>`:
      ``
      }
    </div>
    <div class="content">
      <div class="header">
        <div class="text">
          <div class="title"><h1><a href="#${this.permahash()}">${this.model.title} <span class="issue-number">#${this.model.number}</span></a></h1></div>
          <div class="subtitle">
            <span class="state ${this.model.state}">${this.model.state === "closed" ? svg.closed + " Closed" : svg.open + " Open" }</span>
            <span class="avatar">
              <img src="${this.model.user.avatarUrl}" />
            </span>
            <span class="readline">${this.model.user.login} opened this issue ${moment(this.model.createdAt).fromNow()}</span>
          </div>
          <div  class="labels">
            ${each(this.model.labels, (label)=>{
              return `<span class="label" style="background-color:#${label.color};color:${invertColor(label.color, true)};">${label.name}</span>`;
            })}
          </div>
        </div>
      </div>
      <div class="body markdown">${markdown.makeHtml(this.model.body)}</div>
    </div>
  </div>
</div>
`;
  }

});
