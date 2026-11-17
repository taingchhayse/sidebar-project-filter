import assert from "node:assert/strict";
import test from "node:test";
import { startWebSidebarProjectFilter } from "./web.ts";

class FakeElement {
  constructor(tag, document) {
    this.tag = tag;
    this.document = document;
    this.parentElement = null;
    this.children = [];
    this.attributes = new Map();
    this.style = {};
    this.textContent = null;
    this.title = "";
    this.onclick = null;
    this.onfocus = null;
    this.onblur = null;
    this.oninput = null;
    this.onkeydown = null;
    this.value = "";
    this.placeholder = "";
    this.type = "";
    this.focused = false;
  }

  get isConnected() {
    let current = this;
    while (current) {
      if (current === this.document.body) return true;
      current = current.parentElement;
    }
    return false;
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (matchesSelector(current, selector)) return current;
      current = current.parentElement;
    }
    return null;
  }

  appendChild(node) {
    this.insertBefore(node, null);
  }

  insertBefore(node, reference) {
    node.remove();
    node.parentElement = this;
    const index = reference ? this.children.indexOf(reference) : -1;
    if (index < 0) this.children.push(node);
    else this.children.splice(index, 0, node);
  }

  remove() {
    if (!this.parentElement) return;
    const index = this.parentElement.children.indexOf(this);
    if (index >= 0) this.parentElement.children.splice(index, 1);
    this.parentElement = null;
  }

  focus() {
    this.focused = true;
    this.onfocus?.();
  }
}

function matchesSelector(element, selector) {
  if (selector.startsWith("#")) return element.getAttribute("id") === selector.slice(1);
  const prefix = selector.match(/^\[([^=]+)\^="([^"]+)"\]$/);
  if (prefix) return (element.getAttribute(prefix[1]) ?? "").startsWith(prefix[2]);
  const exact = selector.match(/^\[([^=]+)="([^"]+)"\]$/);
  if (exact) return element.getAttribute(exact[1]) === exact[2];
  return false;
}

function descendants(root) {
  return [root, ...root.children.flatMap(descendants)];
}

function createFixture() {
  const document = {};
  document.body = new FakeElement("body", document);
  document.createElement = (tag) => new FakeElement(tag, document);
  document.querySelectorAll = (selector) =>
    descendants(document.body).filter((element) => matchesSelector(element, selector));
  document.querySelector = (selector) => document.querySelectorAll(selector)[0] ?? null;

  const navigation = document.createElement("nav");
  document.body.appendChild(navigation);

  const project = document.createElement("section");
  project.setAttribute("role", "group");
  project.setAttribute("aria-label", "Payments");
  project.style.display = "flex";
  const projectRow = document.createElement("button");
  projectRow.setAttribute("data-testid", "sidebar-project-row-/repos/payments");
  project.appendChild(projectRow);
  navigation.appendChild(project);

  const newWorkspaceRow = document.createElement("div");
  const newWorkspace = document.createElement("button");
  newWorkspace.setAttribute("data-testid", "sidebar-global-new-workspace");
  newWorkspaceRow.appendChild(newWorkspace);
  navigation.appendChild(newWorkspaceRow);

  const observers = [];
  let nextFrame = 1;
  const frames = new Map();
  const env = {
    document,
    createObserver(callback) {
      const observer = {
        callback,
        target: null,
        disconnected: false,
        observe(target) {
          this.target = target;
          this.disconnected = false;
        },
        disconnect() {
          this.disconnected = true;
          this.target = null;
        },
        trigger() {
          if (!this.disconnected) this.callback();
        },
      };
      observers.push(observer);
      return observer;
    },
    requestFrame(callback) {
      const id = nextFrame++;
      frames.set(id, callback);
      return id;
    },
    cancelFrame(id) {
      frames.delete(id);
    },
    computedBackground() {
      return "rgb(255, 255, 255)";
    },
  };

  return {
    document,
    env,
    navigation,
    project,
    observers,
    frames,
    flushFrames() {
      const queued = [...frames.values()];
      frames.clear();
      queued.forEach((callback) => callback());
    },
  };
}

test("cleanup cancels queued work and restores the exact display value", () => {
  const fixture = createFixture();
  const cleanup = startWebSidebarProjectFilter(fixture.env);
  const input = fixture.document.querySelector("#paseo-sidebar-project-filter").children[0];

  input.value = "missing";
  input.oninput();
  assert.equal(fixture.project.style.display, "none");
  assert.equal(
    fixture.document.querySelector("#paseo-sidebar-project-filter-status").style.display,
    "block",
  );

  const sidebarObserver = fixture.observers.find((observer) => observer.target === fixture.navigation);
  sidebarObserver.trigger();
  assert.equal(fixture.frames.size, 1);

  cleanup();
  fixture.flushFrames();

  assert.equal(fixture.project.style.display, "flex");
  assert.equal(fixture.document.querySelector("#paseo-sidebar-project-filter"), null);
  assert.equal(fixture.document.querySelector("#paseo-sidebar-project-filter-status"), null);
});

test("unrelated body mutations do not schedule a sidebar rescan", () => {
  const fixture = createFixture();
  const cleanup = startWebSidebarProjectFilter(fixture.env);
  const bodyObserver = fixture.observers.find(
    (observer) => observer.target === fixture.document.body,
  );
  const sidebarObserver = fixture.observers.find((observer) => observer.target === fixture.navigation);

  bodyObserver.trigger();
  assert.equal(fixture.frames.size, 0);

  sidebarObserver.trigger();
  assert.equal(fixture.frames.size, 1);

  cleanup();
});

test("the filter remounts once when Paseo replaces the sidebar", () => {
  const fixture = createFixture();
  const cleanup = startWebSidebarProjectFilter(fixture.env);
  const bodyObserver = fixture.observers.find(
    (observer) => observer.target === fixture.document.body,
  );

  fixture.navigation.remove();
  const replacement = fixture.document.createElement("nav");
  const newWorkspaceRow = fixture.document.createElement("div");
  const newWorkspace = fixture.document.createElement("button");
  newWorkspace.setAttribute("data-testid", "sidebar-global-new-workspace");
  newWorkspaceRow.appendChild(newWorkspace);
  replacement.appendChild(newWorkspaceRow);
  fixture.document.body.appendChild(replacement);

  bodyObserver.trigger();
  fixture.flushFrames();

  const filter = fixture.document.querySelector("#paseo-sidebar-project-filter");
  assert.equal(filter.parentElement, replacement);
  assert.equal(
    fixture.document.querySelectorAll("#paseo-sidebar-project-filter").length,
    1,
  );

  cleanup();
});

test("clear restores projects and focus rings are visible", () => {
  const fixture = createFixture();
  const cleanup = startWebSidebarProjectFilter(fixture.env);
  const container = fixture.document.querySelector("#paseo-sidebar-project-filter");
  const [input, clearButton] = container.children;

  input.focus();
  assert.equal(input.style.outline, "2px solid currentColor");
  input.onblur();
  assert.equal(input.style.outline, "none");

  input.value = "missing";
  input.oninput();
  clearButton.onclick();

  assert.equal(input.value, "");
  assert.equal(input.focused, true);
  assert.equal(fixture.project.style.display, "flex");
  assert.equal(
    fixture.document.querySelector("#paseo-sidebar-project-filter-status").style.display,
    "none",
  );

  cleanup();
});
