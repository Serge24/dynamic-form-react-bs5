/*const path = require('path');

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
};*/

const path = require('path');

module.exports = {
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
                        },
                    },
                ],
                exclude: /node_modules/,
            },
            {
                test: /\.js$/,
                enforce: 'pre',
                use: ['source-map-loader'],
            },
        ],
    },
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    output: {
        filename: 'bundle.js',          // Output file
        path: path.resolve(__dirname, 'dist') // Output directory
    },
    mode: 'development'
};

