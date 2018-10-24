var PollsItemView = View.extend({

  onClick: function(event) {
    upvote.model.poll = this.model;
    upvote.router.push("#poll&path="+upvote.model.repo.user_name+"/"+upvote.model.repo.repo_name+"&number="+this.model.number);
  },

  onLink: function(event) {
    event.stopPropagation();
  },

  onPublish: function(event) {
    this.model.disable = true;
    event.stopPropagation();
    this.model.publish(function(comment) {
      this.model.disable = false;
      window.open(comment.htmlUrl);
    }.bind(this));
  },

  onMilestone: function(event) {
    this.model.disable = true;
    event.stopPropagation();
    this.model.milestone(function(milestone) {
      this.model.disable = false;
      window.open(milestone.htmlUrl);
    }.bind(this));
  },

  template: function() {
    return `
<div id="${this.id}" class="polls-item tile">
  <div class="inner">
    <div class="menubar">
      <div class="padding"></div>
      <button ${this.model.disable?"disabled":""} class="vote menu-btn" onclick="this.view.onClick(event);">${emoji['ballot_box_with_check']} Vote on issues</button>
      ${this.model&&this.model.isAssignee?
        `
        <button ${this.model.disable?"disabled":""}  class="publish menu-btn" onclick="this.view.onPublish(event);"> ${emoji['speech_balloon']} Publish results</button>
        <button ${this.model.disable?"disabled":""}  class="milestone menu-btn" onclick="this.view.onMilestone(event);"> ${svg['milestone']} Publish milestone</button>
        `:
        ``
      }
    </div>
    <div class="content">
      <div class="header">
        <div class="text">
          <div class="title"><h1><a target="_blank" href="${this.model.htmlUrl}" onclick="this.view.onLink(event);">${this.model.title} <span class="issue-number">#${this.model.number}</span></h1></a></div>
          <div class="subtitle">
            <span class="state ${this.model.state}">${this.model.state === "closed" ? svg.closed + " Closed" : svg.open + " Open" }</span>
            <span class="avatar">
              <img src="${this.model.user.avatarUrl}" />
            </span>
            <span class="readline">${this.model.user.login} opened this issue ${moment(this.model.createdAt).fromNow()}</span>
          </div>
          <div  class="labels">
            ${each(this.model.labels, (label)=>{
              if (label.name === upvote.model.repo.tag_name) return ``;
              return `<span class="label" style="background-color:#${label.color};color:${invertColor(label.color, true)};">${label.name}</span>`;
            })}
          </div>
        </div>
      </div>
      <div class="body markdown">${markdown.makeHtml(this.model.body)}</div>
      <div class="footer">
      </div>
    </div>
  </div>
</div>
`;
  }

});
