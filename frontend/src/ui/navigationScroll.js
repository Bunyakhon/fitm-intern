// Reveal an active menu item without moving the page, panel, or an open dialog.
export function revealNavigationItem(nav, item) {
  if (!nav || !item || !nav.contains(item) || nav.scrollWidth <= nav.clientWidth) return;
  const box = nav.getBoundingClientRect(), link = item.getBoundingClientRect();
  if (link.left < box.left) nav.scrollLeft += link.left - box.left;
  else if (link.right > box.right) nav.scrollLeft += link.right - box.right;
}
