import { hasProjectQuery, matchesProject } from "../shared/filter.ts";

export interface ElementLike {
  readonly parentElement: ElementLike | null;
  readonly isConnected: boolean;
  textContent: string | null;
  title: string;
  style: Record<string, string>;
  onclick: (() => void) | null;
  onfocus: (() => void) | null;
  onblur: (() => void) | null;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  closest(selector: string): ElementLike | null;
  appendChild(node: ElementLike): void;
  insertBefore(node: ElementLike, reference: ElementLike | null): void;
  remove(): void;
}

interface InputLike extends ElementLike {
  value: string;
  placeholder: string;
  type: string;
  oninput: (() => void) | null;
  onkeydown: ((event: { key: string; preventDefault(): void }) => void) | null;
  focus(): void;
}

interface ButtonLike extends ElementLike {
  type: string;
}

interface DocumentLike {
  readonly body: ElementLike;
  createElement(tag: string): ElementLike;
  querySelector(selector: string): ElementLike | null;
  querySelectorAll(selector: string): ArrayLike<ElementLike>;
}

interface ObserverLike {
  observe(target: ElementLike, options: { childList: boolean; subtree: boolean }): void;
  disconnect(): void;
}

export interface WebEnvironment {
  document: DocumentLike;
  createObserver(callback: () => void): ObserverLike;
  requestFrame(callback: () => void): number;
  cancelFrame(id: number): void;
  computedBackground(element: ElementLike): string;
}

declare const document: DocumentLike;
declare class MutationObserver {
  constructor(callback: () => void);
  observe(target: ElementLike, options: { childList: boolean; subtree: boolean }): void;
  disconnect(): void;
}
declare function requestAnimationFrame(callback: () => void): number;
declare function cancelAnimationFrame(id: number): void;
declare function getComputedStyle(element: ElementLike): { backgroundColor: string };

const CONTAINER_ID = "paseo-sidebar-project-filter";
const STATUS_ID = "paseo-sidebar-project-filter-status";
const PROJECT_ROW_PREFIX = "sidebar-project-row-";

function browserEnvironment(): WebEnvironment {
  return {
    document,
    createObserver: (callback) => new MutationObserver(callback),
    requestFrame: requestAnimationFrame,
    cancelFrame: cancelAnimationFrame,
    computedBackground: (element) => getComputedStyle(element).backgroundColor,
  };
}

function projectGroups(doc: DocumentLike): Array<{ group: ElementLike; row: ElementLike }> {
  const seen = new Set<ElementLike>();
  const groups: Array<{ group: ElementLike; row: ElementLike }> = [];

  for (const row of Array.from(
    doc.querySelectorAll(`[data-testid^="${PROJECT_ROW_PREFIX}"]`),
  )) {
    const group = row.closest('[role="group"]') ?? row.parentElement ?? row;
    if (seen.has(group)) continue;
    seen.add(group);
    groups.push({ group, row });
  }
  return groups;
}

function projectValues(row: ElementLike): string[] {
  const key = (row.getAttribute("data-testid") ?? "").slice(PROJECT_ROW_PREFIX.length);
  const group = row.closest('[role="group"]');
  const name = group?.getAttribute("aria-label") ?? row.textContent ?? "";
  return [name, key];
}

function readableForeground(element: ElementLike, env: WebEnvironment): string {
  let current: ElementLike | null = element;
  while (current) {
    const match = env.computedBackground(current).match(
      /^rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)(?:\D+([\d.]+))?\s*\)$/,
    );
    if (match && Number(match[4] ?? 1) > 0) {
      const luminance =
        (Number(match[1]) * 0.2126 + Number(match[2]) * 0.7152 + Number(match[3]) * 0.0722) / 255;
      return luminance < 0.5 ? "#a1a1aa" : "#71717a";
    }
    current = current.parentElement;
  }
  return "#71717a";
}

function addFocusRing(element: ElementLike): void {
  element.style.outline = "2px solid currentColor";
  element.style.outlineOffset = "1px";
}

function removeFocusRing(element: ElementLike): void {
  element.style.outline = "none";
  element.style.outlineOffset = "";
}

export function startWebSidebarProjectFilter(
  env: WebEnvironment = browserEnvironment(),
): () => void {
  const doc = env.document;
  const hidden = new Map<ElementLike, string>();
  let query = "";
  let frame: number | null = null;
  let disposed = false;
  let navigation: ElementLike | null = null;
  let input: InputLike | null = null;
  let clearButton: ButtonLike | null = null;
  let status: ElementLike | null = null;

  const restore = () => {
    for (const [group, display] of hidden) group.style.display = display;
    hidden.clear();
  };

  const apply = () => {
    if (disposed) return;
    let matches = 0;
    for (const { group, row } of projectGroups(doc)) {
      const visible = matchesProject(query, projectValues(row));
      if (visible) {
        matches++;
        const display = hidden.get(group);
        if (display !== undefined) {
          group.style.display = display;
          hidden.delete(group);
        }
      } else {
        if (!hidden.has(group)) hidden.set(group, group.style.display);
        group.style.display = "none";
      }
    }

    if (input?.parentElement) {
      const foreground = readableForeground(input.parentElement, env);
      input.style.color = foreground;
      input.style.WebkitTextFillColor = foreground;
      input.style.caretColor = foreground;
      if (clearButton) clearButton.style.color = foreground;
      if (status) status.style.color = foreground;
    }
    if (clearButton) clearButton.style.display = query ? "flex" : "none";
    if (status) status.style.display = hasProjectQuery(query) && matches === 0 ? "block" : "none";
  };

  const sidebarObserver = env.createObserver(() => schedule());

  const mount = () => {
    if (disposed) return;
    const existing = doc.querySelector(`#${CONTAINER_ID}`);
    if (existing) return;

    const newWorkspace = doc.querySelector('[data-testid="sidebar-global-new-workspace"]');
    const nextNavigation = newWorkspace?.parentElement?.parentElement;
    const newWorkspaceRow = newWorkspace?.parentElement;
    if (!nextNavigation || !newWorkspaceRow) return;

    if (navigation !== nextNavigation) {
      sidebarObserver.disconnect();
      navigation = nextNavigation;
      sidebarObserver.observe(navigation, { childList: true, subtree: true });
    }

    const container = doc.createElement("div");
    container.setAttribute("id", CONTAINER_ID);
    Object.assign(container.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      margin: "0 12px 8px",
      boxSizing: "border-box",
      padding: "0 8px",
      height: "32px",
      border: "1px solid rgba(113, 113, 122, 0.35)",
      borderRadius: "7px",
      background: "rgba(127, 127, 127, 0.06)",
    });

    input = doc.createElement("input") as InputLike;
    input.type = "search";
    input.placeholder = "Filter projects…";
    input.value = query;
    input.setAttribute("aria-label", "Filter sidebar projects");
    Object.assign(input.style, {
      flex: "1",
      minWidth: "0",
      height: "100%",
      border: "0",
      background: "transparent",
      color: "inherit",
      font: "inherit",
      fontSize: "13px",
      appearance: "none",
      borderRadius: "5px",
    });
    input.onfocus = () => addFocusRing(input as InputLike);
    input.onblur = () => removeFocusRing(input as InputLike);
    input.oninput = () => {
      query = input?.value ?? "";
      apply();
    };
    input.onkeydown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      query = "";
      if (input) input.value = "";
      apply();
    };

    clearButton = doc.createElement("button") as ButtonLike;
    clearButton.type = "button";
    clearButton.textContent = "×";
    clearButton.title = "Clear project filter";
    clearButton.setAttribute("aria-label", "Clear project filter");
    Object.assign(clearButton.style, {
      display: query ? "flex" : "none",
      alignItems: "center",
      justifyContent: "center",
      width: "22px",
      height: "22px",
      padding: "0",
      border: "0",
      borderRadius: "5px",
      background: "transparent",
      color: "inherit",
      cursor: "pointer",
      fontSize: "18px",
    });
    clearButton.onfocus = () => addFocusRing(clearButton as ButtonLike);
    clearButton.onblur = () => removeFocusRing(clearButton as ButtonLike);
    clearButton.onclick = () => {
      query = "";
      if (input) {
        input.value = "";
        input.focus();
      }
      apply();
    };

    status = doc.createElement("div");
    status.setAttribute("id", STATUS_ID);
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.textContent = "No matching projects";
    Object.assign(status.style, {
      display: "none",
      margin: "0 16px 8px",
      fontSize: "12px",
    });

    container.appendChild(input);
    container.appendChild(clearButton);
    navigation.insertBefore(container, newWorkspaceRow);
    navigation.insertBefore(status, newWorkspaceRow);
  };

  const schedule = () => {
    if (disposed || frame !== null) return;
    frame = env.requestFrame(() => {
      frame = null;
      if (disposed) return;
      mount();
      apply();
    });
  };

  const bodyObserver = env.createObserver(() => {
    if (!navigation?.isConnected) schedule();
  });
  bodyObserver.observe(doc.body, { childList: true, subtree: true });
  mount();
  apply();

  return () => {
    disposed = true;
    if (frame !== null) env.cancelFrame(frame);
    frame = null;
    bodyObserver.disconnect();
    sidebarObserver.disconnect();
    restore();
    doc.querySelector(`#${CONTAINER_ID}`)?.remove();
    doc.querySelector(`#${STATUS_ID}`)?.remove();
    navigation = null;
    input = null;
    clearButton = null;
    status = null;
  };
}
