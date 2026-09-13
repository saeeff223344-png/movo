import { describe, expect, it, vi } from "vitest";
import {
  buildOpenProjectHref,
  deriveProjectTitle,
  loadRecentProjects,
  loadRecentReadyVideos,
  mapProjectRowToSummary,
  mapVideoRowToSummary,
  type ProjectSummaryRow,
  type ProjectTitleSource,
  type VideoSummaryRow,
} from "@/lib/dashboard/recent-activity";

function projectRow(overrides: Partial<ProjectSummaryRow> = {}): ProjectSummaryRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    prompt: "أنشئ إعلان فيديو لمنتجي الجديد",
    business_name: null,
    aspect_ratio: "9:16",
    duration_seconds: 24,
    status: "ready",
    scene_plan: null,
    created_at: "2026-09-13T11:53:45.893899+00:00",
    ...overrides,
  };
}

function videoRow(overrides: Partial<VideoSummaryRow> = {}): VideoSummaryRow {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    project_id: "11111111-1111-1111-1111-111111111111",
    duration_seconds: 23,
    aspect_ratio: "9:16",
    created_at: "2026-09-13T09:57:03.056048+00:00",
    ...overrides,
  };
}

describe("deriveProjectTitle", () => {
  it("prefers scene_plan.videoTitle when present", () => {
    const title = deriveProjectTitle({ prompt: "prompt", business_name: "Biz", scene_plan: { videoTitle: "حوّل فكرتك إلى إعلان جاهز" } });
    expect(title).toBe("حوّل فكرتك إلى إعلان جاهز");
  });

  it("falls back to business_name when scene_plan has no usable videoTitle", () => {
    const title = deriveProjectTitle({ prompt: "prompt", business_name: "منصة MOVO", scene_plan: null });
    expect(title).toBe("منصة MOVO");
  });

  it("falls back to a truncated prompt when there is no business_name", () => {
    const title = deriveProjectTitle({ prompt: "أنشئ إعلان فيديو احترافي وسريع لمنصة MOVO", business_name: null, scene_plan: null });
    expect(title).toBe("أنشئ إعلان فيديو احترافي وسريع لمنصة MOVO");
  });

  it("falls back to a generic Arabic label when prompt/business_name/scene_plan are all empty", () => {
    const title = deriveProjectTitle({ prompt: "   ", business_name: "", scene_plan: null });
    expect(title).toBe("مشروع بدون عنوان");
  });

  it("never throws on malformed/legacy scene_plan JSON (an array, or an object missing videoTitle)", () => {
    expect(() => deriveProjectTitle({ prompt: "fallback prompt", business_name: null, scene_plan: [] })).not.toThrow();
    expect(() => deriveProjectTitle({ prompt: "fallback prompt", business_name: null, scene_plan: { scenes: [] } })).not.toThrow();
    expect(() => deriveProjectTitle({ prompt: "fallback prompt", business_name: null, scene_plan: "not even an object" })).not.toThrow();
  });
});

describe("mapProjectRowToSummary", () => {
  it("maps a real project row into the dashboard card shape", () => {
    const summary = mapProjectRowToSummary(projectRow({ scene_plan: { videoTitle: "حوّل فكرتك إلى إعلان جاهز مع موفو" } }));
    expect(summary).toMatchObject({
      id: "11111111-1111-1111-1111-111111111111",
      title: "حوّل فكرتك إلى إعلان جاهز مع موفو",
      status: "ready",
      aspectRatio: "9:16",
      duration: 24,
    });
    expect(typeof summary.createdAt).toBe("string");
    expect(summary.createdAt.length).toBeGreaterThan(0);
  });

  it("passes every real ProjectStatus value through unchanged", () => {
    for (const status of ["draft", "planning", "generating", "ready", "rendering", "failed"] as const) {
      expect(mapProjectRowToSummary(projectRow({ status })).status).toBe(status);
    }
  });

  it("defaults a null aspect_ratio to 9:16 and a null duration_seconds to 0", () => {
    const summary = mapProjectRowToSummary(projectRow({ aspect_ratio: null, duration_seconds: null }));
    expect(summary.aspectRatio).toBe("9:16");
    expect(summary.duration).toBe(0);
  });

  it("(deterministic poster) the same project id always gets the same posterGradient", () => {
    const a = mapProjectRowToSummary(projectRow());
    const b = mapProjectRowToSummary(projectRow());
    expect(a.posterGradient).toBe(b.posterGradient);
  });

  it("(open-project routing) projectId equals the row's own id — a RecentProjects card's id IS the project", () => {
    const summary = mapProjectRowToSummary(projectRow({ id: "p-123" }));
    expect(summary.projectId).toBe("p-123");
    expect(summary.projectId).toBe(summary.id);
  });
});

describe("mapVideoRowToSummary", () => {
  it("(completed videos are distinct from project status) always reports status 'ready', regardless of the source project's own status", () => {
    const titleSource: ProjectTitleSource = { prompt: "prompt", business_name: "MOVO", scene_plan: null };
    const summary = mapVideoRowToSummary(videoRow(), titleSource);
    expect(summary.status).toBe("ready");
  });

  it("uses the owning project's derived title", () => {
    const titleSource: ProjectTitleSource = { prompt: "prompt", business_name: null, scene_plan: { videoTitle: "فيديو موفو" } };
    const summary = mapVideoRowToSummary(videoRow(), titleSource);
    expect(summary.title).toBe("فيديو موفو");
  });

  it("falls back to a generic title when the owning project can't be found, without throwing", () => {
    expect(() => mapVideoRowToSummary(videoRow(), null)).not.toThrow();
    expect(mapVideoRowToSummary(videoRow(), null).title).toBe("مشروع بدون عنوان");
  });

  it("(open-project routing bug regression) projectId is the OWNING project's id (video.project_id), never the video row's own id", () => {
    const summary = mapVideoRowToSummary(videoRow({ id: "video-999", project_id: "project-111" }), null);
    expect(summary.id).toBe("video-999");
    expect(summary.projectId).toBe("project-111");
    expect(summary.projectId).not.toBe(summary.id);
  });
});

describe("buildOpenProjectHref", () => {
  it("(/create?project=<id> link shape) builds the exact query param CreateWorkspace.tsx's restore flow reads", () => {
    expect(buildOpenProjectHref("11111111-1111-1111-1111-111111111111")).toBe("/create?project=11111111-1111-1111-1111-111111111111");
  });
});

describe("loadRecentProjects", () => {
  it("(dashboard gets real projects) maps every row the client returns, newest first as returned by the query", async () => {
    const rows = [projectRow({ id: "a", created_at: "2026-09-13T11:00:00Z" }), projectRow({ id: "b", created_at: "2026-09-12T11:00:00Z" })];
    const client = { selectRecentProjects: vi.fn().mockResolvedValue(rows) };

    const result = await loadRecentProjects(client, "owner-1", 8);

    expect(result.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("(current-user scoping is preserved) passes the exact ownerId and limit through to the query layer", async () => {
    const client = { selectRecentProjects: vi.fn().mockResolvedValue([]) };

    await loadRecentProjects(client, "the-current-users-id", 8);

    expect(client.selectRecentProjects).toHaveBeenCalledWith("the-current-users-id", 8);
    expect(client.selectRecentProjects).toHaveBeenCalledTimes(1);
  });

  it("(empty account still shows empty state) returns an empty array when the client has no rows — never throws, never fabricates a row", async () => {
    const client = { selectRecentProjects: vi.fn().mockResolvedValue([]) };
    expect(await loadRecentProjects(client, "owner-1", 8)).toEqual([]);
  });
});

describe("loadRecentReadyVideos", () => {
  it("(completed videos appear) maps every ready video, joined with its project's title", async () => {
    const client = {
      selectRecentReadyVideos: vi.fn().mockResolvedValue([videoRow({ id: "v1", project_id: "p1" })]),
      selectProjectTitleSources: vi.fn().mockResolvedValue({ p1: { prompt: "prompt", business_name: null, scene_plan: { videoTitle: "فيديو 1" } } }),
    };

    const result = await loadRecentReadyVideos(client, "owner-1", 8);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "v1", title: "فيديو 1", status: "ready" });
  });

  it("(current-user scoping is preserved) passes the exact ownerId and limit through, and never calls the title lookup with an empty video list", async () => {
    const client = {
      selectRecentReadyVideos: vi.fn().mockResolvedValue([]),
      selectProjectTitleSources: vi.fn().mockResolvedValue({}),
    };

    await loadRecentReadyVideos(client, "the-current-users-id", 8);

    expect(client.selectRecentReadyVideos).toHaveBeenCalledWith("the-current-users-id", 8);
    expect(client.selectProjectTitleSources).not.toHaveBeenCalled();
  });

  it("(empty account still shows empty state) returns an empty array when the account has no completed exports", async () => {
    const client = {
      selectRecentReadyVideos: vi.fn().mockResolvedValue([]),
      selectProjectTitleSources: vi.fn(),
    };
    expect(await loadRecentReadyVideos(client, "owner-1", 8)).toEqual([]);
  });

  it("looks up titles for only the distinct project ids among the videos (never duplicates a lookup)", async () => {
    const client = {
      selectRecentReadyVideos: vi.fn().mockResolvedValue([videoRow({ id: "v1", project_id: "p1" }), videoRow({ id: "v2", project_id: "p1" })]),
      selectProjectTitleSources: vi.fn().mockResolvedValue({ p1: { prompt: "prompt", business_name: "MOVO", scene_plan: null } }),
    };

    await loadRecentReadyVideos(client, "owner-1", 8);

    expect(client.selectProjectTitleSources).toHaveBeenCalledWith(["p1"]);
  });
});
