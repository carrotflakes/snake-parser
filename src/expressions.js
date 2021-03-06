var expressions = {};

// Expression Class
var Expression = function() {
};
expressions["exp"] = Expression;


var extendsExpression = function(cls, name) {
	cls.prototype = new Expression();
	cls.prototype._name = name;
	cls.prototype.constructor = cls;
	expressions[name] = cls;
};


// Classes extends Expression
var Nop = function() {
};
extendsExpression(Nop, "nop");

var Fail = function() {
};
extendsExpression(Fail, "fl");

var MatchString = function(s) {
	this.string = s;
};
extendsExpression(MatchString, "str");

var MatchCharacterClass = function(cc, i) {
	this.characterClass = cc;
	this.invert = !!i;
};
extendsExpression(MatchCharacterClass, "cc");

var MatchAnyCharacter = function() {
};
extendsExpression(MatchAnyCharacter, "ac");

var OrderedChoice = function(es) {
	if (es instanceof Array)
		this.children = es;
	else {
		this.children = [].slice.call(arguments, 0, [].indexOf.call(arguments));
	}
};
extendsExpression(OrderedChoice, "oc");

var Sequence = function(es) {
	if (es instanceof Array)
		this.children = es;
	else {
		this.children = [].slice.call(arguments, 0, [].indexOf.call(arguments));
	}
};
extendsExpression(Sequence, "seq");

var Repeat = function(min, max, e) {
	this.min = min !== undefined ? min : 0;
	this.max = max !== undefined ? (max === "min" ? min : max) : Infinity;
	if (this.min < 0 || this.max < this.min)
		throw new Error("Invalid repeat expression.");
	this.child = e;
	this.possibleInfiniteLoop = this.max === Infinity;
};
extendsExpression(Repeat, "rep");

var Objectize = function(e) {
	this.child = e;
};
extendsExpression(Objectize, "obj");

var Arraying = function(e) {
	this.child = e;
};
extendsExpression(Arraying, "arr");

var Property = function(k, e) {
	this.key = k;
	this.child = e;
};
extendsExpression(Property, "pr");

var Tokenize = function(e) {
	this.child = e;
};
extendsExpression(Tokenize, "tkn");

var ContextVariable = function(variable) {
	this.variable = variable;
};
extendsExpression(ContextVariable, "cv");

var Literal = function(v) {
	this.value = v;
};
extendsExpression(Literal, "ltr");

var PositiveLookaheadAssertion = function(e) {
	this.child = e;
};
extendsExpression(PositiveLookaheadAssertion, "pla");

var NegativeLookaheadAssertion = function(e) {
	this.child = e;
};
extendsExpression(NegativeLookaheadAssertion, "nla");

var Modify = function(e, i, c, ip) {
	this.child = e;
	this.identifier = i;
	this.code = c;
  this.identifierPlaceholder = ip;
};
extendsExpression(Modify, "mod");

var Guard = function(e, i, c, ip) {
	this.child = e;
	this.identifier = i;
	this.code = c;
  this.identifierPlaceholder = ip;
};
extendsExpression(Guard, "grd");

var Waste = function(e) {
	this.child = e;
};
extendsExpression(Waste, "wst");

var RuleReference = function(r, a, rule, body) {
	this.ruleIdent = r;
	this.arguments = a;
	this.rule = rule;
	this.body = body;
};
extendsExpression(RuleReference, "rul");

RuleReference.prototype.getReference = function() {
	var rule = this.rule;
	if (!rule.references)
		rule.references = [];

	findReference:
	for (var i in rule.references) {
		if (rule.references[i].parameters.length !== this.arguments.length)
			continue findReference;
		for (var j = 0; j < this.arguments.length; ++j)
			if (rule.references[i].arguments[j].body.toString() !== this.arguments[j].body.toString())
				continue findReference;
		return rule.references[i];
	}
	var reference = {
		arguments: rule.arguments,
		referenceCount: 0,
		body: null,
	};
	rule.references.push(reference);
	return reference;
};


// prepare 名前付きでないルールの結びつけ
Expression.prototype.prepare = function(rules) {
};

OrderedChoice.prototype.prepare = function(rules) {
	for (var i in this.children)
		this.children[i].prepare(rules);
};

Sequence.prototype.prepare = OrderedChoice.prototype.prepare;

Repeat.prototype.prepare = function(rules) {
	this.child.prepare(rules);
};

Objectize.prototype.prepare = Repeat.prototype.prepare;
Arraying.prototype.prepare = Repeat.prototype.prepare;
Tokenize.prototype.prepare = Repeat.prototype.prepare;
Property.prototype.prepare = Repeat.prototype.prepare;
PositiveLookaheadAssertion.prototype.prepare = Repeat.prototype.prepare;
NegativeLookaheadAssertion.prototype.prepare = Repeat.prototype.prepare;
Modify.prototype.prepare = Repeat.prototype.prepare;
Guard.prototype.prepare = Repeat.prototype.prepare;
Waste.prototype.prepare = Repeat.prototype.prepare;

RuleReference.prototype.prepare = function(rules) {
	var rule = rules[this.ruleIdent];
	if (!rule)
		throw new Error('Identifier ' + this.ruleIdent + ' is not defined.');

	this.rule = rule;

	if (rule === "argument") // 引数の参照の場合はここまで
		return;

	// 参照をカウント
	rule.referenceCount = (rule.referenceCount || 0) + 1;

	if (rule.parameters instanceof Array) { // 引数付きルールの参照の場合
		// アリティチェック
		if (!(this.arguments instanceof Array) ||
				rule.parameters.length !== this.arguments.length) {
			throw new Error('Referenced rule ' + rule.ident +
											' takes ' + rule.parameters.length +
											' arguments (' + this.arguments.length + ' given).');
		}

		// 引数を再帰的に prepare
		for (var i in this.arguments)
			this.arguments[i].prepare(rules);
	} else { // 引数なしルールの参照の場合
		// アリティチェック
		if (this.arguments instanceof Array)
			throw new Error('Referenced rule ' + rule.ident + ' takes no arguments.');
		this.body = rule.body;
	}
};


// expand 引数付きルールの呼び出しを展開する
Expression.prototype.expand = function(env) {
};

OrderedChoice.prototype.expand = function(env) {
	for (var i in this.children)
		this.children[i].expand(env);
};

Sequence.prototype.expand = OrderedChoice.prototype.expand;

Repeat.prototype.expand = function(env) {
	this.child.expand(env);
};

Objectize.prototype.expand = Repeat.prototype.expand;
Arraying.prototype.expand = Repeat.prototype.expand;
Tokenize.prototype.expand = Repeat.prototype.expand;
Property.prototype.expand = Repeat.prototype.expand;
PositiveLookaheadAssertion.prototype.expand = Repeat.prototype.expand;
NegativeLookaheadAssertion.prototype.expand = Repeat.prototype.expand;
Modify.prototype.expand = Repeat.prototype.expand;
Guard.prototype.expand = Repeat.prototype.expand;
Waste.prototype.expand = Repeat.prototype.expand;

RuleReference.prototype.expand = function(env) {
	if (this.arguments instanceof Array) { // 引数付きルールの参照の場合
		this.body = this.reduce(env, 1);
	} else { // 引数付きでないルールの参照の場合
		this.body = this.rule.body; // 入れる必要無さそうだけど canLeftRecurs で使う
	}
};

// reduce 簡約
Expression.prototype.reduce = function(env, depth) {
	return this;
};

OrderedChoice.prototype.reduce = function(env, depth) {
	var changed = false;
	var children = [];
	for (var i in this.children) {
		children[i] = this.children[i].reduce(env, depth);
		changed = changed || this.children[i] !== children[i];
	}
	if (!changed)
		return this;
	return new this.constructor(children);
};

Sequence.prototype.reduce = OrderedChoice.prototype.reduce;

Repeat.prototype.reduce = function(env, depth) {
	var child = this.child.reduce(env, depth);
	if (child === this.child)
		return this;
	return new Repeat(this.min, this.max, child);
};

Objectize.prototype.reduce = function(env, depth) {
	var child = this.child.reduce(env, depth);
	if (child === this.child)
		return this;
	return new this.constructor(child);
};

Arraying.prototype.reduce = Objectize.prototype.reduce;
Tokenize.prototype.reduce = Objectize.prototype.reduce;
PositiveLookaheadAssertion.prototype.reduce = Objectize.prototype.reduce;
NegativeLookaheadAssertion.prototype.reduce = Objectize.prototype.reduce;
Waste.prototype.reduce = Objectize.prototype.reduce;

Property.prototype.reduce = function(env, depth) {
	var child = this.child.reduce(env, depth);
	if (child === this.child)
		return this;
	return new Property(this.key, child);
};

Modify.prototype.reduce = function(env, depth) {
	var child = this.child.reduce(env, depth);
	if (child === this.child)
		return this;
	return new this.constructor(child, this.identifier, this.code, this);
};

Guard.prototype.reduce = Modify.prototype.reduce;

RuleReference.prototype.reduce = function(env, depth) {
	if (this.rule === "argument") { // 引数の参照の場合
		var body = env[this.ruleIdent];
		if (!body)
			throw new Error('Referenced argument ' + this.ruleIdent + ' not found.');
		return body;
	} else if (this.arguments instanceof Array) { // 引数付きルールの参照の場合
		if (depth === 32)
			throw new Error("Parameterized rule reference nested too deep.");

		if (this.rule.recursive) { // 再帰
			var arguments = [];
			for (var i in this.arguments) {
				arguments[i] = this.arguments[i].reduce(env, depth + 1);
			}

			// すでに簡約されていないかチェック
			this.rule.reduceds = this.rule.reduceds || [];
			var reduced = null;
			findReduced:
			for (var i in this.rule.reduceds) {
				reduced = this.rule.reduceds[i];
				for (var j in reduced.arguments) {
					if (reduced.arguments.toString(j) !== arguments.toString()) {
						reduced = null;
						continue findReduced;
					}
				}
				break;
			}

			if (!reduced) { // 簡約されていなかったので簡約する
				reduced = new RuleReference(
					this.ruleIdent + "$" + this.rule.reduceds.length,
					arguments,
					null,
					null
				);
				this.rule.reduceds.push(reduced);

				var env1 = {};
				env1.__proto__ = env;
				for (var i in arguments)
					env1[this.rule.parameters[i]] = arguments[i];
				reduced.body = this.rule.body.reduce(env1, depth + 1);
			}
			this.reduced = reduced;
			return reduced;
		} else { // 展開
			var env1 = {};
			env1.__proto__ = env;
			for (var i in this.arguments) {
				env1[this.rule.parameters[i]] = this.arguments[i].reduce(env, depth + 1);
			}

			return this.rule.body.reduce(env1, depth + 1);
		}
	} else { // 引数付きでないルールの参照の場合
		return this;
	}
};


// toString
Expression.prototype.toString = function() {
	return this._name + "()";
};

OrderedChoice.prototype.toString = function() {
	var ss = [];
	for (var i in this.children)
		ss.push(this.children[i].toString());
	return this._name + "(" + ss.join(",") + ")";
};

Sequence.prototype.toString = OrderedChoice.prototype.toString;

MatchString.prototype.toString = function() {
	return this._name + "(" + JSON.stringify(this.string) + ")";
};

MatchCharacterClass.prototype.toString = function() {
	return this._name + "(" + JSON.stringify(this.characterClass) + "," + +this.invert + ")";
};

Repeat.prototype.toString = function() {
	return this._name + "(" + this.min + "," + this.max + "," + this.child.toString() + ")";
};

Objectize.prototype.toString = function() {
	return this._name + "(" + this.child.toString() + ")";
};

Arraying.prototype.toString = Objectize.prototype.toString;
Tokenize.prototype.toString = Objectize.prototype.toString;
PositiveLookaheadAssertion.prototype.toString = Objectize.prototype.toString;
NegativeLookaheadAssertion.prototype.toString = Objectize.prototype.toString;

Property.prototype.toString = function() {
	return this._name + "(" + JSON.stringify(this.key) + "," + this.child.toString() + ")";
};

Literal.prototype.toString = function() {
	return this._name + "(" + JSON.stringify(this.value) + ")";
};

ContextVariable.prototype.toString = function() {
	return this._name + "(" + JSON.stringify(this.variable) + ")";
};

Modify.prototype.toString = function() {
	if (this.code) {
		return this._name + "(" + this.child.toString() + ",null," + JSON.stringify(this.code) + ")";
	} else {
		return this._name + "(" + this.child.toString() + "," + JSON.stringify(this.identifier) + ",null)";
	}
};
Guard.prototype.toString = Modify.prototype.toString;

Waste.prototype.toString = function() {
	return this._name + "(" + this.child.toString() + ")";
};

RuleReference.prototype.toString = function() {
	if (!this.parameters)
		return this._name + "(" + JSON.stringify(this.ruleIdent) + ")";

	var args = this.arguments.map(function(e) {
		return e.toString();
	}).join(",");
	return this._name + "(" + JSON.stringify(this.ruleIdent) + ",[" + args + "])";
};


// traverse
Expression.prototype.traverse = function(func) {
	func(this);
};

OrderedChoice.prototype.traverse = function(func) {
	func(this);
	for (var i in this.children)
		this.children[i].traverse(func);
};

Sequence.prototype.traverse = OrderedChoice.prototype.traverse;

Repeat.prototype.traverse = function(func) {
	func(this);
	this.child.traverse(func);
};

Objectize.prototype.traverse = Repeat.prototype.traverse;
Arraying.prototype.traverse = Repeat.prototype.traverse;
Tokenize.prototype.traverse = Repeat.prototype.traverse;
Property.prototype.traverse = Repeat.prototype.traverse;
PositiveLookaheadAssertion.prototype.traverse = Repeat.prototype.traverse;
NegativeLookaheadAssertion.prototype.traverse = Repeat.prototype.traverse;
Modify.prototype.traverse = Repeat.prototype.traverse;
Guard.prototype.traverse = Repeat.prototype.traverse;
Waste.prototype.traverse = Repeat.prototype.traverse;

RuleReference.prototype.traverse = function(func) {
	func(this);
};


// isRecursive 引数付きルールに対して
Expression.prototype.isRecursive = function(ruleIdent, passedRules) {
	return false;
};

OrderedChoice.prototype.isRecursive = function(ruleIdent, passedRules) {
	for (var i in this.children)
		if (this.children[i].isRecursive(ruleIdent, passedRules))
			return true;
	return false;
};

Sequence.prototype.isRecursive = OrderedChoice.prototype.isRecursive;

Repeat.prototype.isRecursive = function(ruleIdent, passedRules) {
	return this.child.isRecursive(ruleIdent, passedRules);
};

Objectize.prototype.isRecursive = function(ruleIdent, passedRules) {
	return this.child.isRecursive(ruleIdent, passedRules);
};

Arraying.prototype.isRecursive = Objectize.prototype.isRecursive;
Tokenize.prototype.isRecursive = Objectize.prototype.isRecursive;
PositiveLookaheadAssertion.prototype.isRecursive = Objectize.prototype.isRecursive;
NegativeLookaheadAssertion.prototype.isRecursive = Objectize.prototype.isRecursive;
Waste.prototype.isRecursive = Objectize.prototype.isRecursive;

Property.prototype.isRecursive = function(ruleIdent, passedRules) {
	return this.child.isRecursive(ruleIdent, passedRules);
};

Modify.prototype.isRecursive = function(ruleIdent, passedRules) {
	return this.child.isRecursive(ruleIdent, passedRules);
};

Guard.prototype.isRecursive = Modify.prototype.isRecursive;

RuleReference.prototype.isRecursive = function(ruleIdent, passedRules) {
	if (this.arguments instanceof Array) { // 引数付きルールの参照の場合
		if (this.ruleIdent === ruleIdent)
			return true;

		if (passedRules.indexOf(this.ruleIdent) !== -1)
			return false;

		for (var i in this.arguments)
			if (this.arguments[i].isRecursive(ruleIdent, passedRules))
				return true;

		return this.rule.body.isRecursive(ruleIdent, passedRules.concat([this.ruleIdent]));
	}
};


//////////////////////////////////////////////////////////
// -1 必ず進む 0 進まない可能性がある　1 左再帰する可能性がある
Expression.prototype.canLeftRecurs = function(rule, passedRules) {
	return 0;
};

Nop.prototype.canLeftRecurs = function(rule, passedRules) {
	return -1;
};

OrderedChoice.prototype.canLeftRecurs = function(rule, passedRules) {
	var res = -1;
	for (var i in this.children)
		res = Math.max(res, this.children[i].canLeftRecurs(rule, passedRules));
	return res;
};

Sequence.prototype.canLeftRecurs = function(rule, passedRules) {
	for (var i in this.children) {
		var r = this.children[i].canLeftRecurs(rule, passedRules);
		if (r === -1)
			return -1;
		else if (r === 1)
			return 1;
	}
	return 0;
};

MatchString.prototype.canLeftRecurs = function(rule, passedRules) {
	return this.string.length !== 0 ? -1 : 0;
};

MatchCharacterClass.prototype.canLeftRecurs = function(rule, passedRules) {
	return -1;
};
MatchAnyCharacter.prototype.canLeftRecurs = MatchCharacterClass.prototype.canLeftRecurs;

Repeat.prototype.canLeftRecurs = function(rule, passedRules) {
	if (this.min === 0) {
		return Math.max(0, this.child.canLeftRecurs(rule, passedRules));
	} else {
		return this.child.canLeftRecurs(rule, passedRules);
	}
};

Objectize.prototype.canLeftRecurs = function(rule, passedRules) {
	return this.child.canLeftRecurs(rule, passedRules);
};

Arraying.prototype.canLeftRecurs = Objectize.prototype.canLeftRecurs;
Tokenize.prototype.canLeftRecurs = Objectize.prototype.canLeftRecurs;
Property.prototype.canLeftRecurs = Objectize.prototype.canLeftRecurs;
PositiveLookaheadAssertion.prototype.canLeftRecurs = Objectize.prototype.canLeftRecurs;
NegativeLookaheadAssertion.prototype.canLeftRecurs = Objectize.prototype.canLeftRecurs;
Modify.prototype.canLeftRecurs = Objectize.prototype.canLeftRecurs;
Guard.prototype.canLeftRecurs = Objectize.prototype.canLeftRecurs;
Waste.prototype.canLeftRecurs = Objectize.prototype.canLeftRecurs;

RuleReference.prototype.canLeftRecurs = function(rule, passedRules) {
	if (rule === this.ruleIdent)
		return 1;

	if (passedRules.indexOf(this.ruleIdent) !== -1)
		return 0; // 別ルールの左再帰を検出した

	var ret = this.leftRecurs;
	if (ret !== undefined)
		return ret;

	ret = this.body.canLeftRecurs(rule, passedRules.concat([this.ruleIdent]));
	if (ret === -1)
		rule.leftRecurs = ret;

	return ret;
};

module.exports = expressions;
