var expressions = require("./expressions");
var genjs = require("./genjs");

var initializer = '\
	function arrayToObject($) {\n\
		var res = {};\n\
		for (var i = 0, il = $.length; i < il; ++i)\n\
			res[$[i].ident] = $[i];\n\
		return res;\n\
	};\n\
	function ensureMin($) {\n\
		return $ === undefined ? 0 : $;\n\
	};\n\
	function ensureMax($) {\n\
		return $ === undefined ? Infinity : $;\n\
	};\n\
	function characterClassChar(str) {\n\
		var len = str.length;\n\
		if (len === 1)\n\
			return str.charCodeAt();\n\
		if (len === 4 || len === 6)\n\
			return parseInt(str.substring(2), 16);\n\
		if (str === "\\\\0")\n\
 			return 0;\n\
 		if (str === "\\\\t")\n\
 			return 9;\n\
 		if (str === "\\\\n")\n\
 			return 10;\n\
 		if (str === "\\\\v")\n\
 			return 11;\n\
 		if (str === "\\\\f")\n\
 			return 12;\n\
 		if (str === "\\\\r")\n\
 			return 13;\n\
 		return str.charCodeAt(1);\n\
	};\n\
	function nuturalNumber($) {\n\
		return +$;\n\
	};\n\
	function expr($) {\n\
		return new (options.expressions[$.op])($.a, $.b, $.c);\n\
	};';


var nop = function() {
	return new expressions.nop();
};
var str = function(a) {
	return new expressions.str(a);
};
var cc = function(a, b) {
	return new expressions.cc(a, b);
};
var ac = function() {
	return new expressions.ac();
};
var oc = function(a) {
	return new expressions.oc(a);
};
var seq = function(a) {
	return new expressions.seq(a);
};
var rep = function(a, b, c) {
	return new expressions.rep(a, b, c);
};
var obj = function(a) {
	return new expressions.obj(a);
};
var arr = function(a) {
	return new expressions.arr(a);
};
var pr = function(a, b) {
	return new expressions.pr(a, b);
};
var tkn = function(a) {
	return new expressions.tkn(a);
};
var ltr = function(a) {
	return new expressions.ltr(a);
};
var cv = function(a) {
	return new expressions.cv(a);
};
var pla = function(a) {
	return new expressions.pla(a);
};
var nla = function(a) {
	return new expressions.nla(a);
};
var mod = function(a, b, c) {
	return new expressions.mod(a, b, c);
};
var grd = function(a, b, c) {
	return new expressions.grd(a, b, c);
};
var wst = function(a) {
	return new expressions.wst(a);
};
var rul = function(a, b) {
	return new expressions.rul(a, b);
};


var rules = {
	"start": {
		ident: "start",
		body: obj(seq([rul("__"),pr("initializer",oc([seq([rul("CodeBlock"),rul("__")]),ltr("")])),pr("rules",mod(arr(rep(0,Infinity,rul("Rule"))),"arrayToObject",null))])),
	},
	"Rule": {
		ident: "Rule",
		body: obj(seq([pr("ident",rul("Identifier")),rul("__"),rep(0,1,seq([pr("parameters",rul("RuleParameters")),rul("__")])),rep(0,1,seq([pr("name",rul("StringLiteral")),rul("__")])),str("="),rul("__"),pr("body",rul("ChoiceExpression")),rul("__")])),
	},
	"RuleParameters": {
		ident: "RuleParameters",
		body: arr(seq([str("<"),rul("__"),rep(0,1,seq([rul("Identifier"),rul("__"),rep(0,Infinity,seq([str(","),rul("__"),rul("Identifier"),rul("__")]))])),str(">")])),
	},
	"ChoiceExpression": {
		ident: "ChoiceExpression",
		body: oc([seq([mod(obj(seq([pr("op",ltr("oc")),pr("a",arr(seq([rul("SequenceExpression"),rul("__"),rep(1,Infinity,seq([str("|"),rul("__"),rul("SequenceExpression")]))])))])),"expr",null),rul("__")]),seq([rul("SequenceExpression"),rul("__")])]),
	},
	"SequenceExpression": {
		ident: "SequenceExpression",
		body: oc([seq([mod(obj(seq([pr("op",ltr("seq")),pr("a",arr(seq([rul("LabelExpression"),rep(1,Infinity,seq([rul("__"),rul("LabelExpression")]))])))])),"expr",null),rul("__")]),seq([rul("LabelExpression"),rul("__")])]),
	},
	"LabelExpression": {
		ident: "LabelExpression",
		body: oc([mod(obj(seq([pr("op",ltr("pr")),pr("a",rul("IdentifierOrStringLiteral")),rul("__"),oc([seq([str(":="),rul("__"),pr("b",mod(obj(seq([pr("op",ltr("ltr")),pr("a",rul("IdentifierOrStringLiteral"))])),"expr",null))]),seq([str(":"),rul("__"),pr("b",rul("PipeExpression"))])])])),"expr",null),rul("PipeExpression")]),
	},
	"PipeExpression": {
		ident: "PipeExpression",
		body: oc([mod(obj(oc([seq([pr("a",rul("PipeExpression")),rul("__"),str("->"),rul("__"),pr("op",ltr("mod")),oc([seq([pr("b",rul("Identifier")),pr("c",ltr(null))]),seq([pr("b",ltr(null)),pr("c",rul("CodeBlock"))])])]),seq([pr("a",rul("PipeExpression")),rul("__"),str("-?"),rul("__"),pr("op",ltr("grd")),oc([seq([pr("b",rul("Identifier")),pr("c",ltr(null))]),seq([pr("b",ltr(null)),pr("c",rul("CodeBlock"))])])]),seq([pr("a",rul("PipeExpression")),rul("__"),str("-|"),pr("op",ltr("wst"))])])),"expr",null),rul("OtherExpression")]),
	},
	"OtherExpression": {
		ident: "OtherExpression",
		body: oc([seq([str("("),rul("__"),oc([rul("ChoiceExpression"),mod(obj(pr("op",ltr("nop"))),"expr",null)]),rul("__"),str(")")]),mod(obj(oc([seq([pr("op",ltr("str")),pr("a",rul("StringLiteral"))]),seq([pr("op",ltr("cc")),str("["),pr("b",oc([seq([str("^"),ltr(true)]),ltr(false)])),pr("a",rul("CharacterClass")),str("]")]),seq([pr("op",ltr("ltr")),str("\\"),rul("__"),pr("a",rul("Literal"))]),seq([pr("op",ltr("arr")),str("@"),rul("__"),pr("a",rul("OtherExpression"))]),seq([pr("op",ltr("obj")),str("{"),rul("__"),pr("a",oc([rul("ChoiceExpression"),mod(obj(pr("op",ltr("nop"))),"expr",null)])),rul("__"),str("}")]),seq([pr("op",ltr("tkn")),str("`"),rul("__"),pr("a",rul("OtherExpression"))]),seq([pr("op",ltr("mod")),str("~"),rul("__"),pr("a",mod(obj(seq([pr("op",ltr("arr")),pr("a",rul("OtherExpression"))])),"expr",null)),pr("b",ltr(null)),pr("c",ltr("return $.join(\"\")"))]),seq([pr("op",ltr("pla")),str("&"),rul("__"),pr("a",rul("OtherExpression"))]),seq([pr("op",ltr("nla")),str("!"),rul("__"),pr("a",rul("OtherExpression"))]),seq([pr("op",ltr("rep")),str("?"),rul("__"),pr("c",rul("OtherExpression")),pr("a",ltr(0)),pr("b",ltr(1))]),seq([pr("op",ltr("rep")),str("*"),rul("__"),pr("c",rul("OtherExpression")),pr("a",ltr(0)),pr("b",mod(ltr(0),null," return Infinity "))]),seq([pr("op",ltr("rep")),pr("a",rul("NaturalNumber")),rul("__"),str("*"),rul("__"),pr("c",rul("OtherExpression")),pr("b",ltr("min"))]),seq([pr("op",ltr("rep")),pr("a",mod(rep(0,1,rul("NaturalNumber")),"ensureMin",null)),rul("__"),str(","),rul("__"),pr("b",mod(rep(0,1,rul("NaturalNumber")),"ensureMax",null)),rul("__"),str("*"),rul("__"),pr("c",rul("OtherExpression"))]),seq([pr("op",ltr("rep")),str("+"),rul("__"),pr("c",rul("OtherExpression")),pr("a",ltr(1)),pr("b",mod(ltr(0),null," return Infinity "))]),seq([pr("op",ltr("ac")),str(".")]),seq([pr("op",ltr("cv")),str("$"),pr("a",rul("Identifier"))]),seq([pr("op",ltr("rul")),nla(rul("Rule")),pr("a",rul("Identifier")),rep(0,1,seq([rul("__"),pr("b",rul("RuleArguments"))]))])])),"expr",null)]),
	},
	"RuleArguments": {
		ident: "RuleArguments",
		body: arr(seq([str("<"),rul("__"),rep(0,1,seq([rul("ChoiceExpression"),rul("__"),rep(0,Infinity,seq([str(","),rul("__"),rul("ChoiceExpression"),rul("__")]))])),str(">")])),
	},
	"__": {
		ident: "__",
		name: "white space",
		body: rep(0,Infinity,oc([cc([{"type":"single","char":32},{"type":"single","char":9},{"type":"single","char":13},{"type":"single","char":10}],false),rul("Comment")])),
	},
	"Comment": {
		ident: "Comment",
		body: oc([seq([str("//"),rep(0,Infinity,cc([{"type":"single","char":10}],true)),oc([str("\n"),nla(ac())])]),seq([str("/*"),rep(0,Infinity,oc([cc([{"type":"single","char":42}],true),seq([str("*"),cc([{"type":"single","char":47}],true)])])),str("*/")])]),
	},
	"LineTerminator": {
		ident: "LineTerminator",
		body: cc([{"type":"single","char":10},{"type":"single","char":13},{"type":"single","char":8232},{"type":"single","char":8233}],false),
	},
	"Identifier": {
		ident: "Identifier",
		name: "identifier",
		body: tkn(seq([cc([{"type":"range","start":97,"end":122},{"type":"range","start":65,"end":90},{"type":"single","char":95}],false),rep(0,Infinity,cc([{"type":"range","start":97,"end":122},{"type":"range","start":65,"end":90},{"type":"range","start":48,"end":57},{"type":"single","char":95}],false))])),
	},
	"IdentifierOrStringLiteral": {
		ident: "IdentifierOrStringLiteral",
		body: oc([rul("StringLiteral"),rul("Identifier")]),
	},
	"StringLiteral": {
		ident: "StringLiteral",
		name: "string literal",
		body: mod(tkn(rul("StringLiteralRaw")),"eval",null),
	},
	"StringLiteralRaw": {
		ident: "StringLiteralRaw",
		body: oc([seq([str("'"),rep(0,Infinity,oc([seq([nla(rul("LineTerminator")),cc([{"type":"single","char":39},{"type":"single","char":92}],true)]),seq([str("\\x"),rep(2,2,rul("HexDigit"))]),seq([str("\\u"),rep(4,4,rul("HexDigit"))]),seq([str("\\"),cc([{"type":"single","char":117},{"type":"single","char":120}],true)])])),str("'")]),seq([str("\""),rep(0,Infinity,oc([seq([nla(rul("LineTerminator")),cc([{"type":"single","char":34},{"type":"single","char":92}],true)]),seq([str("\\x"),rep(2,2,rul("HexDigit"))]),seq([str("\\u"),rep(4,4,rul("HexDigit"))]),seq([str("\\"),cc([{"type":"single","char":117},{"type":"single","char":120}],true)])])),str("\"")])]),
	},
	"CharacterClass": {
		ident: "CharacterClass",
		body: arr(rep(0,Infinity,obj(oc([seq([pr("type",ltr("range")),pr("start",rul("CharacterClassChar")),str("-"),pr("end",rul("CharacterClassChar"))]),seq([pr("type",ltr("single")),pr("char",rul("CharacterClassChar"))])])))),
	},
	"CharacterClassChar": {
		ident: "CharacterClassChar",
		body: mod(tkn(oc([cc([{"type":"single","char":93},{"type":"single","char":92}],true),seq([str("\\x"),rep(2,2,rul("HexDigit"))]),seq([str("\\u"),rep(4,4,rul("HexDigit"))]),seq([str("\\"),cc([{"type":"single","char":117},{"type":"single","char":120}],true)])])),"characterClassChar",null),
	},
	"CodeBlock": {
		ident: "CodeBlock",
		name: "code block",
		body: seq([str("{"),tkn(rul("Code")),str("}")]),
	},
	"Code": {
		ident: "Code",
		body: rep(0,Infinity,oc([cc([{"type":"single","char":123},{"type":"single","char":125}],true),seq([str("{"),rul("Code"),str("}")])])),
	},
	"NaturalNumber": {
		ident: "NaturalNumber",
		name: "natural number",
		body: mod(tkn(oc([seq([cc([{"type":"range","start":49,"end":57}],false),rep(0,Infinity,cc([{"type":"range","start":48,"end":57}],false))]),str("0")])),"nuturalNumber",null),
	},
	"Literal": {
		ident: "Literal",
		body: oc([rul("StringLiteral"),rul("NumericLiteral"),rul("BooleanLiteral"),rul("NullLiteral"),rul("ArrayLiteral"),rul("ObjectLiteral")]),
	},
	"ArrayLiteral": {
		ident: "ArrayLiteral",
		name: "array literal",
		body: seq([str("["),rul("__"),arr(rep(0,1,seq([rul("Literal"),rep(0,Infinity,seq([rul("__"),str(","),rul("__"),rul("Literal")])),rul("__")]))),str("]")]),
	},
	"ObjectLiteral": {
		ident: "ObjectLiteral",
		name: "object literal",
		body: seq([str("{"),rul("__"),mod(arr(rep(0,1,seq([rul("ObjectLiteralProperty"),rep(0,Infinity,seq([rul("__"),str(","),rul("__"),rul("ObjectLiteralProperty")])),rul("__")]))),null,"\n                var ret = {};\n                for (var i = 0; i < $.length; ++i)\n                    ret[$[i].key] = $[i].value;\n                return ret;\n            "),str("}")]),
	},
	"ObjectLiteralProperty": {
		ident: "ObjectLiteralProperty",
		body: obj(seq([pr("key",rul("IdentifierOrStringLiteral")),rul("__"),str(":"),rul("__"),pr("value",rul("Literal"))])),
	},
	"NullLiteral": {
		ident: "NullLiteral",
		body: seq([str("null"),ltr(null)]),
	},
	"BooleanLiteral": {
		ident: "BooleanLiteral",
		body: oc([seq([str("true"),ltr(true)]),seq([str("false"),ltr(false)])]),
	},
	"NumericLiteral": {
		ident: "NumericLiteral",
		name: "numeric literal",
		body: mod(tkn(seq([rep(0,1,str("-")),oc([rul("HexIntegerLiteral"),rul("DecimalLiteral")])])),"eval",null),
	},
	"DecimalLiteral": {
		ident: "DecimalLiteral",
		body: oc([seq([rul("DecimalIntegerLiteral"),str("."),rep(0,Infinity,rul("DecimalDigit")),rep(0,1,rul("ExponentPart"))]),seq([str("."),rep(1,Infinity,rul("DecimalDigit")),rep(0,1,rul("ExponentPart"))]),seq([rul("DecimalIntegerLiteral"),rep(0,1,rul("ExponentPart"))])]),
	},
	"DecimalIntegerLiteral": {
		ident: "DecimalIntegerLiteral",
		body: oc([str("0"),seq([rul("NonZeroDigit"),rep(0,Infinity,rul("DecimalDigit"))])]),
	},
	"DecimalDigit": {
		ident: "DecimalDigit",
		body: cc([{"type":"range","start":48,"end":57}],false),
	},
	"NonZeroDigit": {
		ident: "NonZeroDigit",
		body: cc([{"type":"range","start":49,"end":57}],false),
	},
	"ExponentPart": {
		ident: "ExponentPart",
		body: seq([rul("ExponentIndicator"),rul("SignedInteger")]),
	},
	"ExponentIndicator": {
		ident: "ExponentIndicator",
		body: cc([{"type":"single","char":101},{"type":"single","char":69}],false),
	},
	"SignedInteger": {
		ident: "SignedInteger",
		body: seq([rep(0,1,cc([{"type":"single","char":43},{"type":"single","char":45}],false)),rep(1,Infinity,rul("DecimalDigit"))]),
	},
	"HexIntegerLiteral": {
		ident: "HexIntegerLiteral",
		body: seq([oc([str("0x"),str("0X")]),rep(1,Infinity,rul("HexDigit"))]),
	},
	"HexDigit": {
		ident: "HexDigit",
		body: cc([{"type":"range","start":48,"end":57},{"type":"range","start":97,"end":102},{"type":"range","start":65,"end":70}],false),
	},
};

var code = genjs(rules, initializer);

module.exports = eval(code);
