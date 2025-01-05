const path = require('path');

module.exports = {
    entry: './src/index.ts', // Entry point of your app
    module: {
        rules: [
            {
                test: /\.ts$/,             // Match `.ts` files
                use: 'ts-loader',          // Use `ts-loader` for TypeScript
                exclude: /node_modules/    // Exclude `node_modules`
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js']      // Resolve `.ts` and `.js` extensions
    },
    output: {
        filename: 'bundle.js',          // Output file
        path: path.resolve(__dirname, 'dist') // Output directory
    },
    mode: 'development'
};
