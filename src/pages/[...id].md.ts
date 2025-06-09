import { getCollection, getEntry } from "astro:content";

export async function getStaticPaths() {
  const docs = await getCollection("docs");
  return docs.map((doc) => ({
    params: { id: doc.id },
  }));
}

export async function GET({ params }: { params: { id: string } }) {
  const doc = await getEntry("docs", params.id);
  if (!doc) {
    return new Response("Not found", { status: 404 });
  }
  return new Response([`# ${doc.data.title}`, "", doc.body].join("\n"), {
    headers: {
      "Content-Type": "text/markdown",
    },
  });
}
