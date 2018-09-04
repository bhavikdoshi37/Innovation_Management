sap.ui.define([
	"sap/ui/core/format/DateFormat"
], function(DateFormat) {
	"use strict";

	return {
		/**
		 * Rounds the currency value to 2 digits
		 *
		 * @public
		 * @param {string} sValue value to be formatted
		 * @returns {string} formatted currency value with 2 digits
		 */
		folderText: function(sValue) {
			// if (! sValue) {
			// 	return "";
			// }	
			return "&nbsp;&nbsp;&nbsp;" + sValue;
		} ,
		currencyValue: function(sValue) {
			if (!sValue) {
				return "";
			}

			return parseFloat(sValue).toFixed(2);
		},
		formatGrid: function(sValue) {
			// console.log("formatter:formatGrid:" + sValue);
			if (!sValue) {
				return "";
			}
			if (sValue === "1")
			{
				return "Yes";
			}
			else if (sValue === "0")
			{
				return "No";
			}
			else
			{
				return "";
			}
		},
		formatDate: function(sValue) {
			// console.log("Formatter formatDate:" + sValue);
			// if (sValue) {
				
			// 	var sYear = sValue.substring(0, 4);
			// 	// Begin of Changes - Khrystyne Williams - Oct
			// 	var sMonth = {};
			// 	var sDay = {};
			// 	if (sValue.substring(4, 5) === "-") {
			// 		sMonth = sValue.substring(5, 7);
			// 		sDay = sValue.substring(8, 10);
			// 	} else {
			// 		sMonth = sValue.substring(4, 6);
			// 		sDay = sValue.substring(6, 8);
			// 	}
			// 	// End of Changes - Khrystyne Williams - Oct
			// 	// New Values Updated
			// 	//var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({style: "medium"});
			// 	var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
			// 		pattern: "MMM yyyy"
			// 	});
			// 	//sValue = sMonth + "/" + sDay + "/" + sYear;
			// 	sValue = oDateFormat.format(new Date(sYear, sMonth - 1, sDay));
			// 	//var aValues = sValue.split(" ");
			// 	//sValue = aValues[0] + " " + aValues[2];
			// }
			if (sValue){
				// var d =  Date.parse(sValue);
				var d = new Date (sValue);
				var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern: "MMM dd, yyyy"});
				sValue = oDateFormat.format(d);	
			}
			return sValue + "";
		},
		formatDateShort: function(oDate){
				var oDate = (oDate instanceof Date) ? oDate : new Date(oDate);
				var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MMM dd, yyyy" });
				var sValue = dateFormat.format(oDate); 
				 return dateFormat.format(oDate);
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
				// sValue = sMonth + "/" + sDay + "/" + sYear + " " + sHour + ":" + sMin;
				sValue = oDateFormat.format(new Date(sYear, sMonth - 1, sDay, sHour, sMin));
			} else {
				sValue = "";
			}
			return sValue;
		},
		formatDateAndTime: function(sDate, sTime) {
			// console.log("Formatter: sDate:" + sDate );
			return sDate + " " + sTime;	
		},
		columnHeader: function(sType, sMonth) {
			var sHeader = sType + " " + sMonth;
			return sHeader;
		},
		addRowStyle: function(sValue) {
			sap.ui.getCore().getEventBus().publish("colgate.asm.planning.project", "ApplyStyles", {});
			return sValue;
		}
	};

});