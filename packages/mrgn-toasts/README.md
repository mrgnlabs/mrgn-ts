# mrgn-toasts

- Install: `pnpm install`
- Run: `pnpm run dev`

# mrgn-toasts

A toast notification library for MRGN applications that provides various toast types and a powerful multi-step toast system.

## Installation

```bash
npm install @mrgnlabs/mrgn-toasts
# or
yarn add @mrgnlabs/mrgn-toasts
# or
pnpm add @mrgnlabs/mrgn-toasts
```

## Usage

### Setup

Wrap your application with the `ToastProvider`:

```tsx
import { ToastProvider } from "@mrgnlabs/mrgn-toasts";

function App() {
  return <ToastProvider>{/* Your application */}</ToastProvider>;
}
```

## Toast Types

The package provides several types of toasts to handle different scenarios:

### Error Toast

For displaying error messages:

```tsx
import { toastManager } from "@mrgnlabs/mrgn-toasts";

// Simple error message
toastManager.showErrorToast("Something went wrong");

// Error with code
toastManager.showErrorToast({
  description: "Operation failed due to insufficient funds",
  code: 4001,
});
```

### Warning Toast

For displaying warning messages:

```tsx
import { toastManager } from "@mrgnlabs/mrgn-toasts";

toastManager.showWarningToast("Warning", "This action may have unintended consequences");
```

### Multi-Step Toast

For displaying multi-step processes like transactions:

```tsx
import { toastManager } from "@mrgnlabs/mrgn-toasts";

// Create a multi-step toast
const toast = toastManager.createMultiStepToast("Processing Transaction", [
  { label: "Initializing transaction" },
  { label: "Confirming on blockchain" },
  { label: "Finalizing" },
]);

// Start the toast
toast.start();

// Update as steps progress
toast.successAndNext(); // Mark current step as success and move to next
```

## Multi-Step Toast

The `createMultiStepToast` function returns a controller object with the following methods:

### `start()`

Starts/displays the toast with the first step in pending state.

```tsx
toast.start();
```

### `successAndNext(stepsToAdvance?, explorerUrl?, signature?)`

Marks the current step as successful and advances to the next step.

- `stepsToAdvance` (optional): Number of steps to advance (default: 1)
- `explorerUrl` (optional): URL to the blockchain explorer for the transaction
- `signature` (optional): Transaction signature to display

> ExplorerUrl and signature should both be defined or undefined. If both are defined, the signature will be displayed in the toast.

```tsx
// Mark current step as success and move to the next
toast.successAndNext();

// Mark current step as success, jump 2 steps ahead, and add explorer link
toast.successAndNext(2, "https://explorer.solana.com/tx/123", "5KS8...7dQz");
```

### `success(explorerUrl?, signature?)`

Marks all steps as successful and closes the toast after a delay.

```tsx
toast.success("https://explorer.solana.com/tx/123", "5KS8...7dQz");
```

### `setFailed(message?, onRetry?)`

Marks the currently pending steps as failed.

- `message` (optional): Error message to display
- `onRetry` (optional): Callback function for the retry button
  > If onRetry is defined, the retry button will be displayed in the toast.

```tsx
toast.setFailed("Transaction failed", () => retryTransaction());
```

### `pause()`

Pauses at the current step.

```tsx
toast.pause();
```

### `resume()`

Resumes from a paused step.

```tsx
toast.resume();
```

### `resetAndStart()`

Resets the failed step and starts again from that point.

```tsx
toast.resetAndStart();
```

### `close()`

Closes and dismisses the toast.

```tsx
toast.close();
```

## Toast States

Multi-step toasts can have the following states for each step:

- `TODO`: Step is waiting to be processed
- `PENDING`: Step is currently in progress
- `SUCCESS`: Step has completed successfully
- `ERROR`: Step has failed
- `CANCELED`: Step has been canceled
- `PAUSED`: Step has been paused

## Custom Toasts

You can also create custom toast content:

```tsx
import { toastManager } from "@mrgnlabs/mrgn-toasts";

const customToast = toastManager.showCustomToast(<YourCustomComponent />);

// Later dismiss it
customToast.close();
```

## License

MIT
