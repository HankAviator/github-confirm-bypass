// ==UserScript==
// @name         GitHub Confirm Bypass
// @namespace    https://github.com/HankAviator/github-confirm-bypass
// @version      0.1.0
// @description  Fill GitHub dangerous-action confirmation inputs automatically.
// @author       HankAviator
// @match        https://github.com/*
// @match        https://www.github.com/*
// @grant        none
// @run-at       document-idle
// @license      GPL-3.0-only
// ==/UserScript==

(function () {
  "use strict";

  let pendingFill = false;
  let currentUrl = window.location.href;
  const pendingRoots = new Set();

  const CONFIRMATION_TEXT_PATTERNS = [
    /\btype\s+(.+?)\s+to\s+confirm\b/i,
    /\bplease\s+type\s+(.+?)\s+to\s+confirm\b/i,
  ];

  const INPUT_SELECTORS = [
    "input[type='text'][aria-label*='to confirm' i]",
    "input[type='text'][name*='to confirm' i]",
    "input[type='text'][name='verify']",
    "input[type='text'][data-repo-nwo]",
    "input[type='text'][data-testid*='confirmation' i]",
  ].join(",");

  function cleanConfirmationText(value) {
    return value
      .replace(/^[`"']+|[`"'.]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getCandidateTextFromElement(element) {
    const text = element.textContent || "";

    for (const pattern of CONFIRMATION_TEXT_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return cleanConfirmationText(match[1]);
      }
    }

    return "";
  }

  function getConfirmationTextFromLabel(input) {
    const labelledBy = input.getAttribute("aria-labelledby");
    if (labelledBy) {
      for (const id of labelledBy.split(/\s+/)) {
        const label = document.getElementById(id);
        const value = label && getCandidateTextFromElement(label);
        if (value) return value;
      }
    }

    if (input.id) {
      const label = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
      const value = label && getCandidateTextFromElement(label);
      if (value) return value;
    }

    return "";
  }

  function getConfirmationTextFromNearbyContent(input) {
    let current = input.parentElement;

    for (let depth = 0; current && depth < 6; depth += 1) {
      const value = getCandidateTextFromElement(current);
      if (value) return value;
      current = current.parentElement;
    }

    return "";
  }

  function getConfirmationTextFromAttributes(input) {
    const repoNameWithOwner = input.getAttribute("data-repo-nwo") || "";
    const ariaLabel = input.getAttribute("aria-label") || "";
    const name = input.getAttribute("name") || "";

    if (repoNameWithOwner) return repoNameWithOwner;

    for (const value of [ariaLabel, name]) {
      const text = getCandidateTextFromElement({ textContent: value });
      if (text) return text;
    }

    return "";
  }

  function getConfirmationText(input) {
    return (
      getConfirmationTextFromLabel(input) ||
      getConfirmationTextFromAttributes(input) ||
      getConfirmationTextFromNearbyContent(input)
    );
  }

  function setNativeInputValue(input, value) {
    const prototype = Object.getPrototypeOf(input);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

    if (descriptor && descriptor.set) {
      descriptor.set.call(input, value);
    } else {
      input.value = value;
    }
  }

  function notifyInputChanged(input) {
    input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: input.value }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function fillConfirmationInput(input) {
    if (!(input instanceof HTMLInputElement)) return;
    if (input.disabled || input.readOnly) return;

    const confirmationText = getConfirmationText(input);
    if (!confirmationText || input.value === confirmationText) return;

    setNativeInputValue(input, confirmationText);
    notifyInputChanged(input);
  }

  function fillConfirmations(root = document) {
    if (root instanceof HTMLInputElement && root.matches(INPUT_SELECTORS)) {
      fillConfirmationInput(root);
    }

    const inputs = root.querySelectorAll ? root.querySelectorAll(INPUT_SELECTORS) : [];
    inputs.forEach(fillConfirmationInput);
  }

  function scheduleFill(root = document) {
    pendingRoots.add(root);
    if (pendingFill) return;

    pendingFill = true;
    window.requestAnimationFrame(() => {
      pendingFill = false;
      const roots = [...pendingRoots];
      pendingRoots.clear();

      if (roots.includes(document)) {
        fillConfirmations(document);
        return;
      }

      roots.forEach(fillConfirmations);
    });
  }

  function dispatchLocationChange() {
    if (window.location.href === currentUrl) return;

    currentUrl = window.location.href;
    window.dispatchEvent(new Event("locationchange"));
  }

  function wrapHistoryMethod(methodName) {
    const original = history[methodName];
    history[methodName] = function () {
      const result = original.apply(this, arguments);
      dispatchLocationChange();
      return result;
    };
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) scheduleFill(node);
      }
    }
  });

  wrapHistoryMethod("pushState");
  wrapHistoryMethod("replaceState");

  fillConfirmations();
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("popstate", dispatchLocationChange);
  window.addEventListener("locationchange", () => scheduleFill(document));
  document.addEventListener("turbo:load", () => scheduleFill(document));
  document.addEventListener("turbo:render", () => scheduleFill(document));
})();
