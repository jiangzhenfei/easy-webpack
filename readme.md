## easy-webpack
本框架模拟webpack打包工具

#### 创建package.json

```json
{
    "name": "simple-webpack",
    "version": "1.0.0",
    "description": "",
    "main": "index.js",
    "directories": {
        "lib": "lib"
    },
    "scripts": {
        "mywebpack": "node ./bin/mwebpack.js"
    },
    "author": "",
    "license": "ISC",
    "dependencies": {
    }
}
```
#### 创建/bin/mwebpack.js
```node
#! /usr/bin/env node        /*标注文件的运行环境*/
const path = require('path');
const fs = require('fs');
//当前工作目录
const root = process.cwd();
//引入Compiler
const Compiler = require('../lib/Compiler'); 


//配置文件和 Shell 语句中读取与合并参数,这里简化逻辑，没有处理shell部分
let options = require(path.resolve(__dirname,'../webpack.config.js'));

//初始化compiler对象加载所有配置的插件
let compiler = new Compiler(options); 

// 执行对象的 run 方法开始执行编译
compiler.run();

```
#### 初始化Compiler
在当前目录下创建/lib/Compiler.js
```node
const path = require('path');
const fs = require('fs');
class Compiler {
    constructor(options){
        this.options = options;
    }
    run(){
        console.log('---------start---------')
    }
}
module.exports = Compiler
```
#### 完善run方法
```node 
const path = require('path');
const fs = require('fs');
class Compiler {
    constructor(options){
        this.options = options;
    }
    run(){
        let that = this;
        let {entry} = this.options; // 获取webpck.config.js中的entry
        this.root = process.cwd();      
        this.entryId = null;        //记录入口的id，这里采用单入口简化
        this.modules = {};          //缓存入口的依赖，这里采用单入口简化
        
        // 找出该模块依赖的模块
        //再递归本步骤直到所有入口依赖的文件都经过了本步骤的处理
        this.buildModule(path.resolve(this.root, entry), true);
        
        // 输出资源
        this.emitFile();
    }
}
module.exports = Compiler
```
#### 编写buildModule
编译模块：从入口文件出发，调用所有配置的Loader对模块进行翻译，再找出该模块依赖的模块，再递归本步骤直到所有入口依赖的文件都经过了本步骤的处理
完成模块编译：在经过第4步使用Loader翻译完所有模块后，得到了每个模块被翻译后的最终内容以及它们之间的依赖关系
输出资源：根据入口和模块之间的依赖关系，组装成一个个包含多个模块的Chunk，再把每个 Chunk 转换成一个单独的文件加入到输出列表，这步是可以修改输出内容的最后机会
```node 
const path = require('path');
const fs = require('fs');
class Compiler {
    constructor(options){
        this.options = options;
    }
    run(){
        let that = this;
        let {entry} = this.options; 
        this.root = process.cwd();      
        this.entryId = null;        
        this.modules = {};          
        this.buildModule(path.resolve(this.root, entry), true);
        this.emitFile();
    }
     getSource(modulePath) {
        let source = fs.readFileSync(modulePath, 'utf8');
        
        //TODO：loader的处理逻辑写在这里，后面会提到
        
        return source; 
        
    }
    buildModule(modulePath,isEntry){
        let that = this; 
        let source = this.getSource(modulePath);//获取源代码
        
        //生成相对于工作根目录的模块ID，相对路径exp：'./sec/index'
        let moduleId = './' + path.relative(this.root, modulePath);
        
        //如果是入口的话把id赋给compiler对象的入口
        if (isEntry) {
            this.entryId = moduleId;
        }
    
        //获取AST的编译结果，获取依赖的模块，并且将代码进行转换
        let { dependencies, sourcecode } = this.parse(source, path.dirname(moduleId));
        this.modules[moduleId] = sourcecode;
        
        //递归解析依赖的模块
        dependencies.forEach(dependency => that.buildModule(path.join(that.root, dependency)));
    }
    emitFile(){
        
    }
}
module.exports = Compiler
```
#### 编写parse函数
编译模块：从入口文件出发，调用所有配置的Loader对模块进行翻译，再找出该模块依赖的模块，再递归本步骤直到所有入口依赖的文件都经过了本步骤的处理
代码转换成AST，webpack中使用的Acorn，这里使用babel-types，babel-traverse，babel-generator替代：
babylon把源码转成AST
babel-types生成节点或者判断节点类型
babel-traverse遍历AST，捕获指定的节点
babel-generator将AST重新生成代码
```node 
npm install babylon babel-types babel-generator babel-traverse
```
查看原生webpack生成的bundle.js，需要将require换成__webpack_require__，并且将路径修改为相对于根目录的相对路径

把js文件内容解析ast，并且分析require依赖
```node
const path = require('path');
const fs = require('fs');
const babylon = require('babylon');
const t = require('babel-types');
//采用es6的写法，所以要在后面添加.default
const traverse = require('babel-traverse').default;
const generator = require('babel-generator').default;
class Compiler {
    constructor(options){
        this.options = options;
    }
    run(){
        let that = this;
        let {entry} = this.options; 
        this.root = process.cwd();      
        this.entryId = null;        
        this.modules = {};          
        this.buildModule(path.resolve(this.root, entry), true);
        this.emitFile();
    }
    getSource(modulePath) {
        let source = fs.readFileSync(modulePath, 'utf8');
        //TODO：loader的处理逻辑写在这里，后面会提到
        return source; 
    }
    buildModule(modulePath,isEntry){
        let that = this;
        let source = this.getSource(modulePath);
        let moduleId = './' + path.relative(this.root, modulePath);
        if (isEntry) {
            this.entryId = moduleId;
        }
        let { dependencies, sourcecode } = this.parse(source, path.dirname(moduleId));
        this.modules[moduleId] = sourcecode;
        dependencies.forEach(dependency => that.buildModule(path.join(that.root, dependency)));
    }
    parse(source, parentPath) {
        let that = this;
        let ast = babylon.parse(source);    //源码转语法树
        let dependencies = [];      //存储依赖的模块路径
        //遍历AST找到对应的节点进行修改
        traverse(ast, {
            CallExpression(p) {//p当前路径
                if (p.node.callee.name == 'require') {
                    let node = p.node;
                    //修改方法名
                    node.callee.name = '__webpack_require__';
                    // 得到模块名exp:'./a'
                    let moduleName = node.arguments[0].value;
                    //如果需要的话，添加.js后缀 
                    moduleName += (moduleName.lastIndexOf('.') > 0 ? '' : '.js');
                    //得到依赖模块的id，exp:'./src/a'
                    let moduleId = './' + path.relative(that.root, path.join(parentPath, moduleName));
                    //相对于根目录的相对路径
                    node.arguments = [t.stringLiteral(moduleId)];
                    //把模块id放置到当前模块的依赖列表里
                    dependencies.push(moduleId);
                }
            }
        });
        //将修改的AST重新生成代码
        let sourcecode = generator(ast).code;
        return { sourcecode, dependencies };
    }
    emitFile(){
        
    }
}
module.exports = Compiler
```

#### 编写emitFile函数
输出资源：根据入口和模块之间的依赖关系，组装成一个个包含多个模块的 Chunk，再把每个 Chunk转换成一个单独的文件加入到输出列表，这步是可以修改输出内容的最后机会
每次编译打包后，都会发现webpack打包后的结果很大部分都是一样的，可以抽离出一个模板用来构建每次打包的结果：
创建entry.ejs文件
```txt
// MainTemplate这里采用ejs模板简化
(function(modules) {
    var installedModules = {}; 
    function __webpack_require__(moduleId) {
        if (installedModules[moduleId]) {
            return installedModules[moduleId].exports;
        }
        var module = (installedModules[moduleId] = {
            i: moduleId,
            l: false,
            exports: {}
        });
        modules[moduleId].call(
            module.exports,
            module,
            module.exports,
            __webpack_require__
        );
        module.l = true;
        return module.exports;
    }
        return __webpack_require__((__webpack_require__.s = "<%-entryId%>"));
})({
    <%for (let moduleId in modules) {let source = modules[moduleId];%>
        "<%-moduleId%>":(function(module,exports,__webpack_require__){eval(`<%-source%>`);}),
    <% }%>
}); 
```
##### 完善emitFile函数
```node 
const path = require('path');
const fs = require('fs');
const babylon = require('babylon');
const t = require('babel-types');
const traverse = require('babel-traverse').default;
const generator = require('babel-generator').default;
const ejs = require('ejs');     //引入ejs
class Compiler {
    constructor(options){
        this.options = options;
    }
    run(){
        let that = this;
        let {entry} = this.options; 
        this.root = process.cwd();      
        this.entryId = null;        
        this.modules = {};          
        this.buildModule(path.resolve(this.root, entry), true);
        this.emitFile();
    }
    getSource(modulePath) {
        let source = fs.readFileSync(modulePath, 'utf8');
        //TODO：loader的处理逻辑写在这里，后面会提到
        return source; 
    }
    buildModule(modulePath,isEntry){
        let that = this;
        let source = this.getSource(modulePath);
        let moduleId = './' + path.relative(this.root, modulePath);
        if (isEntry) {
            this.entryId = moduleId;
        }
        let { dependencies, sourcecode } = this.parse(source, path.dirname(moduleId));
        this.modules[moduleId] = sourcecode;
        dependencies.forEach(dependency => that.buildModule(path.join(that.root, dependency)));
    }
    parse(source, parentPath) {
        let that = this;
        let ast = babylon.parse(source);    
        let dependencies = [];    
        traverse(ast, {
            CallExpression(p) {
                if (p.node.callee.name == 'require') {
                    let node = p.node;
                    node.callee.name = '__webpack_require__';
                    let moduleName = node.arguments[0].value;
                    moduleName += (moduleName.lastIndexOf('.') > 0 ? '' : '.js');
                    let moduleId = './' + path.relative(that.root, path.join(parentPath, moduleName));
                    node.arguments = [t.stringLiteral(moduleId)];
                    dependencies.push(moduleId);
                }
            }
        });
        let sourcecode = generator(ast).code;
        return { sourcecode, dependencies };
    }
    emitFile(){
        // 读取模板文件
        let entryTemplate = fs.readFileSync(path.join(__dirname, 'entry.ejs'), 'utf8');
        // 获取渲染的数据
        let { entryId, modules } = this;
        // 将数据渲染到模板上
        let source = ejs.compile(entryTemplate)({
            entryId,
            modules
        });
        //找到目标路径
        let target = path.join(this.options.output.path, this.options.output.filename);
        //将渲染后的模板目标文件
        fs.writeFileSync(target, source);
    }
}
module.exports = Compiler
```

#### 实现loader功能
上面的webpack已经具备打包js的功能了，但是还不能打包css等文件，原生的webpack是通过各种loader来打包css等其他文件的，所以再getSource时调用loader，将其他文件处理成js，然后进行后面的操作

###### 新建less-loader模拟less-loader插件
```node
var less = require('less');
module.exports = function (source) {
    let css;
    less.render(source, (err, output) => {
        css = output.css;
    });
    return css.replace(/\n/g, '\\n', 'g');
}
```
###### 新建style-loader模拟style-loader插件
```node
//style-loader的功能就是将加载的css文件放在style标签中插入到页面
module.exports = function (source) {
    let str = `
      let style = document.createElement('style');
      style.innerHTML = ${JSON.stringify(source)};
      document.head.appendChild(style);
    `;
    return str;
}
```
完善构建过程
```node 
const path = require('path');
const fs = require('fs');
const babylon = require('babylon');
const t = require('babel-types');
const traverse = require('babel-traverse').default;
const generator = require('babel-generator').default;
const ejs = require('ejs');     //引入ejs
class Compiler {
    constructor(options){
        this.options = options;
    }
    run(){
        let that = this;
        let {entry} = this.options; 
        this.root = process.cwd();      
        this.entryId = null;        
        this.modules = {};          
        this.buildModule(path.resolve(this.root, entry), true);
        this.emitFile();
    }
    getSource(modulePath) {
        let source = fs.readFileSync(modulePath, 'utf8');
        
        //获取webpack.config.js中的rules
        let rules = that.options.module.rules;
 
        //遍历rules调用loader
        for (let i = 0; i < rules.length; i++) {
            let rule = rules[i];
            // 用rule的test中正则匹配文件的类型是否需要使用laoder
            if (rule.test.test(modulePath)) {
                //获取rule中的loaders，例如['style-laoder','css-loader']
                let loaders = rule.use;
                let length = loaders.length;    //loader的数量 
                let loaderIndex = length - 1;   // 往右向左执行
                
                // loader遍历器
                function iterateLoader() {
                    let loaderName = loaders[loaderIndex--];
                    //loader只是一个包名，需要用require引入
                    let loader = require(path.join(that.root, loaderName));
                    //使用loader，可以看出loader的本质是一个函数
                    source = loader(source);
                    if (loaderIndex >= 0) {
                        iterateLoader();
                    }
                }
                
                //遍历执行loader
                iterateLoader();
            }
        }
        return source; 
    }
    buildModule(modulePath,isEntry){
        let that = this;
        let source = this.getSource(modulePath);
        let moduleId = './' + path.relative(this.root, modulePath);
        if (isEntry) {
            this.entryId = moduleId;
        }
        let { dependencies, sourcecode } = this.parse(source, path.dirname(moduleId));
        this.modules[moduleId] = sourcecode;
        dependencies.forEach(dependency => that.buildModule(path.join(that.root, dependency)));
    }
    parse(source, parentPath) {
        let that = this;
        let ast = babylon.parse(source);    
        let dependencies = [];    
        traverse(ast, {
            CallExpression(p) {
                if (p.node.callee.name == 'require') {
                    let node = p.node;
                    node.callee.name = '__webpack_require__';
                    let moduleName = node.arguments[0].value;
                    moduleName += (moduleName.lastIndexOf('.') > 0 ? '' : '.js');
                    let moduleId = './' + path.relative(that.root, path.join(parentPath, moduleName));
                    node.arguments = [t.stringLiteral(moduleId)];
                    dependencies.push(moduleId);
                }
            }
        });
        let sourcecode = generator(ast).code;
        return { sourcecode, dependencies };
    }
    emitFile(){
        let entryTemplate = fs.readFileSync(path.join(__dirname, 'entry.ejs'), 'utf8');
        let { entryId, modules } = this;
        let source = ejs.compile(entryTemplate)({
            entryId,
            modules
        });
        let target = path.join(this.options.output.path, this.options.output.filename);
        fs.writeFileSync(target, source);
    }
}
module.exports = Compiler
```
创建/src/index.less
```less
@color: #000;
body{
    color: @color;
}
```
修改/src/index.js
```js
require('index.less')
```
修改webpack.config.js
```js
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
    ]
}
```

#### 实现plugin功能
原生webpack支持很多种插件，在webpack编译的过程中的各个阶段使用，常见的一些钩子：

entryOption 读取配置文件
afterPlugins 加载所有的插件
run 开始执行编译流程
compile 开始编译
afterCompile 编译完成
emit 写入文件
done 完成整体流程
修改bin/mwebpack.js
注册规则阶段的钩子，供用户订阅来执行插件。

```node
const path = require('path');
const fs = require('fs');
const babylon = require('babylon');
const t = require('babel-types');
//采用es6的写法，所以要在后面添加.default
const traverse = require('babel-traverse').default;
const generator = require('babel-generator').default;
const ejs = require('ejs');     //引入ejs
//使用tapable来创建发布者，利用call等来触发
const { SyncHook } = require('tapable');

class Compiler {
    constructor(options){
        this.options = options;

        this.hooks = {
            entryOption: new SyncHook(),
            afterPlugins: new SyncHook(),
            run: new SyncHook(),
            beforeCompile: new SyncHook(),
            afterCompile: new SyncHook(),
            emit: new SyncHook(),
            afterEmit: new SyncHook(),
            done: new SyncHook(),
        }
    }
    run(){
        let compiler = this;

        compiler.hooks.run.call();                         //触发run

        let {entry} = this.options; 
        this.root = process.cwd();      
        this.entryId = null;        
        this.modules = {};       

        compiler.hooks.beforeCompile.call();    //触发beforeCompile

        this.buildModule(path.resolve(this.root, entry), true);

        compiler.hooks.afterCompile.call();     //afterCompile

        this.hooks.emit.call();                 //触发emit
        this.emitFile();

        compiler.hooks.afterEmit.call();        //触发afterEmit
        compiler.hooks.done.call();             //触发done
    }
    getSource(modulePath) {
        let source = fs.readFileSync(modulePath, 'utf8');
        let that = this;
        
        //获取webpack.config.js中的rules
        let rules = that.options.module.rules;
 
        //遍历rules调用loader
        for (let i = 0; i < rules.length; i++) {
            let rule = rules[i];
            // 用rule的test中正则匹配文件的类型是否需要使用laoder
            if (rule.test.test(modulePath)) {
                //获取rule中的loaders，例如['style-laoder','css-loader']
                let loaders = rule.use;
                let length = loaders.length;    //loader的数量 
                let loaderIndex = length - 1;   // 往右向左执行
                
                // loader遍历器
                function iterateLoader() {
                    let loaderName = loaders[loaderIndex--];
                    //loader只是一个包名，需要用require引入
                    let loader = require(path.join(that.root, loaderName));
                    //使用loader，可以看出loader的本质是一个函数
                    source = loader(source);
                    if (loaderIndex >= 0) {
                        iterateLoader();
                    }
                }
                
                //遍历执行loader
                iterateLoader();
                break;
            }
        }
        return source; 
    }

    buildModule(modulePath,isEntry){
        let that = this;
        let source = this.getSource(modulePath);
        let moduleId = './' + path.relative(this.root, modulePath);
        if (isEntry) {
            this.entryId = moduleId;
        }
        let { dependencies, sourcecode } = this.parse(source, path.dirname(moduleId));
        this.modules[moduleId] = sourcecode;
        dependencies.forEach(dependency => that.buildModule(path.join(that.root, dependency)));
    }

    parse(source, parentPath) {
        let that = this;
        let ast = babylon.parse(source);    //源码转语法树
        let dependencies = [];      //存储依赖的模块路径
        //遍历AST找到对应的节点进行修改
        traverse(ast, {
            CallExpression(p) {//p当前路径
                if (p.node.callee.name == 'require') {
                    let node = p.node;
                    //修改方法名
                    node.callee.name = '__webpack_require__';
                    // 得到模块名exp:'./a'
                    let moduleName = node.arguments[0].value;
                    //如果需要的话，添加.js后缀 
                    moduleName += (moduleName.lastIndexOf('.') > 0 ? '' : '.js');
                    //得到依赖模块的id，exp:'./src/a'
                    let moduleId = './' + path.relative(that.root, path.join(parentPath, moduleName));
                    //相对于根目录的相对路径
                    node.arguments = [t.stringLiteral(moduleId)];
                    //把模块id放置到当前模块的依赖列表里
                    dependencies.push(moduleId);
                }
            }
        });
        //将修改的AST重新生成代码
        let sourcecode = generator(ast).code;
        return { sourcecode, dependencies };
    }

    emitFile(){
        // 读取模板文件
        let entryTemplate = fs.readFileSync(path.join(this.root, 'entry.ejs'), 'utf8');
        // 获取渲染的数据
        let { entryId, modules } = this;
        // 将数据渲染到模板上
        let source = ejs.compile(entryTemplate)({
            entryId,
            modules
        });
        //找到目标路径
        let target = path.join(this.root,this.options.output.path, this.options.output.filename);
        //将渲染后的模板目标文件
        fs.writeFileSync(target, source);
    }
}
module.exports = Compiler
```

```node 
#! /usr/bin/env node        /*标注文件的运行环境*/
const path = require('path');
const fs = require('fs');
//当前工作目录
const root = process.cwd();
//引入Compiler
const Compiler = require('../lib/Compiler'); 


//配置文件和 Shell 语句中读取与合并参数,这里简化逻辑，没有处理shell部分
let options = require(path.resolve(__dirname,'../webpack.config.js'));

//初始化compiler对象加载所有配置的插件
let compiler = new Compiler(options); 
compiler.hooks.entryOption.call();     //触发entryOptions

let {plugins} = options;
plugins.forEach(plugin => {
    plugin.apply(compiler)
});
compiler.hooks.afterPlugins.call(),     //触发afterPlugins


// 执行对象的 run 方法开始执行编译
compiler.run();
```

```node 
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
```
执行npm run mywebpack 可以看到

##结语 webpack的主要工作：
合并option，获取plugin注册插件
run获得入口文件，用loader对入口文件进行处理，
将其转化为AST进行代码修改，递归分析其依赖的模块
根据入口文件的依赖项，将其渲染到对应的模板文件，然后写到出口文件中