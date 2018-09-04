sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(Controller) {
	"use strict";

	return Controller.extend("colpal.ppm.projectmgmt.controller.InitiativeList", {

		onInit: function() {
				var ppmModel = sap.ui.getCore().getModel("PPMData");
				this._oTable = this.byId("InListTable");
				this.getView().setModel (ppmModel, "PPMData");

			},

		//	onBeforeRendering: function() {
		//
		//	},

		//	onAfterRendering: function() {
		//
		//	},

		//	onExit: function() {
		//
		//	}

	});

});