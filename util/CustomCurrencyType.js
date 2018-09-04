sap.ui.define([], function() {
	"use strict";

	return sap.ui.model.type.Currency.extend("colgate.asm.budgeting.base.util.CustomCurrencyType", {
		formatValue: function(aInput,sType) {
			//GDH aInput[0] = parseFloat(aInput[0]) / 1000;
			aInput[0] = parseFloat(aInput[0]);
			if (sap.ui.model.type.Currency.prototype.formatValue) { // check whether superclass has  method
				var sReturn = sap.ui.model.type.Currency.prototype.formatValue.apply(this, arguments); // call super
			}
			//GDH if (sReturn === "0.00" || sReturn === "0,00") {
			if (sReturn === "0") {
				sReturn = "";
			}
			return sReturn;
		},
		parseValue: function(sValue,sType,oOther) {
			if (sap.ui.model.type.Currency.prototype.parseValue) { // check whether superclass has  method
				var aReturn = sap.ui.model.type.Currency.prototype.parseValue.apply(this, arguments); // call super
			}
			//GDH aReturn[0] = parseFloat(aReturn[0]) * 1000;
			aReturn[0] = parseFloat(aReturn[0]);
			return aReturn;
		},
		validateValue: function(nValue) {
		    if (sap.ui.model.type.Currency.prototype.validateValue) { // check whether superclass has method
				return sap.ui.model.type.Currency.prototype.validateValue.apply(this, arguments); // call super
			}
		}
	});
});