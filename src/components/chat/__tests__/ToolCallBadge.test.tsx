import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";
import { describe, test, expect, afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

describe("ToolCallBadge", () => {
  describe("str_replace_editor tool", () => {
    test("displays 'Creating' message for create command", () => {
      const toolInvocation = {
        state: "result",
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/components/Card.jsx",
          file_text: "export default function Card() {}",
        }),
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("Creating Card.jsx")).toBeDefined();
    });

    test("displays 'Editing' message for str_replace command", () => {
      const toolInvocation = {
        state: "result",
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "str_replace",
          path: "/App.jsx",
          old_str: "old code",
          new_str: "new code",
        }),
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("Editing App.jsx")).toBeDefined();
    });

    test("displays 'Editing' message for insert command", () => {
      const toolInvocation = {
        state: "result",
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "insert",
          path: "/utils/helpers.ts",
          insert_line: 10,
          new_str: "// New code",
        }),
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("Editing helpers.ts")).toBeDefined();
    });

    test("displays 'Viewing' message for view command", () => {
      const toolInvocation = {
        state: "result",
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "view",
          path: "/README.md",
        }),
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("Viewing README.md")).toBeDefined();
    });

    test("displays 'Undoing edit' message for undo_edit command", () => {
      const toolInvocation = {
        state: "result",
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "undo_edit",
          path: "/components/Button.jsx",
        }),
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("Undoing edit in Button.jsx")).toBeDefined();
    });

    test("handles nested file paths correctly", () => {
      const toolInvocation = {
        state: "result",
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/src/components/ui/Card.tsx",
        }),
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("Creating Card.tsx")).toBeDefined();
    });
  });

  describe("file_manager tool", () => {
    test("displays 'Renaming' message for rename command", () => {
      const toolInvocation = {
        state: "result",
        toolName: "file_manager",
        args: JSON.stringify({
          command: "rename",
          path: "/OldComponent.jsx",
          new_path: "/NewComponent.jsx",
        }),
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(
        screen.getByText("Renaming OldComponent.jsx to NewComponent.jsx")
      ).toBeDefined();
    });

    test("displays 'Deleting' message for delete command", () => {
      const toolInvocation = {
        state: "result",
        toolName: "file_manager",
        args: JSON.stringify({
          command: "delete",
          path: "/components/Unused.jsx",
        }),
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("Deleting Unused.jsx")).toBeDefined();
    });
  });

  describe("loading state", () => {
    test("shows loading spinner when state is not 'result'", () => {
      const toolInvocation = {
        state: "in_progress",
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/Loading.jsx",
        }),
      };

      const { container } = render(
        <ToolCallBadge toolInvocation={toolInvocation} />
      );
      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeDefined();
    });

    test("shows green dot when state is 'result'", () => {
      const toolInvocation = {
        state: "result",
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/Complete.jsx",
        }),
      };

      const { container } = render(
        <ToolCallBadge toolInvocation={toolInvocation} />
      );
      const greenDot = container.querySelector(".bg-emerald-500");
      expect(greenDot).toBeDefined();
    });
  });

  describe("args parsing", () => {
    test("handles args as object instead of string", () => {
      const toolInvocation = {
        state: "result",
        toolName: "str_replace_editor",
        args: {
          command: "create",
          path: "/DirectObject.jsx",
        },
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("Creating DirectObject.jsx")).toBeDefined();
    });

    test("handles missing args gracefully", () => {
      const toolInvocation = {
        state: "result",
        toolName: "str_replace_editor",
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("str_replace_editor")).toBeDefined();
    });

    test("handles invalid JSON gracefully", () => {
      const toolInvocation = {
        state: "result",
        toolName: "str_replace_editor",
        args: "invalid json {",
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("str_replace_editor")).toBeDefined();
    });
  });

  describe("unknown tools", () => {
    test("displays tool name for unknown tools", () => {
      const toolInvocation = {
        state: "result",
        toolName: "unknown_tool",
        args: JSON.stringify({ some: "data" }),
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("unknown_tool")).toBeDefined();
    });
  });

  describe("styling", () => {
    test("applies correct CSS classes", () => {
      const toolInvocation = {
        state: "result",
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/Test.jsx",
        }),
      };

      const { container } = render(
        <ToolCallBadge toolInvocation={toolInvocation} />
      );
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain("inline-flex");
      expect(badge.className).toContain("items-center");
      expect(badge.className).toContain("bg-neutral-50");
      expect(badge.className).toContain("rounded-lg");
    });
  });
});
