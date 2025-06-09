---
order: 5
title: Workflows
description: Create, bind, and trigger Cloudflare Workflows from your Alchemy-managed Worker applications. Learn how to orchestrate complex processes serverlessly.
---

# Workflow

This guide explains how to create, bind and use Cloudflare Workflows within your Worker scripts.

> [!TIP]
> We assume you're familiar with Cloudflare Workflows already. If not, read [Cloudflare Workflows](https://developers.cloudflare.com/workflows/) first.

## Create a Workflow

At a bare minimum, you need to create a `Workflow` object as a stable reference to your Workflow.

```ts
import { Workflow } from "alchemy/cloudflare";

const orderProcessor = new Workflow("orderProcessor");
```

If you're paying close attention, you'll notice that we call `new Workflow` instead of `await Workflow` like you might have come to expect from Alchemy Resources.

This is because of oddities in Cloudflare's API design. Workflows are not resources in the traditional sense because they cannot exist without a Worker.

## Bind the Workflow to a Worker

Instead, you create a Workflow object and then bind it to your Worker:

```ts
export const worker = await Worker("Worker", {
  name: "my-worker",
  entrypoint: "./index.ts"
  bindings: {
    // bind the workflow to your Worker
    ORDER_PROCESSOR: orderProcessor,
  },
});
```

## Implement the Workflow class

Now, we have a Worker with a Workflow running within it. To use this Workflow, our Worker script must include a class for the workflow and then some code in the `fetch` handler to trigger it.

A simple workflow may look like so:

```ts
export class OrderProcessor extends WorkflowEntrypoint {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async run(event, step) {
    const shippingDetails = await step.do("process-shipping", async () => {
      return {
        success: true,
        shipmentId: event.payload.shipmentId,
        message: "Shipment scheduled successfully",
      };
    });
    return shippingDetails;
  }
}
```

> [!TIP]
> See Cloudflare's [Workflow Guide](https://developers.cloudflare.com/workflows/get-started/guide/) for more details on implementing workflows.

## Trigger the Workflow from your Worker

Now, our `fetch` handler can create a Workflow instance (start a workflow) via the `ORDER_PROCESSOR` binding:

```ts
import { env } from "cloudflare:workers";

export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    const params = { orderId: "test-123", amount: 99.99 };
    const instance = await env.ORDER_PROCESSOR.create(params);

    return Response.json({
      id: instance.id,
      details: await instance.status(),
      success: true,
      orderId: params.orderId,
      message: "Order processed successfully",
    });
  },
};
```

## Type-safe Bindings

Remember, for `env.` to be type-safe, you need to configure your `src/env.d.ts` to infer the types from your worker:

```ts
// src/env.d.ts
import type { worker } from "./alchemy.run";

export type WorkerEnv = typeof worker.Env;

declare module "cloudflare:workers" {
  namespace Cloudflare {
    export interface Env extends WorkerEnv {}
  }
}
```

> [!TIP]
> See the [Bindings](../concepts/bindings.md) for more information.

## Cross-Script Workflow Binding

You can share workflows across multiple Workers, allowing one Worker to trigger workflows defined in another Worker. This is useful for creating modular architectures where different Workers handle different concerns.

### Method 1: Using re-exported syntax

You can directly reference the workflow binding from the provider Worker:

```ts
import { Worker, Workflow } from "alchemy/cloudflare";

// Create the provider Worker with the workflow
const host = await Worker("Host", {
  entrypoint: "./workflow-provider.ts", 
  bindings: {
    SHARED_PROCESSOR: new Workflow("shared-processor", {
      className: "SharedProcessor",
      workflowName: "shared-processing-workflow",
    }),
  },
});

// Create the client Worker using the provider's workflow binding directly
const client = await Worker("client", {
  entrypoint: "./client-worker.ts",
  bindings: {
    // Re-use the exact same workflow binding from the provider worker
    SHARED_PROCESSOR: host.bindings.SHARED_PROCESSOR,
  },
});
```

### Method 2: Using `scriptName` directly

Alternatively, when creating a workflow binding in a client Worker, you can reference a workflow defined in another Worker by specifying the `scriptName`:

```ts
import { Worker, Workflow } from "alchemy/cloudflare";

const hostWorkerName = "host"

const workflow = new Workflow("shared-processor", {
  className: "SharedProcessor",
  workflowName: "shared-processing-workflow",
  scriptName: hostWorkerName
});

// First, create the Worker that defines the workflow
const host = await Worker("host", {
  entrypoint: "./workflow-provider.ts",
  name: hostWorkerName,
  bindings: {
    // Define the workflow in this worker
    SHARED_PROCESSOR: workflow,
  },
});

// Then, create a client Worker that uses the cross-script workflow
const client = await Worker("client", {
  entrypoint: "./client-worker.ts",
  bindings: {
    // Reference the same workflow but specify which script it comes from
    SHARED_PROCESSOR: workflow,
  },
});
```

### Workflow Provider Implementation

The provider Worker implements the workflow class and optionally provides endpoints:

```ts
// workflow-provider.ts
export class SharedProcessor {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async run(event, step) {
    const result = await step.do('process-shared-data', async () => {
      console.log("Processing shared data", event.payload);
      return {
        success: true,
        processedId: event.payload.id,
        message: "Data processed successfully"
      };
    });

    return result;
  }
}

export default {
  async fetch(request: Request) {
    return new Response('Workflow Provider Worker is running!');
  }
};
```

### Client Worker Implementation

The client Worker can trigger the shared workflow without implementing the workflow class:

```ts
// client-worker.ts
import { env } from "cloudflare:workers";

export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    
    if (url.pathname === '/trigger-shared-workflow') {
      try {
        // Trigger the workflow defined in another worker
        const workflow = env.SHARED_PROCESSOR;
        const params = { id: "client-123", data: "example" };
        const instance = await workflow.create(params);

        return Response.json({
          id: instance.id,
          details: await instance.status(),
          success: true,
          crossScriptWorking: true,
          params: params
        });
      } catch (error) {
        return Response.json({
          error: error.message,
          crossScriptWorking: false
        }, { status: 500 });
      }
    }

    return new Response('Client Worker is running!');
  }
};
```
