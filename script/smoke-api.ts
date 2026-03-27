const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");

async function checkJson(path: string) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${url}, got: ${text.slice(0, 200)}`);
  }
  if (typeof json?.success !== "boolean") {
    throw new Error(`Expected {success:boolean} from ${url}, got: ${text.slice(0, 200)}`);
  }
  return { url, status: res.status, json };
}

async function main() {
  const checks = ["/api/health", "/api/user", "/api/posts"];
  for (const path of checks) {
    const { url, status, json } = await checkJson(path);
    console.log(`${status} ${url} success=${json.success}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

