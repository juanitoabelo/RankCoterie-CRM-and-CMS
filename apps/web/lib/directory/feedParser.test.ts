import { describe, it, expect } from "vitest";
import { parseFeedXml, fingerprintOf } from "./feedParser";

const RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test News</title>
    <link>https://example.com</link>
    <description>Test feed</description>
    <item>
      <title>First item</title>
      <link>https://example.com/first</link>
      <description><![CDATA[<p>First body text</p>]]></description>
      <category>recovery</category>
      <category>family</category>
      <author>jane@example.com (Jane Doe)</author>
      <pubDate>Mon, 12 Aug 2024 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Second item</title>
      <link>https://example.com/second</link>
      <content:encoded><![CDATA[<p>Longer encoded body</p>]]></content:encoded>
      <dc:creator>Bob</dc:creator>
      <pubDate>Tue, 13 Aug 2024 08:30:00 GMT</pubDate>
    </item>
    <item>
      <title>   </title>
    </item>
  </channel>
</rss>`;

const ATOM_FIXTURE = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <entry>
    <title>Atom entry one</title>
    <link href="https://example.com/atom-1"/>
    <summary>Atom summary text</summary>
    <category term="wellness"/>
    <updated>2024-08-14T12:00:00Z</updated>
  </entry>
</feed>`;

describe("parseFeedXml", () => {
  it("parses RSS 2.0 items with description, categories, author, pubDate", async () => {
    const entries = await parseFeedXml(RSS_FIXTURE);
    expect(entries).toHaveLength(2);

    expect(entries[0]).toMatchObject({
      title: "First item",
      url: "https://example.com/first",
      body: "First body text",
      keywords: "recovery, family",
      author: "jane@example.com (Jane Doe)",
    });
    expect(entries[0].feedDate?.toISOString()).toBe("2024-08-12T10:00:00.000Z");
  });

  it("prefers content:encoded body and dc:creator author when present", async () => {
    const entries = await parseFeedXml(RSS_FIXTURE);
    expect(entries[1].body).toContain("Longer encoded body");
    expect(entries[1].author).toBe("Bob");
    expect(entries[1].feedDate?.toISOString()).toBe("2024-08-13T08:30:00.000Z");
  });

  it("parses Atom entries (summary body, link, updated date)", async () => {
    const entries = await parseFeedXml(ATOM_FIXTURE);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      title: "Atom entry one",
      url: "https://example.com/atom-1",
      body: "Atom summary text",
    });
    expect(entries[0].feedDate?.toISOString()).toBe("2024-08-14T12:00:00.000Z");
  });

  it("skips items without a title", async () => {
    expect(await parseFeedXml(RSS_FIXTURE)).toHaveLength(2);
  });

  it("returns [] for malformed XML", async () => {
    expect(await parseFeedXml("not xml at all <<<")).toEqual([]);
  });

  it("returns [] for valid XML without items", async () => {
    expect(await parseFeedXml("<rss version='2.0'><channel><title>empty</title></channel></rss>")).toEqual([]);
  });

  it("tolerates missing dates", async () => {
    const entries = await parseFeedXml(
      "<rss version='2.0'><channel><title>t</title><item><title>No date</title></item></channel></rss>",
    );
    expect(entries[0].feedDate).toBeNull();
  });
});

describe("fingerprintOf", () => {
  it("is stable for identical input", () => {
    const a = fingerprintOf("Title", "https://x.com/1", new Date("2024-08-12T10:00:00Z"));
    const b = fingerprintOf("  title ", "https://x.com/1", new Date("2024-08-12T10:00:00Z"));
    expect(a).toBe(b);
  });

  it("differs when url changes", () => {
    const a = fingerprintOf("Title", "https://x.com/1", null);
    const b = fingerprintOf("Title", "https://x.com/2", null);
    expect(a).not.toBe(b);
  });

  it("produces a 40-char sha1 hex", () => {
    expect(fingerprintOf("t", null, null)).toMatch(/^[a-f0-9]{40}$/);
  });
});