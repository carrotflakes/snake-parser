var expressions = require("./expressions");

// produceを引数に

expressions.nop.prototype.optimize = function() {
	return {
		expression: this,
		advance: 0,
		produce: 0,
		success: this.succeed ? 2 : 0,
		constant: this.succeed ? [] : undefined,
	};
};

expressions.str.prototype.optimize = function() {
	if (this.string.length === 0) {
		return {
			expression: new expressions.nop(),
			advance: 0,
			produce: 0,
			success: 2,
		};
	}
	return {
		expression: this,
		advance: 2,
		produce: 0,
		success: 1,
	};
};

expressions.cc.prototype.optimize = function() {
	if (this.characterClass.length === 0) {
		if (!this.invert) {
			return { // 必ず失敗
				expression: new expressions.nop(false),
				advance: 0,
				produce: 0,
				success: 0,
			};
		} else {
			return { // . と同じ
				expression: new expressions.ac(),
				advance: 2,
				produce: 0,
				success: 1,
			};
		}
	}
	return {
		expression: this,
		advance: 2,
		produce: 0,
		success: 1,
	};
};

expressions.ac.prototype.optimize = function() {
	return {
		expression: this,
		advance: 2,
		produce: 0,
		success: 1,
	};
};

expressions.oc.prototype.optimize = function() {
	var advance = null;
	var produce = null;
	var success = 0;
	var children = [];
	for (var i = 0; i < this.children.length; ++i) {
		var res = this.children[i].optimize();
		if (res.success === 0)
			continue;
		if (res.expression instanceof expressions.oc) { // 子供がocなら展開する
			[].push.apply(children, res.expression.children);
		} else {
			children.push(res.expression);
		}
		if (advance !== res.advance)
			advance = advance === null ? res.advance : 1;
		if (produce !== res.produce)
			produce = produce === null ? res.produce : 1;
		success = Math.max(success, res.success);
		if (res.success === 2)
			break;
	}
	if (children.length === 0) {
		return {
			expression: new expressions.nop(false),
			advance: 0,
			produce: 0,
			success: 0,
		};
	} else if (children.length === 1) {
		return {
			expression: children[0],
			advance: advance,
			produce: produce,
			success: success,
		};
	} else {
		this.children = children;
		return {
			expression: this,
			advance: advance,
			produce: produce,
			success: success,
		};
	}
};

expressions.seq.prototype.optimize = function() {
	var advance = 0;
	var produce = 0;
	var success = 2;
	var children = [];
	var constant = [];
	for (var i = 0; i < this.children.length; ++i) {
		var res = this.children[i].optimize();
		if (res.advance === 0 && res.produce === 0 && res.success === 2)
			continue;
		if (res.expression instanceof expressions.seq) { // 子供がseqなら展開する
			[].push.apply(children, res.expression.children);
		} else {
			children.push(res.expression);
		}
		advance = Math.max(advance, res.advance);
		produce = Math.max(produce, res.produce);
		success = Math.min(success, res.success);
		if (constant && res.constant)
			[].push.apply(constant, res.constant);
		else
			constant = undefined;
	}
	if (success === 0) { // 必ず失敗
		return {
			expression: new expressions.nop(false),
			advance: 0,
			produce: 0,
			success: 0,
		};
	}
	this.children = children;
	return {
		expression: this,
		advance: advance,
		produce: produce,
		success: success,
		constant: constant,
	};
};

expressions.rep.prototype.optimize = function() {
	if (this.max === 0) {
		return {
			expression: new expressions.nop(),
			advance: 0,
			produce: 0,
			success: 2,
		};
	}
	var res = this.child.optimize();
	this.child = res.expression;
	if (this.max === Infinity && res.success === 2)
		throw new Error("Repeat expression will infinite loop.");
	if (this.min === 0)
		res.success = Math.max(1, res.success);
	res.expression = this;
	if (res.constant) { // 定数化
		var constant = [];
		for (var i = 0; i < this.max; ++i)
			constant[i] = res.constant;
		res.constant = constant;
	}
	return res;
};

expressions.obj.prototype.optimize = function() {
	var res = this.child.optimize();
	if (res.constant) { // 定数化
		var value = {};
		for (var i in res.constant)
			value[res.constant[i].key] = res.constant[i].value;
		res.expression = new expressions.ltr(value);
		res.constant = [value];
	} else {
		this.child = res.expression;
		res.produce = 2;
		res.expression = this;
		res.constant = undefined;
	}
	return res;
};

expressions.arr.prototype.optimize = function() {
	var res = this.child.optimize();
	if (res.constant) { // 定数化
		var value = {};
		res.expression = new expressions.ltr(res.constant);
		res.constant = [res.constant];
	} else {
		this.child = res.expression;
		res.produce = 2;
		res.expression = this;
	}
	return res;
};

expressions.pr.prototype.optimize = function() {
	var res = this.child.optimize();
	if (res.constant) { // 定数化
		res.expression = new expressions.ltr({key: this.key, value: res.constant[0]});
		res.advance = 0;
		res.produce = 2;
		res.success = 2;
		res.constant = [res.expression.value];
	} else {
		this.child = res.expression;
		res.produce = 2;
		res.expression = this;
		res.constant = undefined;
	}
	return res;
};

expressions.tkn.prototype.optimize = function() {
	var res = this.child.optimize();
	this.child = res.expression;
	res.produce = 2;
	res.expression = this;
	res.constant = undefined;
	return res;
};

expressions.ltr.prototype.optimize = function() {
	return {
		expression: this,
		advance: 0,
		produce: 2,
		success: 2,
		constant: [this.value],
	};
};

expressions.pla.prototype.optimize = function() {
	var res = this.child.optimize();
	if (res.success === 0) {
		res.expression = new expressions.nop(false);
	} else if (res.success === 2) {
		res.expression = new expressions.nop(true);
	} else {
		this.child = res.expression;
		res.expression = this;
	}
	res.advance = 0;
	res.produce = 0;
	res.constant = undefined;
	return res;
};

expressions.nla.prototype.optimize = function() {
	var res = this.child.optimize();
	if (res.success === 0) {
		res.expression = new expressions.nop(false);
	} else if (res.success === 2) {
		res.expression = new expressions.nop(true);
	} else {
		this.child = res.expression;
		res.expression = this;
	}
	res.advance = 0;
	res.produce = 0;
	res.success = 2 - res.success;
	res.constant = undefined;
	return res;
};

expressions.mod.prototype.optimize = function() {
	var res = this.child.optimize();
	this.child = res.expression;
	res.produce = 2;
	res.expression = this;
	res.constant = undefined;
	return res;
};

expressions.grd.prototype.optimize = function() {
	var res = this.child.optimize();
	this.child = res.expression;
	res.produce = 2;
	res.success = 1;
	res.expression = this;
	res.constant = undefined;
	return res;
};

expressions.wst.prototype.optimize = function() {
	var res = this.child.optimize();
	this.child = res.expression;
	res.produce = 0;
	res.expression = this;
	res.constant = undefined;
	return res;
};

expressions.rul.prototype.optimize = function() {
	return {
		expression: this,
		advance: 1,
		produce: 1,
		success: 1,
	};
};

var ruleOptimize = function(rule) {
	rule.body = rule.body.optimize().expression;
};

module.exports = ruleOptimize;