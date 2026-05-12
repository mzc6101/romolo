// Renders one or more Schema.org JSON-LD objects as <script> tags.
// Input is always the output of typed builders in ./schema.ts — never
// user-supplied content. We still escape `<` to U+003C as a defense-in-depth
// guard against any future string field that might contain "</script".

type SchemaInput = Record<string, unknown> | Record<string, unknown>[];

function serialize(data: SchemaInput): string {
  const payload = Array.isArray(data) ? data : [data];
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: SchemaInput }) {
  const json = serialize(data);
  return <script type="application/ld+json">{json}</script>;
}
