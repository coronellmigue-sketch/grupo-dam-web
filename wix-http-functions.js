import { ok, serverError } from "wix-http-functions";
import wixData from "wix-data";

function responseOptions(body) {
  return {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    },
    body
  };
}

export async function get_damState(_request) {
  try {
    const [kvResults, mediaResults] = await Promise.all([
      wixData.query("DamKv").limit(1000).ascending("key").find(),
      wixData.query("DamMedia").limit(1000).ascending("key").find()
    ]);

    const kv = {};
    kvResults.items.forEach((item) => {
      if (!item || !item.key) {
        return;
      }
      kv[String(item.key)] = String(item.value || "");
    });

    const media = {};
    mediaResults.items.forEach((item) => {
      if (!item || !item.key || item.active === false || !item.publicUrl) {
        return;
      }
      media[String(item.key)] = {
        path: String(item.publicUrl),
        updatedAt: item.updatedAt
          ? new Date(item.updatedAt).toISOString()
          : new Date(item._updatedDate || Date.now()).toISOString(),
        size: Number(item.size || 0),
        contentType: String(item.contentType || "")
      };
    });

    return ok(responseOptions({
      version: 1,
      updatedAt: new Date().toISOString(),
      kv,
      media
    }));
  } catch (error) {
    return serverError(responseOptions({
      ok: false,
      message: error && error.message ? error.message : String(error)
    }));
  }
}
