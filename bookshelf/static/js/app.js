// Assign a deterministic warm color to placeholder covers based on title
document.querySelectorAll('.book-cover-placeholder').forEach(el => {
  const title = el.dataset.title || '';
  const colors = [
    '#5c3317', '#7d4e2d', '#8f3a2a', '#3d5a4a', '#2d4a6a',
    '#6a3a5c', '#4a5c2d', '#7a3d2d', '#3a4a6a', '#5c4a2d',
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  el.style.background = colors[Math.abs(hash) % colors.length];
});

// Auto-dismiss flash messages after 4s
document.querySelectorAll('.flash').forEach(el => {
  setTimeout(() => {
    el.style.transition = 'opacity .5s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 500);
  }, 4000);
});
