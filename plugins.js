//为了简要说明webpack插件的原理，不采用require第三方的插件
class EntryOptionWebpackPlugin {
    apply(compiler) {
        compiler.hooks.entryOption.tap('Plugin', (option) => {
            console.log('EntryOptionWebpackPlugin');
        });
    }
}
class AfterPlugins {
    apply(compiler) {
        compiler.hooks.afterPlugins.tap('Plugin', (option) => {
            console.log('AfterPlugins');
        });
    }
}
class RunPlugin {
    apply(compiler) {
        compiler.hooks.run.tap('Plugin', (option) => {
            console.log('RunPlugin');
        });
    }
}
class CompileWebpackPlugin {
    apply(compiler) {
        compiler.hooks.beforeCompile.tap('Plugin', (option) => {
            console.log('CompileWebpackPlugin');
        });
    }
}
class AfterCompileWebpackPlugin {
    apply(compiler) {
        compiler.hooks.afterCompile.tap('Plugin', (option) => {
            console.log('AfterCompileWebpackPlugin');
        });
    }
}
class EmitWebpackPlugin {
    apply(compiler) {
        compiler.hooks.emit.tap('Plugin', () => {
            console.log('EmitWebpackPlugin');
        });
    }
}
class DoneWebpackPlugin {
    apply(compiler) {
        compiler.hooks.done.tap('Plugin', (option) => {
            console.log('DoneWebpackPlugin');
        });
    }
}

module.exports = {
    EntryOptionWebpackPlugin,
    AfterPlugins,
    RunPlugin,
    CompileWebpackPlugin,
    AfterCompileWebpackPlugin,
    EmitWebpackPlugin,
    DoneWebpackPlugin
}