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