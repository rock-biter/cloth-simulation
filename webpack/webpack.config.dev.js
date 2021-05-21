const Path = require('path');
const { merge } = require('webpack-merge');
const Webpack = require('webpack');

const common = require('./webpack.common.js');

module.exports = merge(common, {
    mode: 'development',
    output: {
        chunkFilename: 'js/[name].chunk.js',
    },
    devServer: {
        inline: true,
        hot: true,
    },
    plugins: [
        new Webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('development'),
        }),
    ],
    module: {
        rules: [
            // {
            //     test: /\.js$/,
            //     include: Path.resolve(__dirname,'../src'),
            //     enforce: 'pre'
            // },
            {
                test: /\.html$/i,
                loader: 'html-loader',
            },
            {
                test: /\.m?js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            },
            {
                test: /\.s?css$/i,
                use: ['style-loader', 'css-loader?sourceMap=true', 'postcss-loader', 'sass-loader'],
            },
        ]
    }
});