import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger, resolveLogLevelFromEnv } from "../logger";

describe("resolveLogLevelFromEnv", () => {
  it("uses error when viteMode is production", () => {
    expect(resolveLogLevelFromEnv({ viteMode: "production" })).toBe("error");
  });

  it("uses warn when viteMode is test", () => {
    expect(resolveLogLevelFromEnv({ viteMode: "test" })).toBe("warn");
  });

  it("uses debug for development or unset mode", () => {
    expect(resolveLogLevelFromEnv({ viteMode: "development" })).toBe("debug");
    expect(resolveLogLevelFromEnv({})).toBe("debug");
  });

  it("prefers VITE_LOG_LEVEL over mode when it is a valid level", () => {
    expect(
      resolveLogLevelFromEnv({
        viteLogLevel: "info",
        viteMode: "production",
      }),
    ).toBe("info");
  });

  it("normalizes explicit log level to lowercase", () => {
    expect(
      resolveLogLevelFromEnv({ viteLogLevel: "WARN", viteMode: "development" }),
    ).toBe("warn");
  });

  it("ignores invalid VITE_LOG_LEVEL and falls back to mode", () => {
    expect(
      resolveLogLevelFromEnv({
        viteLogLevel: "not-a-level",
        viteMode: "production",
      }),
    ).toBe("error");
  });
});

describe("createLogger — level gating", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("at error level, only error logs call console", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const log = createLogger({ level: "error", scope: "gate" });
    log.debug("d");
    log.info("i");
    log.warn("w");
    log.error("e");

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("at silent level, no console methods are invoked", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const log = createLogger({ level: "silent", scope: "quiet" });
    log.debug("d");
    log.error("e");

    expect(debugSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("at warn level, warn and error log but not info or debug", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const log = createLogger({ level: "warn", scope: "w" });
    log.debug("d");
    log.info("i");
    log.warn("w");
    log.error("e");

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("child logger inherits parent level", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const parent = createLogger({ level: "error", scope: "p" });
    const child = parent.child("c");
    child.debug("x");

    expect(debugSpy).not.toHaveBeenCalled();
  });
});

describe("createLogger — console format args (%s preservation)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("merges prefix into the first string so %s remains the console format string", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const log = createLogger({ level: "info", scope: "fmt" });
    log.info("%s world", "hello");

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const args = infoSpy.mock.calls[0] as unknown[];
    expect(args.length).toBe(2);
    expect(typeof args[0]).toBe("string");
    expect(args[0]).toContain("%s world");
    expect(args[0]).toMatch(/\[fmt\]/);
    expect(args[1]).toBe("hello");
  });

  it("keeps prefix as a separate first arg when the first log argument is not a string", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const log = createLogger({ level: "info", scope: "obj" });
    const payload = { a: 1 };
    log.info(payload, "extra");

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const args = infoSpy.mock.calls[0] as unknown[];
    expect(args.length).toBe(3);
    expect(typeof args[0]).toBe("string");
    expect(args[0]).toMatch(/\[obj\]/);
    expect(args[1]).toBe(payload);
    expect(args[2]).toBe("extra");
  });
});
