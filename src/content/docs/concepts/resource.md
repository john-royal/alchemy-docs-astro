---
order: 1
title: Resource
description: Learn about Resources, the core building blocks of Alchemy. Understand how to create, update, and manage infrastructure with async functions in TypeScript.
---

# Resource

Resources are the core building blocks of Alchemy. Each resource represents a piece of infrastructure or configuration that can be created, updated, and deleted automatically.

## What is a Resource?

A Resource is simply a memoized async function that implemented a lifecycle handler for three phases:
1. `create` - what to do when first creating the resource
2. `update` - what to do when updating a resource
3. `delete` - what to when deleting a resource

## Resource ID

When creating a resource, you always pass an `id` that is unique within the Resource's [Scope](../concepts/scope.md).

```ts
await MyResource("id")
```

This ID is what Alchemy uses to track the state of the resource and trigger the appropriate create/update/delete phase.

## Resource Props

Each Resource has an interface for its "input properties"

```typescript
export interface DatabaseProps {
  name: string;
  branchId: string;
  projectId: string;
  // Other properties...
}
```

## Resource Instance

Each Resource has an interface for its "output attributes":

```typescript
export interface Database extends Resource<"neon::Database">, DatabaseProps {
  id: string;
  createdAt: number;
  // Additional properties...
}
```

> [!CAUTION]
> This interface must extend `Resource<..>`

## Resource Provider

Each Resource exports a "Provider" function with a globally unique name and an implementation of the lifecycle handler logic.

```typescript
export const Database = Resource(
  "neon::Database",
  async function(this: Context<Database>, id: string, props: DatabaseProps): Promise<Database> {
    if (this.phase === "delete") {
      // Delete resource logic
      // ...
      return this.destroy();
    } else if (this.phase === "update") {
      // Update resource logic
      // ...
      return this({/* updated resource */});
    } else {
      // Create resource logic
      // ...
      return this({/* new resource */});
    }
  }
);
```

> [!TIP]
> By Convention, the name of this exported `const` should match the name of your Resource's interface.

Let's break this down a bit futher, since it may seem confusing at first.

## Resource FQN

Each Resource has a globally unique name (aka. fully qualified name), e.g `"neon:Database"`:

```ts
export const Database = Resource("neon::Database"),
```

Alchemy and uses this FQN to delete orphaned resources (stored in your [State](../concepts/state.md) files) by looking up the corresponding "provider".

## Lifecycle Function

The Resource's lifecycle handler is defined using an `async function` declaration with 3 required arguments:

```ts
async function(
  // the resource's state/context is bound to `this`
  this: Context<Database>, 
  // the id of the resource (unique within a SCope)
  id: string, 
  // the input properties
  props: DatabaseProps
): Promise<Database>
```

> [!CAUTION]
> It must be function declaration (not an arrow function) because the Resource's context is passed through as the `this: Context<Database>` parameter.

## Lifecycle Phases

The lifecycle handler is a simple function that handles the 3 phases: `"create"`, `"update"` or `"delete"`:

```ts
if (this.phase === "delete") {
  // Delete resource logic
  // ...
  return this.destroy();
} else if (this.phase === "update") {
  // Update resource logic
  // ...
  return this({/* updated properties */});
} else {
  // Create resource logic
  // ...
  return this({/* initial properties */});
}
```

## `this.destroy()`

When a resource is being deleted, you must return `this.destroy()` to signal that the resource deletion process is complete.

> [!TIP]
> This also enables type inference since `this.destroy()` returns `never`, so the type of the resource can be inferred from the return type of the function.

## `this({..})`

To construct the resource (including your properites and Alchemy's intrinsic properties), call `this(props)` with your output properties:

```ts
return this({/* updated properties */});
```

What's going on here? `this` is a function? Huh?

Alchemy resources are implemented with pure functions, but are designed to emulate classes (except with an async constructor that implements a CRUD lifecycle handler).

`this` is analagous to `super` in a standard class:
```ts
return super({/* updated properties */});
```

> [!TIP]
> If this syntax freaks you out too much, it is also aliased as `this.create`:
> ```ts
> return this.create({/* updated properties */});
> ```

## Testing

See the [Testing](./testing.md) documentation for a comprehensive walkthrough on how to test your own resources.