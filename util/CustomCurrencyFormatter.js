sap.ui.define([
	"colpal/ppm/projectmgmt/util/CustomCurrencyType"
], function(CustomCurrencyType) {
	"use strict";

	return {
		formatValue: function(fAmount,sCurrency) {
			var bNegative = false;
			var fUseAmount = fAmount;
			if (fAmount < 0) {
				bNegative = true;
				fUseAmount = - fAmount;
			}
			var sFormattedAmount = CustomCurrencyType.prototype.formatValue.apply(new CustomCurrencyType({
				showMeasure: false,
				minFractionDigits: 0,
				maxFractionDigits: 0
			}), [
				[fUseAmount, sCurrency], "string"
			]);
			if (bNegative) {
				sFormattedAmount = "(" + sFormattedAmount + ")";
			}
			return sFormattedAmount;
		}
	};
});