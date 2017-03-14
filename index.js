var _ = fis.util;
var path = require('path');

module.exports = function(ret, conf,settings,opt) {
	//主要就是根据settings里面的设置，从ret里面拿出对应的文件，把文件内容抽出来放到settings的key路径下，生成一个文件
	
	var src = ret.src;
	var packroute = {};
	var sources = [];
	var root = fis.project.getProjectPath();// 拿到项目根路径

	// 如果有settings,就把settings放到packroute里面
	if (settings && Object.keys(settings).length) {
		packroute = settings;
	};

	// 将所有文件都push到source里面
	Object.keys(src).forEach(function(key) {
		sources.push(src[key]);
	});

	// 定义查询方法
	function find(reg, rExt) {
	    if (src[reg]) {
			return [src[reg]];
	    } else if (reg === '**') {
			// do nothing
	    } else if (typeof reg === 'string') {
			reg = _.glob(reg);
	    }
	    // 如果是正则，就在sources里寻找匹配的
	    return sources.filter(function (file) {
	      reg.lastIndex = 0;
	      return (reg === '**' || reg.test(file.subpath)) && (!rExt || file.rExt === rExt);
	    });
	  }

	// 获取所有的符合条件
	Object.keys(packroute).forEach(function(subpath, index) {
		var patterns = packroute[subpath];
		// 拿到的配置路径是不是数组，不是的话组一个数组
		if (!Array.isArray(patterns)) {
			patterns = [patterns];
		};

		// 循环数组
		var valid = patterns.every(function(pattern) {
			return typeof pattern === 'string' || pattern instanceof RegExp;// 我不需要这个正则的情况吧？加上吧还是
		});

		if (!valid) {
			throw new TypeError('only string or RegExp are allowed')
		};

		// 定义输出文件
		var pkg = fis.file.wrap(path.join(root, subpath));
		// 如果有同名文件，报警
		if (typeof ret.src[pkg.subpath] !== 'undefined') {
	      fis.log.warning('there is a namesake file of package [' + subpath + ']');
	    }

		// 循环读取限制条件
		var list = [];
		patterns.forEach(function(pattern, index) {
			var exclude = typeof pattern === 'string' && pattern.substring(0, 1) === '!';

			var mathes = find(pattern, pkg.rExt);
      		list = _[exclude ? 'difference' : 'union'](list, mathes);
		});

		// 拿到list就是符合条件的文件集合
		var content = '[';

		list.forEach(function(file) {
			var c = file.getContent();
			// 派送事件
	        var message = {
	          file: file,
	          content: c,
	          pkg: pkg
	        };
	        fis.emit('pack:file', message);
	        c = message.content;
	        // 拼接content字符串
	        content += c;
	        content += ',';
		});
		content = content.substring(0, content.length - 1);
		content += ']';
		pkg.setContent(content);
		ret.pkg[pkg.subpath] = pkg;
	});
}