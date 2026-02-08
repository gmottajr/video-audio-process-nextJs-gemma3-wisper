/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
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

