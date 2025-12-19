import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

// Mock Next.js router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock actions
const mockSignInAction = vi.fn();
const mockSignUpAction = vi.fn();
vi.mock("@/actions", () => ({
  signIn: mockSignInAction,
  signUp: mockSignUpAction,
}));

// Mock anonymous work tracker
const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: mockGetAnonWorkData,
  clearAnonWork: mockClearAnonWork,
}));

// Mock project actions
const mockGetProjects = vi.fn();
const mockCreateProject = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: mockGetProjects,
}));
vi.mock("@/actions/create-project", () => ({
  createProject: mockCreateProject,
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    test("returns signIn, signUp, and isLoading", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current).toHaveProperty("signIn");
      expect(result.current).toHaveProperty("signUp");
      expect(result.current).toHaveProperty("isLoading");
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signIn", () => {
    test("sets loading state during sign in", async () => {
      mockSignInAction.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: false }), 100))
      );

      const { result } = renderHook(() => useAuth());

      const signInPromise = result.current.signIn("test@example.com", "password");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await signInPromise;

      expect(result.current.isLoading).toBe(false);
    });

    test("calls signInAction with email and password", async () => {
      mockSignInAction.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      expect(mockSignInAction).toHaveBeenCalledWith("test@example.com", "password123");
      expect(mockSignInAction).toHaveBeenCalledTimes(1);
    });

    test("returns the result from signInAction on failure", async () => {
      const failureResult = { success: false, error: "Invalid credentials" };
      mockSignInAction.mockResolvedValue(failureResult);

      const { result } = renderHook(() => useAuth());

      const signInResult = await result.current.signIn("test@example.com", "wrong");

      expect(signInResult).toEqual(failureResult);
    });

    test("handles post-sign-in flow with anonymous work", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "Hello" }],
        fileSystemData: { files: [] },
      };
      const newProject = { id: "project-123" };

      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue(newProject);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password");

      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-123");
    });

    test("redirects to most recent project when no anonymous work", async () => {
      const existingProjects = [
        { id: "project-456", name: "Existing Project" },
        { id: "project-789", name: "Older Project" },
      ];

      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue(existingProjects);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password");

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-456");
    });

    test("creates new project when no existing projects", async () => {
      const newProject = { id: "project-new" };

      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue(newProject);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password");

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/project-new");
    });

    test("does not redirect on sign in failure", async () => {
      mockSignInAction.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "wrong");

      expect(mockPush).not.toHaveBeenCalled();
      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
    });

    test("handles anonymous work with empty messages array", async () => {
      const anonWork = {
        messages: [],
        fileSystemData: { files: [] },
      };

      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockGetProjects.mockResolvedValue([{ id: "existing-project" }]);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password");

      // Should skip anon work since messages are empty
      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-project");
    });

    test("resets loading state even if sign in throws error", async () => {
      mockSignInAction.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.signIn("test@example.com", "password")
      ).rejects.toThrow("Network error");

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("sets loading state during sign up", async () => {
      mockSignUpAction.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: false }), 100))
      );

      const { result } = renderHook(() => useAuth());

      const signUpPromise = result.current.signUp("new@example.com", "password");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await signUpPromise;

      expect(result.current.isLoading).toBe(false);
    });

    test("calls signUpAction with email and password", async () => {
      mockSignUpAction.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await result.current.signUp("new@example.com", "password123");

      expect(mockSignUpAction).toHaveBeenCalledWith("new@example.com", "password123");
      expect(mockSignUpAction).toHaveBeenCalledTimes(1);
    });

    test("returns the result from signUpAction on failure", async () => {
      const failureResult = { success: false, error: "Email already exists" };
      mockSignUpAction.mockResolvedValue(failureResult);

      const { result } = renderHook(() => useAuth());

      const signUpResult = await result.current.signUp("existing@example.com", "password");

      expect(signUpResult).toEqual(failureResult);
    });

    test("handles post-sign-up flow with anonymous work", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "Test message" }],
        fileSystemData: { files: [] },
      };
      const newProject = { id: "signup-project-123" };

      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue(newProject);

      const { result } = renderHook(() => useAuth());

      await result.current.signUp("new@example.com", "password");

      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/signup-project-123");
    });

    test("creates new project for new user with no projects", async () => {
      const newProject = { id: "first-project" };

      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue(newProject);

      const { result } = renderHook(() => useAuth());

      await result.current.signUp("new@example.com", "password");

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/first-project");
    });

    test("does not redirect on sign up failure", async () => {
      mockSignUpAction.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await result.current.signUp("new@example.com", "password");

      expect(mockPush).not.toHaveBeenCalled();
      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
    });

    test("resets loading state even if sign up throws error", async () => {
      mockSignUpAction.mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.signUp("new@example.com", "password")
      ).rejects.toThrow("Database error");

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("handles undefined anonymous work data", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(undefined);
      mockGetProjects.mockResolvedValue([{ id: "project-1" }]);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password");

      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-1");
    });

    test("handles concurrent sign in attempts", async () => {
      mockSignInAction.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      const promise1 = result.current.signIn("test1@example.com", "pass1");
      const promise2 = result.current.signIn("test2@example.com", "pass2");

      await Promise.all([promise1, promise2]);

      expect(mockSignInAction).toHaveBeenCalledTimes(2);
      expect(result.current.isLoading).toBe(false);
    });

    test("preserves project creation name format", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "test-project" });

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password");

      const createCall = mockCreateProject.mock.calls[0][0];
      expect(createCall.name).toMatch(/^New Design #\d{1,5}$/);
      expect(parseInt(createCall.name.split("#")[1])).toBeGreaterThanOrEqual(0);
      expect(parseInt(createCall.name.split("#")[1])).toBeLessThan(100000);
    });
  });
});
