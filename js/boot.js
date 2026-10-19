/* Runs first, in <head>, before anything paints. Decides whether the motion layer may hide content.
   Content is only ever hidden when (a) JavaScript is running, (b) the visitor has not asked for reduced
   motion, and (c) the animation script reports in within 3 seconds. Otherwise everything stays visible. */
(function (d) {
  'use strict';
  var root = d.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  root.classList.add('motion');
  window.setTimeout(function () {
    if (!root.classList.contains('motion-ready')) root.classList.remove('motion');
  }, 3000);
})(document);
