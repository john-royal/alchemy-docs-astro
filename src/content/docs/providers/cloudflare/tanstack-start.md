---
title: Deploying TanStack Start Applications to Cloudflare with Alchemy
description: Learn how to deploy TanStack Start applications to Cloudflare Workers using Alchemy for modern web development.
---

# TanStackStart

Deploy a TanStack Start application to Cloudflare Pages with automatically configured defaults.

## Minimal Example

```ts
import { TanStackStart } from "alchemy/cloudflare";

const app = await TanStackStart("my-app");
```

## With Custom Build Command

```ts
import { TanStackStart } from "alchemy/cloudflare";

const app = await TanStackStart("my-app", {
  command: "bun run test && bun run build:production"
});
```

## With Database Binding

```ts
import { TanStackStart, D1Database } from "alchemy/cloudflare";

const database = await D1Database("my-db", {
  name: "my-db"
});

const app = await TanStackStart("my-app", {
  bindings: {
    DB: database
  }
});
```

## With Environment Variables

```ts
import { TanStackStart } from "alchemy/cloudflare";

const app = await TanStackStart("my-app", {
  bindings: {
    API_KEY: alchemy.secret(process.env.API_KEY)
  },
  vars: {
    NODE_ENV: "production",
    APP_ENV: "staging"
  }
});
```

## Bind to a Worker

```ts
import { Worker, TanStackStart } from "alchemy/cloudflare";

const app = await TanStackStart("my-app");

await Worker("my-worker", {
  name: "my-worker",
  script: "console.log('Hello, world!')",
  bindings: {
    APP: app
  }
});
```