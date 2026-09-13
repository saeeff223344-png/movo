import { describe, expect, it } from "vitest";
import { APIConnectionError, APIConnectionTimeoutError, AuthenticationError, BadRequestError, RateLimitError } from "openai";
import { mapIncompleteReason, mapOpenAIError } from "@/lib/ai/planner-errors";

function fakeHeaders(): Headers {
  return new Headers();
}

describe("mapOpenAIError", () => {
  it("maps a connection timeout to 'timeout'", () => {
    expect(mapOpenAIError(new APIConnectionTimeoutError())).toBe("timeout");
  });

  it("maps a rate limit error to 'rate_limited'", () => {
    expect(mapOpenAIError(new RateLimitError(429, {}, "rate limited", fakeHeaders()))).toBe("rate_limited");
  });

  it("maps an authentication error to 'missing_api_key'", () => {
    expect(mapOpenAIError(new AuthenticationError(401, {}, "bad key", fakeHeaders()))).toBe("missing_api_key");
  });

  it("maps a generic connection error to 'unavailable'", () => {
    expect(mapOpenAIError(new APIConnectionError({ message: "network down" }))).toBe("unavailable");
  });

  it("maps a bad request error to 'invalid_output'", () => {
    expect(mapOpenAIError(new BadRequestError(400, {}, "bad schema", fakeHeaders()))).toBe("invalid_output");
  });

  it("maps an unrecognized error to 'unavailable'", () => {
    expect(mapOpenAIError(new Error("something else"))).toBe("unavailable");
  });
});

describe("mapIncompleteReason", () => {
  it("maps content_filter to 'refused'", () => {
    expect(mapIncompleteReason("content_filter")).toBe("refused");
  });

  it("maps max_output_tokens to 'invalid_output'", () => {
    expect(mapIncompleteReason("max_output_tokens")).toBe("invalid_output");
  });

  it("maps an undefined reason to 'invalid_output'", () => {
    expect(mapIncompleteReason(undefined)).toBe("invalid_output");
  });
});
