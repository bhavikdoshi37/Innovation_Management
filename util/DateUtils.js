sap.ui.define([
	"sap/ui/core/format/DateFormat",
	"sap/m/MessageToast"
], function(DateFormat, MessageToast) {
	"use strict";

	return {
		_getSystemOffset: function() {
			var fSystemOffset = 3600000;
			return fSystemOffset;
		},
		getSystemAdjISODateNoZ_fromISODate: function(sISODate) {
			var oDate = new Date(sISODate);
			return this.getSystemAdjISODate_fromDate(oDate);
		},
		getSystemAdjISODate_fromCurrentDate: function() {
			var oDate = new Date();
			return this.getSystemAdjISODate_fromDate(oDate);
		},
		getSystemAdjISODate_fromDate: function(oDate) {
			if (oDate)
			{
				var iTime = oDate.getTime() + this._getSystemOffset();
				var oRDate = new Date(iTime);
				var sDate = oRDate.toISOString();
				sDate = sDate.replace("Z", "");
				return sDate;
			}
		},
		formatDate: function(sValue) {
			if (sValue) {
				var sYear = sValue.substring(0, 4);
				var sMonth = sValue.substring(5, 7);
				var sDay = sValue.substring(8, 10);
				var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
					style: "short"
				});
				sValue = oDateFormat.format(new Date(sYear, sMonth - 1, sDay));
			}
			return sValue;
		},
		formatTimestamp: function(sValue) {
			if (sValue && sValue !== "") {
				var sYear = sValue.substring(0, 4);
				var sMonth = sValue.substring(5, 7);
				var sDay = sValue.substring(8, 10);
				var sHour = sValue.substring(11, 13);
				var sMin = sValue.substring(14, 16);
				var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
					style: "short"
				});
				sValue = oDateFormat.format(new Date(sYear, sMonth - 1, sDay, sHour, sMin));
			} else {
				sValue = "";
			}
			return sValue;
		}
	};
});