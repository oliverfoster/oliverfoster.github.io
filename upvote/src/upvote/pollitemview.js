var PollItemView = View.extend({

  attach: function() {
    this.model.parentIssue = upvote.model.poll;
  },

  onOpen: function(event) {
    window.open(this.model.referenceComment.htmlUrl);
  },

  onUpVote: function(event) {
    this.model.disable = true;
    var referenceComment = this.model.referenceComment;
    referenceComment &&
    referenceComment.toggleReaction("+1", !referenceComment.hasVoted("+1"), function() {
      this.model.disable = false;
      this.render();
    }.bind(this));
  },

  onDownVote: function() {
    this.model.disable = true;
    var referenceComment = this.model.referenceComment;
    referenceComment &&
    referenceComment.toggleReaction("-1", !referenceComment.hasVoted("-1"), function() {
      this.model.disable = false;
      this.render();
    }.bind(this));
  },

  onInclude: function() {
    this.model.disable = true;
    var referenceComment = this.model.referenceComment;
    referenceComment &&
    referenceComment.toggleFlag("accept", !this.model.referenceComment.flags.accept, function() {
      this.model.fetchReferencingComments(function() {
        this.model.disable = false;
        this.render();
      }.bind(this));
    }.bind(this));

  },

  permahash: function() {
    return `poll&path=${upvote.model.repo.path}&number=${upvote.model.poll.number}&issue=${this.model.number}`;
  },

  template: function() {
    return `
<div id="${this.id}" class="poll-item tile" link="perm${sha256(this.permahash())}">
  <div class="inner">
    <div class="menubar">
      <div class="padding"></div>
      <button ${this.model.disable?"disabled":""} class="open menu-btn" onclick="this.view.onOpen(event);">${emoji['thought_balloon']} Comments</button>
      <button ${this.model.disable?"disabled":""} class="up menu-btn ${this.model.referenceComment.hasVoted("+1")?"voted":""}" tooltip="${this.model.referenceComment.hasVoted("+1")?"Voted +1.":"Not voted +1."}" onclick="this.view.onUpVote(event);"> ${emoji['+1']} ${or(this.model.referenceComment.reactions['+1'], 0)}</button>
      <button ${this.model.disable?"disabled":""} class="down menu-btn ${this.model.referenceComment.hasVoted("-1")?"voted":""}" tooltip="${this.model.referenceComment.hasVoted("-1")?"Voted -1.":"Not voted -1."}"  onclick="this.view.onDownVote(event);"> ${emoji['-1']} ${or(this.model.referenceComment.reactions['1'], 0)}</button>
      ${this.model.parentIssue&&this.model.parentIssue.isAssignee?
      `<button ${this.model.disable?"disabled":""} class="include menu-btn emoji" onclick="this.view.onInclude(event);"> ${this.model.referenceComment.flags.accept?emoji['heavy_check_mark']:emoji['x']}${this.model.referenceComment.flags.accept?" Accepted":" Not accepted"}</button>`:
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
      <div class="footer">
        <!--
        <div class="up">
          <div class="voters">
            ${each(this.model.referenceComment.upVotedUsers, (name)=>{
              return '<div class="username">'+name+'</div>';
            })}
          </div>
        </div>
        <div class="down">
          <div class="voters">
            ${each(this.model.referenceComment.downVotedUsers, (name)=>{
              return '<div class="username">'+name+'</div>';
            })}
          </div>
        </div>
        --!>
      </div>
    </div>
  </div>
</div>
`;
  }

});
