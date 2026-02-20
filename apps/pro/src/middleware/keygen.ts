import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { validateKey } from "../keygen.js";

interface KeygenAuthOptions {
  ttlMs?: number;
}

export const HEADER_KEYGEN = "x-hyprnote-license-key";

const extractCredentials = (c: any) => {
  const licenseKey = c.req.header(HEADER_KEYGEN);
  if (!licenseKey) {
    return null;
  }

  return { licenseKey };
};

export const keygenAuth = (options: KeygenAuthOptions = {}) => {
  const { ttlMs = 30 * 60 * 1000 } = options;

  return createMiddleware(async (c, next) => {
    const credentials = extractCredentials(c);

    if (!credentials) {
      throw new HTTPException(401, {
        message: "invalid authorization header",
      });
    }

    const { licenseKey } = credentials;
    const cacheKey = `keygen:${licenseKey}`;

    let isValid = c.var.cacheGet<boolean>(cacheKey);

    if (isValid === undefined) {
      isValid = await validateKey(licenseKey);
      console.log("isValid", isValid);

      const ttl = isValid ? ttlMs : ttlMs / 10;
      c.var.cacheSet(cacheKey, isValid, ttl);
    }

    if (!isValid) {
      throw new HTTPException(401, { message: "invalid license key" });
    }

    c.set("licenseKey", licenseKey);
    await next();
  });
};
