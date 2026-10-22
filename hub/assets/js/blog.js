/* Atraxia website: the Blog index (blog.html, /blog). The cards are static
   HTML (they cannot fail to load); this adds the reference's search over the
   posts on the page and its no-match state (source/blog.r26.html, "BO1 v2").
   Not ported: the ?empty review flag and its "first explorations" state (the
   listing is static, so no data path can be empty). */
(function () {
  'use strict';
  function init() {
    var bar = document.querySelector('#posts .blog-bar'), none = document.querySelector('#posts .sl-none');
    if (!bar || !none) return;
    var lab = document.createElement('label');
    lab.className = 'sl-search';
    lab.innerHTML = '<span class="visually-hidden">Search posts</span><input type="search" placeholder="Search explorations" autocomplete="off" />';
    bar.appendChild(lab);
    none.innerHTML = '<strong>No posts match that search.</strong><span>Try another word, or clear the search.</span>';
    var items = [].slice.call(document.querySelectorAll('#posts .post-feature, #posts .post-card')), input = lab.querySelector('input');
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase(), n = 0;
      items.forEach(function (it) { var on = !q || it.textContent.toLowerCase().indexOf(q) > -1; it.hidden = !on; if (on) n++; });
      none.classList.toggle('is-on', n === 0);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
