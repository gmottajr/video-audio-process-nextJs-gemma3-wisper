/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // COEP/COOP only on /forge — needed for SharedArrayBuffer (Whisper/FFmpeg WASM).
        // Must NOT be applied to /music (blocks YouTube iframes) or landing page.
        // Note: '/forge/:path*' does NOT match '/forge' (exact) — use regex form instead.
        source: '/forge(.*)',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      {
        // CORP required on every static asset fetched by a page under COEP require-corp.
        // Without this header Brave/Chrome silently blocks the resource (empty ErrorEvent).
        // Covers: transcription worker, transformers bundle, ONNX WASM blobs.
        source: '/transcription.worker.js',
        headers: [{ key: 'Cross-Origin-Resource-Policy', value: 'same-origin' }],
      },
      {
        source: '/transformers.min.js',
        headers: [{ key: 'Cross-Origin-Resource-Policy', value: 'same-origin' }],
      },
      {
        // ONNX WASM files loaded inside the worker (which inherits COEP from the page).
        source: '/:file*.wasm',
        headers: [{ key: 'Cross-Origin-Resource-Policy', value: 'same-origin' }],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Exclude Node.js modules from client bundle
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      os: false,
      'onnxruntime-node': false,
      'onnxruntime-common': false,
    };

    // Ignore .node files (native bindings) - use empty-loader
    config.module.rules.push({
      test: /\.node$/,
      use: 'empty-loader',
    });

    // Externalize onnxruntime-node to prevent bundling
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push('onnxruntime-node');
    }

    return config;
  },
};

export default nextConfig;

