"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocation {
  state: string;
  toolName: string;
  args?: any;
  result?: any;
}

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

function getToolCallMessage(toolName: string, args?: any): string {
  if (!args) {
    return toolName;
  }

  try {
    // Parse args if it's a string
    const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;

    if (toolName === "str_replace_editor") {
      const { command, path } = parsedArgs;
      const fileName = path?.split("/").pop() || path;

      switch (command) {
        case "create":
          return `Creating ${fileName}`;
        case "str_replace":
          return `Editing ${fileName}`;
        case "insert":
          return `Editing ${fileName}`;
        case "view":
          return `Viewing ${fileName}`;
        case "undo_edit":
          return `Undoing edit in ${fileName}`;
        default:
          return `Modifying ${fileName}`;
      }
    }

    if (toolName === "file_manager") {
      const { command, path, new_path } = parsedArgs;
      const fileName = path?.split("/").pop() || path;

      switch (command) {
        case "rename":
          const newFileName = new_path?.split("/").pop() || new_path;
          return `Renaming ${fileName} to ${newFileName}`;
        case "delete":
          return `Deleting ${fileName}`;
        default:
          return `Managing ${fileName}`;
      }
    }

    // Default fallback
    return toolName;
  } catch (error) {
    // If parsing fails, return the tool name
    return toolName;
  }
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const { state, toolName, args } = toolInvocation;
  const message = getToolCallMessage(toolName, args);
  const isComplete = state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isComplete ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-700">{message}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{message}</span>
        </>
      )}
    </div>
  );
}
