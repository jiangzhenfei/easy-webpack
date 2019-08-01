// 模拟less-loader
var less = require('less');
module.exports = function (source) {
    
    let css;
    less.render(source, (err, output) => {
        css = output.css;
    });
    return css.replace(/\n/g, '\\n', 'g');
}