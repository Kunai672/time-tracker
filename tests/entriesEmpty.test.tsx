import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import { EntriesList } from "../components/EntriesList";

test("entries list shows the start-timer call to action when empty", () => {
  const html = renderToStaticMarkup(
    <EntriesList
      groups={[]}
      categories={[]}
      now={new Date(0)}
      hour12={false}
      onEdit={() => {}}
      onDelete={() => {}}
    />,
  );

  assert.match(html, /No entries yet/);
  assert.match(html, /Start your first timer/);
});
