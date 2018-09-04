sap.ui.define([
	'sap/m/Dialog',
	'sap/m/MessageToast'
], function(Dialog, MessageToast) {
	"use strict";
	return {
		onChange: function(oEvent) {
			console.log("MgrUtils:onChange");
			var oSearchField = oEvent.getSource();
			var value = oEvent.getParameter("value");
			var filters = [];
			if (value) {
				filters = [new sap.ui.model.Filter([
					new sap.ui.model.Filter("Name", function(sText) {
						return (sText || "").toUpperCase().indexOf(value.toUpperCase()) > -1;
					})
				], false)];
			}
			oSearchField.getBinding("items").filter(filters);
		},
		onClose: function(oEvent) {
			console.log("MgrUtils:onClose");
			if (this._oDialog) {
				this._oDialog.destroy();
			}
		},
		onConfirm: function(oEvent) {
			console.log("MgrUtils:onConfirm");
			var sPath = oEvent.getParameter("selectedItems")[0].getBindingInfo("title").binding.getContext().getPath();
			this._oComboBox.setSelectedKey(this._oDialog.getModel().getProperty(sPath).Id);
			oEvent.getSource().getBinding("items").filter([]);
			if (this._oDialog) {
				this._oDialog.destroy();
			}
		},

		onMgrShow: function(oEvent, oModel, oTextModel, oComboBox) {
			console.log("MgrUtils:onMgrShow");
				if (this._oDialog) { 
					this._oDialog.destroy();
				}
				this._oDialog = sap.ui.xmlfragment("colpal.ppm.projectmgmt.fragment.MgrSelection", this);
				this._oDialog.setModel(oModel);
				this._oDialog.setModel(oTextModel, "i18n");
				this._oComboBox = oComboBox;
				// clear the old search filter
				this._oDialog.getBinding("items").filter([]);
				this._oDialog.open();
			}
	};
});