const { EntryOptionWebpackPlugin,
    AfterPlugins,
    RunPlugin,
    CompileWebpackPlugin,
    AfterCompileWebpackPlugin,
    EmitWebpackPlugin,
    DoneWebpackPlugin 
} = require('./plugins')

module.exports = {
    entry: './src/index.js',
    output: {
        path: './',
        filename: 'bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.less$/,
                use: ['style-loader', 'less-loader']
            }
        ]
    },
    plugins: [
        new EntryOptionWebpackPlugin(),
        new AfterPlugins(),
        new RunPlugin(),
        new CompileWebpackPlugin(),
        new AfterCompileWebpackPlugin(),
        new EmitWebpackPlugin(),
        new DoneWebpackPlugin()
    ]
}