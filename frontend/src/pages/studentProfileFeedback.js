// Presentation helpers shared only by Student Profile editors.
export function notifyProfileChange(document, outcome) {
  const Event = document?.defaultView?.CustomEvent;
  if (Event) document.dispatchEvent(new Event("student-profile-state", { detail: { outcome } }));
}

export function profileMessage(target, text, type = "info") {
  if (!target) return;
  target.textContent = text;
  target.classList.remove("info", "loading", "success", "error");
  target.classList.add("message", type);
  notifyProfileChange(target.ownerDocument, type === "error" ? "error" : undefined);
}

export function clearProfileFieldError(input) {
  if (!input?.id) return;
  const id = input.id + "-error";
  input.ownerDocument.getElementById(id)?.remove();
  input.removeAttribute("aria-invalid");
  const descriptions = (input.getAttribute("aria-describedby") || "").split(/\s+/).filter(value => value && value !== id);
  if (descriptions.length) input.setAttribute("aria-describedby", descriptions.join(" "));
  else input.removeAttribute("aria-describedby");
}

export function profileFieldError(input, text, focus = true) {
  if (!input?.id) return;
  clearProfileFieldError(input);
  const error = input.ownerDocument.createElement("span");
  error.id = input.id + "-error";
  error.className = "profile-field-error";
  error.textContent = text;
  input.after(error);
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", [input.getAttribute("aria-describedby"), error.id].filter(Boolean).join(" "));
  if (focus) input.focus();
}

export function clearProfileErrors(root) {
  root?.querySelectorAll('[aria-invalid="true"]').forEach(clearProfileFieldError);
}

// The shared confirmation overlay remains interactive when opened above this modal.
export function profileModalFocus(modal, fallback) {
  let opener = null, previousOverflow = "";
  const background = new Map();
  const visible = element => !element.disabled && !element.closest('[hidden], [inert]') && element.getClientRects().length;
  const controls = () => [...modal.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')]
    .filter(element => element.tabIndex >= 0 && visible(element));
  const isOpen = () => modal.classList.contains("open");
  const hasConfirmation = () => modal.ownerDocument.querySelector('.app-confirm-overlay:not(.is-leaving)');
  modal.addEventListener("keydown", event => {
    if (event.key !== "Tab" || hasConfirmation()) return;
    const items = controls(), first = items[0], last = items.at(-1);
    if (!first) { event.preventDefault(); modal.querySelector('[role="dialog"]')?.focus(); return; }
    if (event.shiftKey && (modal.ownerDocument.activeElement === first || !items.includes(modal.ownerDocument.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (modal.ownerDocument.activeElement === last || !items.includes(modal.ownerDocument.activeElement))) {
      event.preventDefault(); first.focus();
    }
  });
  modal.ownerDocument.addEventListener("focusin", event => {
    if (isOpen() && !hasConfirmation() && !modal.contains(event.target)) controls()[0]?.focus();
  });
  return {
    open() {
      if (background.size) return;
      opener = modal.ownerDocument.activeElement;
      previousOverflow = modal.ownerDocument.body.style.overflow;
      for (const element of modal.ownerDocument.body.children) {
        if (element === modal || element.contains(modal) || element.classList.contains("app-feedback") || element.tagName === "SCRIPT") continue;
        background.set(element, element.inert); element.inert = true;
      }
    },
    close() {
      for (const [element, inert] of background) element.inert = inert;
      background.clear();
      modal.ownerDocument.body.style.overflow = previousOverflow;
      const target = opener?.isConnected && visible(opener) ? opener : fallback;
      target?.focus();
    },
  };
}
