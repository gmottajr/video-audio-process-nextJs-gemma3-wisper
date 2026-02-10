# Webpack Configuration Fix for @huggingface/transformers

## Problem

When building with Next.js, the following error occurred:

```
Module parse failed: Unexpected character '�' (1:0)
./node_modules/@huggingface/transformers/node_modules/onnxruntime-node/bin/napi-v3/darwin/arm64/onnxruntime_binding.node
```

## Root Cause

The `@huggingface/transformers` package has two implementations:
1. **Browser/Web version**: Uses ONNX Runtime Web (WebAssembly)
2. **Node.js version**: Uses ONNX Runtime Node (native `.node` bindings)

Next.js was accidentally trying to bundle the Node.js version's native `.node` files (binary files) into the client bundle, which caused webpack to fail because it can't process binary files.

## Solution

Updated `next.config.mjs` to:

1. **Exclude Node.js modules from client bundle**:
   ```javascript
   config.resolve.fallback = {
     fs: false,
     path: false,
     crypto: false,
     stream: false,
     os: false,
     'onnxruntime-node': false,  // Critical fix
     'onnxruntime-common': false,
   };
   ```

2. **Ignore .node files**:
   ```javascript
   config.module.rules.push({
     test: /\.node$/,
     use: 'empty-loader',  // Returns empty module for .node files
   });
   ```

3. **Externalize onnxruntime-node**:
   ```javascript
   config.externals.push('onnxruntime-node');
   ```

## Installed Package

```bash
npm install --save-dev empty-loader
```

This loader returns an empty module for files that match the pattern (`.node` files in this case).

## How It Works Now

- **Client-side (browser)**: Uses `@huggingface/transformers` with ONNX Runtime Web (WebAssembly)
- **Server-side**: Node.js modules are excluded, so PyAnnote diarization only runs client-side
- **Native bindings**: Ignored by webpack using `empty-loader`

## Verification

After this fix, the build should complete successfully:

```bash
npm run build  # Should work now
npm run dev    # Should work without errors
```

## Important Notes

1. **PyAnnote diarization is client-side only**: This is intentional and correct. The feature needs access to the audio file, which is only available client-side.

2. **No server-side rendering**: The diarization components must be client-only (`'use client'` directive).

3. **WebAssembly required**: Users need a modern browser with WebAssembly support (all modern browsers).

## Troubleshooting

If you still get build errors:

1. **Clear Next.js cache**:
   ```bash
   rm -rf .next
   npm run build
   ```

2. **Clear node_modules and reinstall**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check for conflicting webpack plugins**: Make sure no other plugins are trying to process `.node` files.

## References

- [Next.js Webpack Configuration](https://nextjs.org/docs/api-reference/next.config.js/custom-webpack-config)
- [Hugging Face Transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)



