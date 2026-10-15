import { Platform } from "react-native";
import { matchesProject } from "../shared/filter";

interface ElementLike {
  readonly parentElement: ElementLike | null;
  readonly isConnected: boolean;
  textContent: string | null;
  title: string;
  style: Record<string, string>;
  onclick: (() => void) | null;
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

declare const document: {
  readonly body: ElementLike;
  createElement(tag: string): ElementLike;
  querySelector(selector: string): ElementLike | null;
  querySelectorAll(selector: string): ArrayLike<ElementLike>;
};

declare class MutationObserver {
  constructor(callback: () => void);
  observe(target: ElementLike, options: { childList: boolean; subtree: boolean }): void;
  disconnect(): void;
}

declare function requestAnimationFrame(callback: () => void): number;
declare function getComputedStyle(element: ElementLike): {
  color: string;
  backgroundColor: string;
};

const CONTAINER_ID = "paseo-sidebar-project-filter";
const PROJECT_ROW_PREFIX = "sidebar-project-row-";

function projectGroups(): Array<{ group: ElementLike; row: ElementLike }> {
  const seen = new Set<ElementLike>();
  const groups: Array<{ group: ElementLike; row: ElementLike }> = [];

  for (const row of Array.from(
    document.querySelectorAll(`[data-testid^="${PROJECT_ROW_PREFIX}"]`),
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

function readableForeground(element: ElementLike): string {
  let current: ElementLike | null = element;
  while (current) {
    const match = getComputedStyle(current).backgroundColor.match(
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

export function startSidebarProjectFilter(): () => void {
  if (Platform.OS !== "web") return () => {};

  const hidden = new Set<ElementLike>();
  let query = "";
  let scheduled = false;
  let input: InputLike | null = null;
  let clearButton: ButtonLike | null = null;

  const restore = () => {
    for (const group of hidden) group.style.display = "";
    hidden.clear();
  };

  const apply = () => {
    for (const group of Array.from(hidden)) {
      if (!group.isConnected) hidden.delete(group);
    }
    for (const { group, row } of projectGroups()) {
      const visible = matchesProject(query, projectValues(row));
      if (visible) {
        if (hidden.delete(group)) group.style.display = "";
      } else {
        hidden.add(group);
        group.style.display = "none";
      }
    }
    if (input?.parentElement) {
      const foreground = readableForeground(input.parentElement);
      input.style.color = foreground;
      input.style.WebkitTextFillColor = foreground;
      input.style.caretColor = foreground;
      if (clearButton) clearButton.style.color = foreground;
    }
    if (clearButton) clearButton.style.display = query ? "flex" : "none";
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      mount();
      apply();
    });
  };

  const mount = () => {
    const existing = document.querySelector(`#${CONTAINER_ID}`);
    if (existing) return;
    const newWorkspace = document.querySelector('[data-testid="sidebar-global-new-workspace"]');
    const navigation = newWorkspace?.parentElement?.parentElement;
    const newWorkspaceRow = newWorkspace?.parentElement;
    if (!navigation || !newWorkspaceRow) return;

    const container = document.createElement("div");
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

    input = document.createElement("input") as InputLike;
    input.type = "search";
    input.placeholder = "Filter projects…";
    input.value = query;
    input.setAttribute("aria-label", "Filter sidebar projects");
    Object.assign(input.style, {
      flex: "1",
      minWidth: "0",
      height: "100%",
      border: "0",
      outline: "none",
      background: "transparent",
      color: "inherit",
      font: "inherit",
      fontSize: "13px",
      appearance: "none",
    });
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

    clearButton = document.createElement("button") as ButtonLike;
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
    clearButton.onclick = () => {
      query = "";
      if (input) {
        input.value = "";
        input.focus();
      }
      apply();
    };

    container.appendChild(input);
    container.appendChild(clearButton);
    navigation.insertBefore(container, newWorkspaceRow);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  mount();
  apply();

  return () => {
    observer.disconnect();
    restore();
    document.querySelector(`#${CONTAINER_ID}`)?.remove();
    input = null;
    clearButton = null;
  };
}
