// Print button on the printable exercise log page. A separate file because the site's
// Content-Security-Policy allows scripts from this site only (no inline handlers).
document.getElementById('print-log')?.addEventListener('click', () => window.print());
