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
