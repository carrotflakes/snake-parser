var expressions = require("./expressions");

var indentStr = "\t";

var makeIndent = function(level) {
	return new Array(level + 1).join(indentStr);
};

var addIndent = function(str, level) {
	if (str === "")
		return str;
	var indent = makeIndent(level);
	return indent + str.replace(/\n(?!$)/g, "\n" + indent);
};

var getId = function(ids, name) {
	if (name in ids)
		return ids[name];
	else
		return (ids[name] = 0);
};

var newId = function(ids, name) {
	if (name in ids)
		return name + ++ids[name];
	else
		return name + (ids[name] = 0);
};

var makeVarState = function(vs, indentLevel) {
	vs = vs.filter(function(v) {
		if (v instanceof Object)
			return v[0];
		else
			return v;
	});
	vs = vs.map(function(v) {
		if (v instanceof Object)
			return v[0] + (v[1] ? " = " + v[1] : "");
		else
			return v;
	});
	if (vs.length)
		return makeIndent(indentLevel) + "var " + vs.join(", ") + ";\n";
	else
		return "";
};

var stringEscape = function(str) {
	return str
		.replace(/\\/g,		"\\\\")
		.replace(/"/g,		"\\\"")
		.replace(/\x08/g, "\\b")
		.replace(/\t/g,		"\\t")
		.replace(/\n/g,		"\\n")
		.replace(/\f/g,		"\\f")
		.replace(/\r/g,		"\\r")
    .replace(/[\x00-\x07\x0B\x0E\x0F\x10-\x1F\x80-\xFF]/g, function(c) {
			return "\\x" + ("0" + c.charCodeAt().toString(16)).slice(-2);
		})
    .replace(/[\u0100-\uFFFF]/g, function(c) {
			return "\\u" + ("0" + c.charCodeAt().toString(16)).slice(-4);
		});
};

var stringify = function(object) {
	return JSON.stringify(object)
		.replace(/\u2028/g, "\\u2028")
		.replace(/\u2029/g, "\\u2029");
};

var makeErrorLogging = function(match, indentLevel) {
	var matchStr = '"' + stringEscape(match) + '"';
	var indent = makeIndent(indentLevel);
	return indent + "$matchingFail(" + matchStr + ");\n";
};

expressions.nop.prototype.gen = function(ids, pos, objsLen, indentLevel) {
	return makeIndent(indentLevel) + "// ???\n";
};

expressions.oc.prototype.gen = function(ids, pos, objsLen, indentLevel) {
	if (this.children.length === 1)
		return this.children[0].gen(ids, pos, objsLen, indentLevel);
	var indent = makeIndent(indentLevel);
	var posV, objsLenV;
	pos = pos || (posV = newId(ids, "pos"));
	objsLen = objsLen || (objsLenV = newId(ids, "objsLen"));

	var states = [];
	states.push(makeVarState([[posV, "$pos"], [objsLenV, "$objsLen"]], indentLevel));
	var ids1 = {}; ids1.__proto__ = ids;
	states.push(this.children[0].gen(ids1, pos, objsLen, indentLevel));
	for (var i = 1; i < this.children.length; ++i) {
		states.push(indent + "if ($pos === -1) {\n");
		states.push(indent + indentStr + "$pos = " + pos + ";\n");
		states.push(indent + indentStr + "$objsLen = " + objsLen + ";\n");
		var ids1 = {}; ids1.__proto__ = ids;
		states.push(this.children[i].gen(ids1, pos, objsLen, indentLevel + 1));
		states.push(indent + "}\n");
	}
	return states.join("");
};


expressions.seq.prototype.gen = function(ids, pos, objsLen, indentLevel) {
	if (this.children.length === 1)
		return this.children[0].gen(ids, pos, objsLen, indentLevel);
	var indent = makeIndent(indentLevel);
	var states = [];
	var ids1 = {}; ids1.__proto__ = ids;
	states.push(this.children[0].gen(ids1, pos, objsLen, indentLevel));
	for (var i = 1; i < this.children.length; ++i) {
		var ids1 = {}; ids1.__proto__ = ids;
		states.push(indent + "if ($pos !== -1) {\n");
		states.push(this.children[i].gen(ids1, null, null, indentLevel + 1));
		states.push(indent + "}\n");
	}
	return states.join("");
};

expressions.rep.prototype.gen = function(ids, pos, objsLen, indentLevel) { // TODO min max によって特殊化
	var indent = makeIndent(indentLevel);
	pos = newId(ids, "pos");
	objsLen = newId(ids, "objsLen");
	var i = newId(ids, "i");

	var states = [];
	states.push(makeVarState([[pos, "$pos"], [objsLen, "$objsLen"]], indentLevel));
	if (this.max != Infinity)
		states.push(indent + "for (var " + i + " = 0; " + i + " < " + this.max + "; ++" + i + ") {\n");
	else
		states.push(indent + "for (var " + i + " = 0; ; ++" + i + ") {\n");
	states.push(this.child.gen(ids, pos, objsLen, indentLevel + 1));
	states.push(indent + indentStr + "if ($pos !== -1) {\n");
	if (this.max === Infinity)
		states.push(indent + indentStr + indentStr + "if ($pos === " + pos + ") throw new Error(\"Infinite loop detected.\");\n");
	states.push(indent + indentStr + indentStr + pos + " = $pos;\n");
	states.push(indent + indentStr + indentStr + objsLen + " = $objsLen;\n");
	states.push(indent + indentStr + "} else {\n");
	states.push(indent + indentStr + indentStr + "break;\n");
	states.push(indent + indentStr + "}\n");
	states.push(indent + "}\n");
	states.push(indent + "$pos = " + pos + ";\n");
	states.push(indent + "$objsLen = " + objsLen + ";\n");
	states.push(indent + "if (" + i + " < " + this.min + ") $pos = -1;\n");
	return states.join("");
};
/*
var pos1, objs1, flag = false;
flag:
for (var i = 0; i < this.max; ++i) {
	pos1 = pos;
	objs1 = [];
	// child の処理
	if (child の結果) {
		if (pos === pos1 && this.max === Infinity)
			throw new InfiniteLoopError();
		pos0 = pos1;
		objs0.concat(objs1);
	} else {
		if (this.min <= i) {
			flag = true;
		}
		break flag;
	}
}
if (flag) {
	pass
} else {
	fail
}
*/


expressions.str.prototype.gen = function(ids, pos, objsLen, indentLevel) {
	if (this.string.length === 0)
		return "";

	var indent = makeIndent(indentLevel);
	var states = [];
	if (this.string.length !== 1)
		states.push(indent + "if ($input.substr($pos, " + this.string.length + ") === " + stringify(this.string) + ")\n");
	else
		states.push(indent + "if ($input.charCodeAt($pos) === " + this.string.charCodeAt() + ")\n");
	states.push(indent + indentStr + "$pos += " + this.string.length + ";\n");
	states.push(indent + "else\n");
	states.push(makeErrorLogging(stringify(this.string), indentLevel + 1));
//	states.push(indent + "}\n");
	return states.join("");
};

expressions.cc.prototype.gen = function(ids, pos, objsLen, indentLevel) {
	var indent = makeIndent(indentLevel);
	var c = "c";
	var conds = [];
	for (var i in this.charactorClass) {
		var cc = this.charactorClass[i];
		if (cc.type === "range")
			conds.push("(" + cc.start + " <= " + c + " && " + c + " <= " + cc.end + ")");
		else
			conds.push(c + " === " + cc.char);
	}
	var states = [];
	states.push(indent + "var " + c + " = $input.charCodeAt($pos);\n");
	if (!this.invert) {
		if (conds.length === 0)
			states.push(indent + "if (false)\n");
		else
			states.push(indent + "if (" + conds.join(" || ") + ")\n");
	} else {
		if (conds.length === 0)
			states.push(indent + "if (true)\n");
		else
			states.push(indent + "if (!isNaN(" + c + ") && !(" + conds.join(" || ") + "))\n");
	}
	states.push(indent + indentStr + "$pos += 1;\n");
	states.push(indent + "else\n");
	states.push(makeErrorLogging(stringEscape(this.makeError()), indentLevel + 1));
//	states.push(indent + "}\n");
	return states.join("");
};

expressions.cc.prototype.makeError = function() {
	return (this.invert ? "[^" : "[") + this.charactorClass.map(
		function(x) {
			if (x.type == "range")
				return String.fromCharCode(x.start) + "-" + String.fromCharCode(x.end);
			else
				return String.fromCharCode(x.char);
		}).join("") + "]";
};

expressions.ac.prototype.gen = function(ids, pos, objsLen, indentLevel) {
	var indent = makeIndent(indentLevel);
	var states = [];
	states.push(indent + "if ($pos < $inputLength)\n");
	states.push(indent + indentStr + "$pos += 1;\n");
	states.push(indent + "else\n");
	states.push(makeErrorLogging(".", indentLevel + 1));
//	states.push(indent + "}\n");
	return states.join("");
};

expressions.obj.prototype.gen = function(ids, pos, objsLen, indentLevel) {
	var indent = makeIndent(indentLevel);
	var objsLenV;
	objsLen = objsLen || (objsLenV = newId(ids, "objsLen"));
	var obj = newId(ids, "obj");
	var states = [];
	states.push(makeVarState([[objsLenV, "$objsLen"]], indentLevel));
	states.push(this.child.gen(ids, pos, objsLen, indentLevel));
	states.push(indent + "if ($pos !== -1) {\n");
	states.push(indent + indentStr + "var " + obj + " = {};\n");
	states.push(indent + indentStr + "for (var i = " + objsLen + "; i < $objsLen; i++)\n");
	states.push(indent + indentStr + indentStr + obj + "[$objs[i].key] = $objs[i].value;\n");
	states.push(indent + indentStr + "$objsLen = " + objsLen + " + 1;\n");
	states.push(indent + indentStr + "$objs[" + objsLen + "] = " + obj + ";\n");
	states.push(indent + "}\n");
	return states.join("");
};

expressions.itm.prototype.gen = function(ids, pos, objsLen, indentLevel) {
	var indent = makeIndent(indentLevel);
	var objsLenV;
	objsLen = objsLen || (objsLenV = newId(ids, "objsLen"));
	var states = [];
	states.push(makeVarState([[objsLenV, "$objsLen"]], indentLevel));
	states.push(this.child.gen(ids, pos, objsLen, indentLevel));
	states.push(indent + "if ($pos !== -1) {\n");
	states.push(indent + indentStr + "$objs[" + objsLen + "] = {key: " + stringify(this.key) + ", value: $objs[" + objsLen + "]};\n");
	states.push(indent + indentStr + "$objsLen = " + objsLen + " + 1;\n");
	states.push(indent + "}\n");
	return states.join("");
};

expressions.ci.prototype.gen = function(ids, pos, objsLen, indentLevel) {
	var indent = makeIndent(indentLevel);
	var states = [];
	states.push(indent + "$objs[$objsLen++] = {key: " + stringify(this.key) + ", value: " + stringify(this.value) + "};\n");
	return states.join("");
};

expressions.arr.prototype.gen = function(ids, pos, objsLen, indentLevel) {
	var indent = makeIndent(indentLevel);
	var objsLenV;
	objsLen = objsLen || (objsLenV = newId(ids, "objsLen"));
	var states = [];
	states.push(makeVarState([[objsLenV, "$objsLen"]], indentLevel));
	states.push(this.child.gen(ids, pos, objsLen, indentLevel));
	states.push(indent + "if ($pos !== -1) {\n");
	states.push(indent + indentStr + "$objs[" + objsLen + "] = $objs.slice(" + objsLen + ", $objsLen);\n");
	states.push(indent + indentStr + "$objsLen = " + objsLen + " + 1;\n");
	states.push(indent + "}\n");
	return states.join("");
};

expressions.tkn.prototype.gen = function(ids, pos, objsLen, indentLevel) {
	var indent = makeIndent(indentLevel);
	var posV;
	pos = pos || (posV = newId(ids, "pos"));
	var states = [];
	states.push(makeVarState([[posV, "$pos"]], indentLevel));
	states.push(this.child.gen(ids, pos, objsLen, indentLevel));
	states.push(indent + "if ($pos !== -1) {\n");
	states.push(indent + indentStr + "$objs[$objsLen++] = $input.substring(" + pos + ", $pos);\n");
	states.push(indent + "}\n");
	return states.join("");
};

expressions.ltr.prototype.gen = function(ids, pos, objsLen, indentLevel) {
	var indent = makeIndent(indentLevel);
	var states = [];
	states.push(indent + "$objs[$objsLen++] = " + stringify(this.value) + ";\n");
	return states.join("");
};

expressions.pla.prototype.gen = function(ids, pos, objsLen, indentLevel) {
	var indent = makeIndent(indentLevel);
	var posV, objsLenV;
	pos = pos || (posV = newId(ids, "pos"));
	objsLen = objsLen || (objsLenV = newId(ids, "objsLen"));
	var states = [];
	states.push(makeVarState([[posV, "$pos"], [objsLenV, "$objsLen"]], indentLevel));
	states.push(indent + "$errorMask += 1;\n");
	states.push(this.child.gen(ids, pos, objsLen, indentLevel));
	states.push(indent + "$errorMask -= 1;\n");
	states.push(indent + "if ($pos !== -1) {\n");
	states.push(addIndent("$objsLen = " + objsLen + ";\n" +
												"$pos = " + pos + ";\n", indentLevel + 1));
	states.push(indent + "}\n");
	return states.join("");
};

expressions.nla.prototype.gen = function(ids, pos, objsLen, indentLevel) {
	var indent = makeIndent(indentLevel);
	var posV, objsLenV;
	pos = pos || (posV = newId(ids, "pos"));
	objsLen = objsLen || (objsLenV = newId(ids, "objsLen"));
	var states = [];
	states.push(makeVarState([[posV, "$pos"], [objsLenV, "$objsLen"]], indentLevel));
	states.push(indent + "$errorMask += 1;\n");
	states.push(this.child.gen(ids, pos, objsLen, indentLevel));
	states.push(indent + "$errorMask -= 1;\n");
	states.push(indent + "if ($pos === -1) {\n");
	states.push(addIndent("$objsLen = " + objsLen + ";\n" +
												"$pos = " + pos + ";\n", indentLevel + 1));
	states.push(indent + "} else {\n");
	states.push(indent + indentStr + "$pos = -1;\n");
	states.push(indent + "}\n");
	return states.join("");
}; // エラーロギング !

expressions.mod.prototype.gen = function(ids, pos, objsLen, indentLevel) {
	var indent = makeIndent(indentLevel);
	var objsLenV;
	objsLen = objsLen || (objsLenV = newId(ids, "objsLen"));
	var states = [];
	states.push(makeVarState([[objsLenV, "$objsLen"]], indentLevel));
	states.push(this.child.gen(ids, pos, objsLen, indentLevel));
	states.push(indent + "if ($pos !== -1) {\n");
	states.push(indent + indentStr + "$objs[" + objsLen + "] = " + this.identifier + "($objs[" + objsLen + "]);\n");
	states.push(indent + indentStr + "$objsLen = " + objsLen + " + 1;\n");
	states.push(indent + "}\n");
	return states.join("");
};

expressions.grd.prototype.gen = function(ids, pos, objsLen, indentLevel) {
	var indent = makeIndent(indentLevel);
	var objsLenV;
	objsLen = objsLen || (objsLenV = newId(ids, "objsLen"));
	var states = [];
	states.push(makeVarState([[objsLenV, "$objsLen"]], indentLevel));
	states.push(this.child.gen(ids, pos, objsLen, indentLevel));
	states.push(indent + "if ($pos !== -1 && !" + this.identifier + "($objs[" + objsLen + "]))\n");
	states.push(indent + indentStr + "$pos = -1;\n");
	return states.join("");
};

expressions.wst.prototype.gen = function(ids, pos, objsLen, indentLevel) {
	var indent = makeIndent(indentLevel);
	var objsLenV;
	objsLen = objsLen || (objsLenV = newId(ids, "objsLen"));
	var states = [];
	states.push(makeVarState([[objsLenV, "$objsLen"]], indentLevel));
	states.push(this.child.gen(ids, pos, objsLen, indentLevel));
//	states.push(indent + "if ($succeed) {\n");
	states.push(indent + "$objsLen = " + objsLen + ";\n");
//	states.push(indent + "}\n");
	return states.join("");
};

expressions.rul.prototype.gen = function(ids, pos, objsLen, indentLevel) {
	if (this.arguments) { // 引数付きルールの呼び出し
		return this.body.gen(ids, pos, objsLen, indentLevel);
//		var reference = this.getReference();
//		if (reference.inline) // TODO
//			return this.rule.body.gen(ids, pos, objsLen, indentLevel);
	}
	var indent = makeIndent(indentLevel);
	var states = [];
	states.push(indent + "rule$" + this.ruleSymbol + "();\n");
	return states.join("");
};

/*
var key = "r$" + pos;
$readMemo(key);
var pos0 = pos, objs0 = objs, rpos = -1;
undet[pos0] = (undet[pos0] || 0) + 1;
$memo[key] = null;
while (true) {
	pos = pos0;
	objs = [];

	hoge();

	if (!succeed || pos <= rpos)
		break;
	rpos = pos;
	$writeMemo(key, objs);
}
objs = objs0;
$readMemo(key);
if (--undet[pos0] !== 0)
	delete $memo[key];
//*/
var genRule = function(rule, memoRules, useUndet, indentLevel) {
	var indent = makeIndent(indentLevel);
	var ids = {};
	var key = "key";
	var keyValue = "$pos * " + memoRules.length + " + " + memoRules.indexOf(rule.symbol);
	var pos = newId(ids, "pos");

	var setMatchTable = "";
	var unsetMatchTable = "";
	if (rule.name) {
		setMatchTable = "if (!$matchTable[" + pos + "])\n" +
			indentStr + "$matchTable[" + pos + "] = " + JSON.stringify(rule.name) + ";\n"
		unsetMatchTable = "if ($matchTable[" + pos + "] === " + JSON.stringify(rule.name) + ")\n" +
			indentStr + "$matchTable[" + pos + "] = null;\n";
	}

	if (rule.canLeftRecurs) { // 左再帰対応
		var objs = newId(ids, "objs");

		var states = [];
		states.push("function rule$" + rule.symbol + "() {\n");
		states.push(makeVarState([[key, keyValue]], indentLevel + 1));
		states.push(indent + indentStr + "if ($readMemo(" + key + ")) return;\n");
		states.push(addIndent(setMatchTable, indentLevel + 1));
		states.push(indent + indentStr + "$objs.length = $objsLen;\n");
		states.push(makeVarState([[pos, "$pos"], [objs, "$objs"], ["rpos", "-1"]], indentLevel + 1));
		states.push(indent + indentStr + "$undet[" + pos + "] = ($undet[" + pos + "] || 0) + 1;\n");
		states.push(indent + indentStr + "$memo[" + key + "] = $failureObj;\n");
		states.push(indent + indentStr + "while (true) {\n");
		states.push(indent + indentStr + indentStr + "$pos = " + pos + ";\n");
		states.push(indent + indentStr + indentStr + "$objs = [];\n");
		states.push(indent + indentStr + indentStr + "$objsLen = 0;\n");
		states.push(rule.body.gen(ids, pos, "0", indentLevel + 2));
		states.push(indent + indentStr + indentStr + "if ($pos === -1 || $pos <= rpos)\n");
		states.push(indent + indentStr + indentStr + indentStr + "break;\n");
		states.push(indent + indentStr + indentStr + "rpos = $pos;\n");
		states.push(indent + indentStr + indentStr + "$objs.length = $objsLen;\n");
		states.push(indent + indentStr + indentStr + "$writeMemo(" + key + ", $objs);\n");
		states.push(indent + indentStr + "}\n");
		states.push(indent + indentStr + "$objs = " + objs + ";\n");
		states.push(indent + indentStr + "$objsLen = $objs.length;\n");
		states.push(indent + indentStr + "$readMemo(" + key + ");\n");
		states.push(indent + indentStr + "if (--$undet[" + pos + "])\n");
		states.push(indent + indentStr + indentStr + "delete $memo[" + key + "];\n");
		states.push(addIndent(unsetMatchTable, indentLevel + 1));
		states.push(indent + "}");
		return states.join("");
	} else { // 左再帰非対応
		var objsLen = newId(ids, "objsLen");

		var states = [];
		states.push("function rule$" + rule.symbol + "() {\n");
		states.push(makeVarState([[key, keyValue], [pos, "$pos"], [objsLen, "$objsLen"]], indentLevel + 1));
		states.push(indent + indentStr + "if ($readMemo(" + key + ")) return;\n");
		states.push(addIndent(setMatchTable, indentLevel + 1));
		states.push(rule.body.gen(ids, pos, objsLen, indentLevel + 1));
		states.push(addIndent(unsetMatchTable, indentLevel + 1));
		if (useUndet) {
			states.push(indent + indentStr + "if (!$undet[" + pos + "])\n");
			states.push(indent + indentStr + indentStr + "$writeMemo(" + key + ", $objs.slice(" + objsLen + ", $objsLen));\n");
		} else {
			states.push(indent + indentStr + "$writeMemo(" + key + ", $objs.slice(" + objsLen + ", $objsLen));\n");
		}
		states.push(indent + "}");
		return states.join("");
	}
};

var genjs = function(rules, initializer, exportVariable) {
	// 引数付きルールの引数を無名ルールとして抽出
	var arules = [];
	for (var s in rules)
		rules[s].body.extractAnonymousRule(arules);

	// 無名ルールに名前をつける
	var aruleId = 0;
	for (var i in arules)
		if (!arules[i].symbol)
			arules[i].symbol = "anonymous" + aruleId++;

	/*
	var rootEnv = {};
	for (var s in rules) {
		rootEnv[s] = {
			rule: rules[s],
			env: rootEnv,
		};
	}*/

	for (var s in rules) {
		if (rules[s].parameters) { // 引数付きルール
			var shadowedRules = {};
			shadowedRules.__proto__ = rules;
			for (var j in rules[s].parameters)
				shadowedRules[rules[s].parameters[j]] = "argument";

			rules[s].body.prepare(shadowedRules);
		} else {
			rules[s].body.prepare(rules);
		}
	}

	// 再帰している引数付きルールを見つける
	for (var s in rules) {
		if (rules[s].parameters && rules[s].body.isRecursive(s, []))
			rules[s].recursive = true;
	}

	// 引数付きでないルールの展開
	for (var s in rules) {
		if (!rules[s].parameters)
			rules[s].body.expand({});
	}

	// 再帰している引数付きルールの特殊化
	var newRules = [];
	for (var s in rules)
		if (rules[s].recursive)
			[].push.apply(newRules, rules[s].specializeds);
	for (var i in newRules)
		rules[newRules[i].symbol] = newRules[i];

	var useUndet = false;
	for (var s in rules) {
		if (!rules[s].parameters) { // 引数なしルール
			var b = rules[s].body.canLeftRecurs(rules[s].symbol, []) === 1;
			rules[s].canLeftRecurs = b;
			useUndet = useUndet || b;
		}
	}

	var memoRules = [];
	for (var s in rules) {
		if (!rules[s].parameters) { // 引数なしルール
			if (rules[s].referenceCount)
				memoRules.push(s);
		}
	}

	var states = [];
	if (exportVariable)
		states.push(exportVariable + " = ");
	states.push("(function() {\n");
	states.push(indentStr + "\"use strict\";\n");
	states.push(addIndent(sign, 1));
	states.push(indentStr + 'function $parse($input, options) {\n');
	states.push(addIndent('options = options || {};\n\
var $inputLength = $input.length;\n\
var $pos = 0;\n\
var $objs = [];\n\
var $objsLen = 0;\n\
var $memo = [];\n\
var $matchTable = new Array($inputLength);\n\
var $errorMask = 0;\n\
var $failMatchs = [];\n\
var $failPos = 0;\n\
var $failureObj = {};\n\
', 2));
	if (useUndet)
		states.push(indentStr + indentStr + "var $undet = new Array($inputLength);\n");

	// initializer
	states.push(initializer);
	states.push("\n\n");

	// modifiers?
	var modifiers = {};
	var modifierId = 0;
	for (var r in rules) {
		rules[r].body.traverse(function(expr) {
			if (expr instanceof expressions.mod || expr instanceof expressions.grd) {
				if (!expr.identifier) {
					expr.identifier = "mod$" + modifierId++;
					modifiers[expr.identifier] = expr.code;
					states.push(makeIndent(2) + "function " + expr.identifier + "($) {\n" + expr.code + "\n" + indentStr + indentStr + "};" + "\n\n");
				}
			}
		});
	}

	// rules
	for (var key in rules) {
		if (!rules[key].parameters)
			states.push(makeIndent(2) + genRule(rules[key], memoRules, useUndet, 2) + ";\n\n");
	}

	states.push(addIndent('function $matchingFail(match) {\n\
	if ($errorMask === 0 && $failPos <= $pos) {\n\
		match = $matchTable[$pos] ? $matchTable[$pos] : match;\n\
		if ($failPos === $pos) {\n\
			if ($failMatchs.indexOf(match) === -1)\n\
				$failMatchs.push(match);\n\
		} else {\n\
			$failMatchs = [match];\n\
			$failPos = $pos;\n\
		}\n\
	}\n\
	$pos = -1;\n\
}', 2) + "\n\n");

	states.push(addIndent($joinByOr.toString() + ";", 2) + "\n\n");

	states.push(addIndent('function $readMemo(key) {\n\
	var res = $memo[key];\n\
	if (res !== undefined) {\n\
		if (res !== $failureObj) {\n\
			$pos = res.pos;\n\
			for (var i = 0, il = res.objs.length; i < il; ++i)\n\
				$objs[$objsLen++] = res.objs[i];\n\
		} else {\n\
			$pos = -1;\n\
		}\n\
		return true;\n\
	}\n\
	return false;\n\
}', 2) + "\n\n");

	states.push(addIndent('function $writeMemo(key, objs) {\n\
	$memo[key] = ($pos !== -1) ? {\n\
		pos: $pos,\n\
		objs: objs\n\
	} : $failureObj;\n\
}', 2) + "\n\n");

	states.push(addIndent('	var $ret;\n\
	try {\n\
		rule$start();\n\
	} catch (e) {\n\
		if (e.message === "Infinite loop detected.")\n\
			$ret = {success: false, error: e.message}, $pos = -1;\n\
		else\n\
			throw e;\n\
	}\n\
	if ($pos !== -1) {\n\
		if ($pos === $inputLength) {\n\
			$objs.length = $objsLen;\n\
			$ret = {success: true, content: $objs[0]};\n\
		}\n\
		$matchingFail("end of input");\n\
	}\n\
	if (!$ret) {\n\
		var $line = ($input.slice(0, $failPos).match(/\\n/g) || []).length;\n\
		var $column = $failPos - $input.lastIndexOf("\\n", $failPos - 1) - 1;\n\
		$ret = {success: false, error: "Line " + ($line + 1) + ", column " + $column + ": Expected " + $joinByOr($failMatchs) + " but " + (JSON.stringify($input[$failPos]) || "end of input") + " found."};\n\
	}\n\
	return $ret;\n\
};\n', 1));
	states.push(indentStr + "return $parse;\n");
	states.push("})();\n");
	return states.join("");
};

function $joinByOr(strs) {
	if (strs.length === 0)
		return "";
	if (strs.length === 1)
		return strs[0];
	return strs.slice(0, strs.length - 1).join(", ") + " or " + strs[strs.length - 1];
};

var sign = "// Generated by Snake Parser 0.2\n";

module.exports = genjs;
