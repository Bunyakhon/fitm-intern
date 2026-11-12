const FEEDBACK_ROOT_ID = "appFeedback";

function getFeedbackRoot(doc = document) {
  let root = doc.getElementById(FEEDBACK_ROOT_ID);

  if (!root) {
    root = doc.createElement("div");
    root.id = FEEDBACK_ROOT_ID;
    root.className = "app-feedback";
    doc.body.append(root);
  }

  return root;
}

// Opt-in content variant of shared feedback. Existing alert/confirm callers keep
// their behavior; a nested confirmation can suspend and resume this dialog.
export function mountContentModal({ document: doc = document, overlay, panel, canClose = () => true, onClose,
  returnFocus, fallbackFocus, initialFocus = panel } = {}) {
  const root = getFeedbackRoot(doc), target = doc.defaultView;
  root.append(overlay);
  let open = false, suspended = false, scroll, paddingRight, background = [];
  const focus = element => { if (element?.isConnected && !element.disabled) element.focus?.({ preventScroll: true }); };
  const focusable = () => [...panel.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(element => {
    if (element.disabled || element.tabIndex < 0) return false;
    for (let node = element; node && node !== panel; node = node.parentElement) if (node.hidden || node.inert) return false;
    return element.getClientRects().length > 0;
  });
  function onKey(event) {
    if (!open || suspended) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
    if (event.key !== 'Tab') return;
    const elements = focusable(), first = elements[0], last = elements.at(-1), active = doc.activeElement;
    if (!first) { event.preventDefault(); focus(panel); }
    else if (!panel.contains(active) || active === panel) { event.preventDefault(); focus(event.shiftKey ? last : first); }
    else if (event.shiftKey && active === first) { event.preventDefault(); focus(last); }
    else if (!event.shiftKey && active === last) { event.preventDefault(); focus(first); }
  }
  function onFocus(event) {
    if (open && !suspended && !panel.contains(event.target)) focus(focusable()[0] || panel);
  }
  function show() {
    if (open) return;
    open = true; suspended = false;
    scroll = { x: target.scrollX, y: target.scrollY };
    paddingRight = doc.body.style.paddingRight;
    const gap = Math.max(0, target.innerWidth - doc.documentElement.clientWidth);
    if (gap) doc.body.style.paddingRight = `${parseFloat(target.getComputedStyle(doc.body).paddingRight) + gap}px`;
    background = [...doc.body.children].filter(element => element !== root).map(element => ({ element, inert: element.inert }));
    for (const { element } of background) element.inert = true;
    overlay.hidden = panel.hidden = false; overlay.inert = false;
    panel.setAttribute('aria-modal', 'true'); panel.removeAttribute('aria-hidden');
    doc.body.classList.add('has-app-modal');
    doc.addEventListener('keydown', onKey, true); doc.addEventListener('focusin', onFocus, true);
    focus(initialFocus);
  }
  function close() {
    if (!open || suspended || !canClose()) return false;
    const destination = typeof returnFocus === 'function' ? returnFocus() : returnFocus;
    open = false; suspended = false;
    overlay.hidden = panel.hidden = true; overlay.inert = false;
    panel.removeAttribute('aria-hidden');
    doc.removeEventListener('keydown', onKey, true); doc.removeEventListener('focusin', onFocus, true);
    for (const { element, inert } of background) if (element.isConnected) element.inert = inert;
    background = []; doc.body.style.paddingRight = paddingRight;
    doc.body.classList.remove('has-app-modal');
    onClose?.();
    const fallback = typeof fallbackFocus === 'function' ? fallbackFocus() : fallbackFocus;
    focus(destination?.isConnected && !destination.disabled ? destination : fallback);
    target.scrollTo({ left: scroll.x, top: scroll.y, behavior: 'instant' });
    return true;
  }
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  return { open: show, close, get isOpen() { return open; },
    suspend() { if (!open) return; suspended = true; overlay.inert = true; panel.setAttribute('aria-hidden', 'true'); panel.removeAttribute('aria-modal'); },
    resume() { if (!open) return; suspended = false; overlay.inert = false; panel.removeAttribute('aria-hidden'); panel.setAttribute('aria-modal', 'true'); doc.body.classList.add('has-app-modal'); focus(panel); },
  };
}

export function showToast(message, type = "info", options = {}) {
  const { duration = 4500 } = options;
  const root = getFeedbackRoot();
  const toast = document.createElement("div");
  const isError = type === "error" || type === "warning";

  toast.className = `app-toast app-toast--${type}`;
  toast.setAttribute("role", isError ? "alert" : "status");
  toast.setAttribute("aria-live", isError ? "assertive" : "polite");
  toast.innerHTML = `
    <span class="app-toast__icon" aria-hidden="true"></span>
    <p class="app-toast__message"></p>
    <button class="app-toast__close" type="button" aria-label="ปิดข้อความ">×</button>
  `;
  toast.querySelector(".app-toast__message").textContent = message;
  root.append(toast);

  let timeoutId = window.setTimeout(removeToast, duration);
  toast.querySelector(".app-toast__close").addEventListener("click", removeToast);

  function removeToast() {
    window.clearTimeout(timeoutId);
    toast.classList.add("is-leaving");
    window.setTimeout(() => toast.remove(), 180);
  }

  return toast;
}

export function showActionModal({
  title,
  message,
  detail = "",
  actionLabel,
  closeLabel = "ปิด",
  onAction,
}) {
  const root = getFeedbackRoot();
  const previousFocus = document.activeElement;
  const modal = document.createElement("div");
  modal.className = "app-confirm-overlay app-alert-overlay";
  modal.innerHTML = `
    <section class="app-confirm-modal app-alert-modal" role="alertdialog" aria-modal="true" aria-labelledby="appAlertTitle" aria-describedby="appAlertMessage">
      <div class="app-confirm-modal__icon app-alert-modal__icon" aria-hidden="true">!</div>
      <h2 id="appAlertTitle"></h2>
      <p id="appAlertMessage"></p>
      <p class="app-alert-modal__detail"></p>
      <div class="app-confirm-modal__actions">
        <button class="app-confirm-modal__cancel" type="button"></button>
        <button class="app-confirm-modal__confirm" type="button"></button>
      </div>
    </section>
  `;
  modal.querySelector("#appAlertTitle").textContent = title;
  modal.querySelector("#appAlertMessage").textContent = message;
  const detailElement = modal.querySelector(".app-alert-modal__detail");
  detailElement.textContent = detail;
  detailElement.hidden = !detail;
  const closeButton = modal.querySelector(".app-confirm-modal__cancel");
  const actionButton = modal.querySelector(".app-confirm-modal__confirm");
  closeButton.textContent = closeLabel;
  actionButton.textContent = actionLabel;
  root.append(modal);
  document.body.classList.add("has-app-modal");

  let isClosed = false;
  function close(restoreFocus = true) {
    if (isClosed) return;
    isClosed = true;
    modal.classList.add("is-leaving");
    document.body.classList.remove("has-app-modal");
    document.removeEventListener("keydown", handleEscape);
    window.setTimeout(() => {
      modal.remove();
      if (restoreFocus) previousFocus?.focus?.();
    }, 180);
  }
  function handleEscape(event) {
    if (event.key === "Escape") close();
  }
  closeButton.addEventListener("click", () => close());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
  document.addEventListener("keydown", handleEscape);
  actionButton.addEventListener("click", () => {
    close(false);
    onAction?.();
  });
  actionButton.focus();
  return close;
}

export function setButtonLoading(button, isLoading, loadingLabel, defaultLabel) {
  if (!button) {
    return;
  }

  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = defaultLabel || button.textContent.trim();
  }

  button.disabled = isLoading;
  button.classList.toggle("is-loading", isLoading);
  button.setAttribute("aria-busy", String(isLoading));
  button.textContent = isLoading ? loadingLabel : button.dataset.defaultLabel;
}

export function showConfirmModal({
  title,
  message,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  loadingLabel = "กำลังดำเนินการ...",
  closeOnBackdrop = false,
  reasonLabel = "",
  reasonMaxLength = 2000,
  returnFocus,
  fallbackFocus,
  parentModal,
  variant,
  initialReason = "",
  onReasonChange,
  onClose,
  onConfirm,
}) {
  const root = getFeedbackRoot();
  // Callers that disable the opener before mounting must pass it explicitly.
  const previousFocus = returnFocus ?? document.activeElement;
  parentModal?.suspend();
  const modal = document.createElement("div");

  modal.className = "app-confirm-overlay";
  if (['teacher', 'department_head'].includes(document.body.dataset.workflowRole)) modal.dataset.intent = ['primary', 'success', 'danger'].includes(variant) ? variant : 'primary';
  modal.innerHTML = `
    <section class="app-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="appConfirmTitle" aria-describedby="appConfirmMessage">
      <div class="app-confirm-modal__icon" aria-hidden="true">!</div>
      <h2 id="appConfirmTitle"></h2>
      <p id="appConfirmMessage"></p>
      <div class="app-confirm-modal__actions">
        <button class="app-confirm-modal__cancel" type="button"></button>
        <button class="app-confirm-modal__confirm" type="button"></button>
      </div>
    </section>
  `;

  const cancelButton = modal.querySelector(".app-confirm-modal__cancel");
  const confirmButton = modal.querySelector(".app-confirm-modal__confirm");
  modal.querySelector("#appConfirmTitle").textContent = title;
  modal.querySelector("#appConfirmMessage").textContent = message;
  let reasonInput;
  if (reasonLabel) {
    const label = document.createElement("label");
    label.className = "app-confirm-modal__reason";
    label.textContent = reasonLabel;
    reasonInput = document.createElement("textarea");
    reasonInput.required = true;
    reasonInput.maxLength = reasonMaxLength;
    reasonInput.rows = 4;
    reasonInput.value = initialReason.slice(0, reasonMaxLength);
    reasonInput.addEventListener("input", () => onReasonChange?.(reasonInput.value));
    label.append(reasonInput);
    modal.querySelector(".app-confirm-modal").append(label);
  }
  const errorMessage = document.createElement("p");
  errorMessage.className = "app-confirm-modal__error";
  errorMessage.setAttribute("role", "alert");
  modal.querySelector(".app-confirm-modal").append(errorMessage, modal.querySelector(".app-confirm-modal__actions"));
  cancelButton.textContent = cancelLabel;
  confirmButton.textContent = confirmLabel;
  root.append(modal);
  document.body.classList.add("has-app-modal");
  confirmButton.focus();

  let isSubmitting = false;
  let isClosed = false;

  function close() {
    if (isSubmitting || isClosed) {
      return;
    }

    isClosed = true;
    modal.classList.add("is-leaving");
    if (parentModal) {
      modal.inert = true;
      modal.querySelector('[role="dialog"]').removeAttribute("aria-modal");
    }
    document.body.classList.toggle("has-app-modal", !!parentModal?.isOpen);
    document.removeEventListener("keydown", handleEscape);
    onClose?.();
    parentModal?.resume();
    window.setTimeout(() => {
      modal.remove();
      for (const target of [previousFocus, fallbackFocus]) {
        const element = typeof target === "function" ? target() : target;
        if (!element?.isConnected || element.disabled) continue;
        let hidden = false;
        for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
          if (ancestor.hidden || ancestor.inert) { hidden = true; break; }
        }
        if (hidden) continue;
        element.focus?.();
        if (document.activeElement === element) break;
      }
    }, 180);
  }

  cancelButton.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (closeOnBackdrop && event.target === modal) {
      close();
    }
  });
  function handleEscape(event) {
    if (event.key === "Tab") {
      const controls = [reasonInput, cancelButton, confirmButton].filter(button => button && !button.disabled);
      if (!controls.length) { event.preventDefault(); return; }
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      return;
    }
    if (event.key !== "Escape") {
      return;
    }

    close();
  }
  document.addEventListener("keydown", handleEscape);
  confirmButton.addEventListener("click", async () => {
    if (isSubmitting || isClosed) {
      return;
    }

    if (reasonInput && (!reasonInput.value.trim() || reasonInput.value.trim().length > reasonMaxLength)) {
      errorMessage.textContent = `กรุณาระบุเหตุผลไม่เกิน ${reasonMaxLength} ตัวอักษร`;
      reasonInput.focus();
      return;
    }
    errorMessage.textContent = "";

    isSubmitting = true;
    if (reasonInput) reasonInput.disabled = true;
    cancelButton.disabled = true;
    setButtonLoading(confirmButton, true, loadingLabel, confirmLabel);

    try {
      await onConfirm?.(reasonInput?.value.trim());
      isSubmitting = false;
      close();
    } catch (error) {
      isSubmitting = false;
      if (reasonInput) reasonInput.disabled = false;
      cancelButton.disabled = false;
      setButtonLoading(confirmButton, false, loadingLabel, confirmLabel);
      errorMessage.textContent = error.message || "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง";
    }
  });
  return close;
}
