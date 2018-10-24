var ContentBodyView = View.extend({


  template: function() {
        return `
<div id="${this.id}" class="content-body">
  <div class="inner">
    <div class="title">
      <span>
        <a class="poll" href="#${upvote.router.permahash()}">${upvote.model.poll.title}</a>
      </span>
      <a class="poll" href="#${upvote.router.permahash()}" target="_blank"><span class="issue-number">#${upvote.model.poll.number}</span></a>
    </div>
    <div class="subtitle">
      <span class="state ${upvote.model.poll.state}">${upvote.model.poll.state === "closed" ? svg.closed + " Closed" : svg.open + " Open" }</span>
      <span class="avatar">
        <img src="${upvote.model.poll.user.avatarUrl}" />
      </span>
      <span class="readline">${upvote.model.poll.user.login} opened this issue ${moment(upvote.model.poll.createdAt).fromNow()}</span>
    </div>
    <div class="markdown">
    ${markdown.makeHtml(upvote.model.poll.body.replace(/\n\n\[Link to poll\]\([^\)]*\)/, ''))}
    </div>
  </div>
</div>
`;
  }

});
