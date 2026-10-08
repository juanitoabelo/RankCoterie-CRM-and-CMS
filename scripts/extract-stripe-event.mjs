const res = await fetch("http://localhost:4040/api/requests/http/airt_3KOZuHHk6snfHReypPzLGZHukic");
const data = await res.json();
const raw = Buffer.from(data.request.raw, "base64").toString("utf8");
const idx = raw.indexOf("\r\n\r\n");
const body = idx >= 0 ? raw.slice(idx + 4) : raw;
console.log(body.slice(0, 200));
try {
  const obj = JSON.parse(body);
  console.log("Parsed id", obj.id, "type", obj.type);
} catch (e) {
  console.error("parse error", e);
}
await import("fs/promises").then(fs => fs.writeFile("/tmp/stripe-event.json", body));
console.log("wrote /tmp/stripe-event.json");
