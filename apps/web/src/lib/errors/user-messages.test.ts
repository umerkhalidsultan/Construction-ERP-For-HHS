import { describe, expect, it } from "vitest";
import { toUserMessage } from "./user-messages";

describe("toUserMessage", () => {
  it("never shows raw HTTP or ORM text", () => {
    expect(
      toUserMessage({
        message: "Request failed (502)",
        status: 502,
      }),
    ).toBe("Something went wrong on our side. Please try again.");

    expect(
      toUserMessage({
        message: "PrismaClientKnownRequestError",
        status: 500,
        requestId: "abcdef12-3333",
      }),
    ).toMatch(/Reference: ABCDEF12/);
  });

  it("keeps safe server messages", () => {
    expect(
      toUserMessage({
        code: "AUTH_INVALID",
        message: "Invalid email or password.",
        status: 401,
      }),
    ).toBe("Invalid email or password.");
  });

  it("maps permission, network, timeout, and duplicate failures", () => {
    expect(toUserMessage({ code: "FORBIDDEN", status: 403 })).toMatch(
      /permission/i,
    );
    expect(toUserMessage({ code: "NETWORK_ERROR", status: 0 })).toMatch(
      /connect/i,
    );
    expect(toUserMessage({ code: "TIMEOUT_ERROR", status: 408 })).toMatch(
      /too long/i,
    );
    expect(toUserMessage({ code: "DUPLICATE_RECORD", status: 409 })).toMatch(
      /already exists/i,
    );
  });
});
