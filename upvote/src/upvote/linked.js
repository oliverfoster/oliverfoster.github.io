if (document.body) start();
else window.addEventListener("load", start);

function start() {
  var observer = new MutationObserver(function(list) {
    var navElement = elements("[link=perm"+sha256(location.hash.slice(1))+"]");
    if (!navElement.length) return;
    navElement.toggleClass("linked", true);

  });
  observer.observe(document.body, {  childList: true, subtree: true });
}
