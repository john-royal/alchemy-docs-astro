---
title: What is Alchemy?
description: Alchemy is an embeddable, zero-dependency Infrastructure-as-Code library written in pure TypeScript that runs anywhere JavaScript runs. Learn how it differs from traditional IaC tools.
---

# What is Alchemy

Alchemy is an embeddable, zero-dependency, Infrastructure-as-Code (IaC) library written in pure TypeScript that runs anywhere that JavaScript runs - including the browser, serverless functions or even durable workflows.

## What is Infrastructure as Code?

Infrastructure-as-Code is the practice of using code to define your infrastructure configuration instead of manually creating it. 

Let's say you need a database. Instead of clicking through a cloud console or executing a CLI command, you simply write:

```typescript
const database = await Database("main", { 
  engine: "postgres",
  size: "small"
});

// Access properties directly
console.log(database.connectionString);
```

Run this code, and the actual database gets created. Run it twice without changes, and nothing happens. Change the size to `"medium"` and run it again - your database will be updated. Remove the code and run it again, the database will be deleted.

Your code is the blueprint for repeatable infrastructure. Alchemy keeps track of all the resources and handles the synchronization between your code and the real world.

## How is Alchemy different than traditonal IaC?

Unlike similar tools like Terraform, Pulumi, SST and CloudFormation, Alchemy is implemented in pure ESM-native TypeScript code. 

The Terraform, Pulumi and SST ecosystem are all tied together. SST is on top of Pulumi, which is again on top of Terraform. Terraform and Pulumi are implemented in Go and generate TypeScript "wrappers" that depend on a separate Go process.

The AWS CDK genereates CloudFormation JSON, depends on a managed service to run and only supports AWS services. Extending CloudFormation requires you deploy a Lambda Function (which is an ordeal).

All together, IaC without Alchemy is a clunky, heavy, opinionated toolchain that mostly works against you as a user. Alchemy simplifies the entire stack down to pure async functions.

## Zero Dependencies

Alchemy adopts a philosophy of zero-dependencies and web standards so that it can run anywhere with minimal impact on bundle size.

All you gotta do is install `alchemy` and you're good to go.

```sh
bun add alchemy
```

## Just Async Functions

Resources in Alchemy are implemented with async functions instead of complex class abstractions with sharp edge gotchas, inter-process-communication or hosted services.

This means you can create resources in any async environment and gain access to its physical properties immediately:

```typescript
// Create a resource by awaiting a function
const worker = await Worker("api", {
  name: "my-api",
  entrypoint: "./src/index.ts"
});

console.log(worker.workerName) // string
```

Contrast this with Pulumi which relies on a complex graph abstraction:
```ts
const worker = new Worker("api", {
  name: "my-api",
  entrypoint: "./src/index.ts"
});

worker.workerName // Output<string>

// requires a complex abstraction just to log a value 😵‍💫
pulumi.export(worker.workerName)
```

## Runs Anywhere

Alchemy works in any JavaScript environment including browsers, serverless functions, and durable workflows.

```typescript
// Browser environment
const app = await alchemy("my-browser-app");

// Lambda function
export const handler = async () => {
  await alchemy.run("customer-id", async () => {
    await Worker(..)
  })
};
```

## Transparent State

State is stored as plain JSON files you can inspect, edit, and version control.

```json
// .alchemy/my-app/prod/api.json
{
  "provider": "cloudflare::Worker",
  "status": "created",
  "output": {
    "id": "my-api",
    "url": "https://my-api.workers.dev"
  },
  "props": {
    "name": "my-api",
    "entrypoint": "./src/index.ts"
  }
}
```

> [!NOTE]
> You usually don't want to edit these files, but when things go wrong, having state that is easy to understand and change is useful.

## Pluggable State

Alchemy supports custom state backends including file systems, cloud storage, or databases.

```typescript
// Use Cloudflare R2 for state
import { R2RestStateStore } from "alchemy/cloudflare";

const app = await alchemy("my-app", {
  stateStore: (scope) => new R2RestStateStore(scope, {
    bucketName: "my-state-bucket"
  })
});
```

By default, Alchemy assumes you want to store state files locally for development purposes, but since Alchemy can run anywhere - you may want to store state in the the browser, or a Cloudflare Durable Object!

[Learn more about custom state stores](./guides/custom-state-store.md)

## Direct API Integration

> `fetch` is all you need

Alchemy resources call service APIs directly using `fetch`, instead of using SDKs that often come with heavy dependencies and runtime requirements.

```typescript
// Resource implementation using direct API calls
if (this.phase === "delete") {
  await fetch(`https://api.example.com/resources/${this.output.id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${apiKey}` }
  });
  return this.destroy();
}
```

## Custom Resources in Minutes

Create new resource types with a simple function that implements create, update, and delete operations.

```typescript
export const Database = Resource(
  "myservice::Database",
  async function(this: Context<Database>, id: string, props: DatabaseProps): Promise<Database> {
    if (this.phase === "delete") {
      // Delete logic
      return this.destroy();
    } else if (this.phase === "update") {
      // Update logic
      return this({ id: "db-123", ...props });
    } else {
      // Create logic
      return this({ id: "db-123", ...props });
    }
  }
);
```

## Optimized for AI

Alchemy provides a `.cursorrules` file to help AI tools generate resource implementations at 90% accuracy on the first try.

```typescript
// 1. Copy Alchemy's .cursorrules into your repo
// 2. Ask AI: "Create a resource for Neon Database"
// 3. Get a working implementation in seconds

// Result: Complete implementation with proper lifecycle handling
export const Database = Resource(
  "neon::Database",
  async function(this: Context<Database>, id: string, props: DatabaseProps): Promise<Database> {
    // Full resource implementation generated by AI
  }
);
```

[Learn more about AI-generated resources](./guides/custom-resources.md)

## Fast Deployments

Alchemy deployments are fast because they run directly in JavaScript without spawning external processes or slow toolchains.

```typescript
// No IPC, no Go toolchains, no CloudFormation waiting
// Just direct JavaScript execution calling APIs
// $ time bun ./alchemy.run.ts
// real    0m1.234s
```

## Flexible Scoping

Alchemy organizes resources with a hierarchical scope system that supports infinite nesting and isolation.

```typescript
// Root and stage scopes
const app = await alchemy("my-app", { 
  stage: "prod",
  password: "prod-secret"  // Encryption password for this scope
});
```

## Secure Secrets

Alchemy encrypts sensitive values in state files.

```typescript
// Define a secret
const apiKey = alchemy.secret(process.env.API_KEY);

// Use it in a resource
const worker = await Worker("api", {
  bindings: { API_KEY: apiKey }
});

// In state files, it's encrypted
// "API_KEY": { "@secret": "Tgz3e/WAscu4U1oanm5S4YXH..." }
```

## Scoped Encryption and State

Each scope can have a different encryption password and state store.

```ts
// Nested scopes can have different passwords and state stores
await alchemy.run("backend", { 
  password: "backend-secret",
  stateStore: new DatabaseStateStore()
}, async (scope) => {
  // Create resources in this scope
  await Worker("api", { /* ... */ });
  
  // Deeper nesting works too
  await alchemy.run("database", async () => {
    await Database("main", { /* ... */ });
  });
});
```

## Application Examples

Alchemy works for a wide range of infrastructure use cases.

```typescript
// Cloudflare Workers and Static Sites
const assets = await Assets("Assets", {
  path: "./dist"
})

const site = await Worker("Website", {
  name: "my-app",
  bindings: {
    ASSETS: assets
  }
});

// AWS Lambda Functions
const func = await Function("api", {
  handler: "src/lambda.handler",
  environment: { TABLE_NAME: table.name }
});

// Third-party APIs like Stripe
const product = await Product("pro-plan", {
  name: "Pro Plan",
  description: "Professional subscription tier"
});
```

## Getting Started

Ready to try Alchemy? Check out our [Getting Started guide](./getting-started.md) to build your first Alchemy app.
