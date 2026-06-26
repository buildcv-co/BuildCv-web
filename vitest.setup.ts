import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

if (typeof HTMLDialogElement !== "undefined") {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
      this.dispatchEvent(new Event("cancel"));
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
      this.dispatchEvent(new Event("close"));
    };
  }
}

afterEach(() => {
  cleanup();
});
