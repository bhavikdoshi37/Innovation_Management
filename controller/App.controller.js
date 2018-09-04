sap.ui.define([
	"colpal/ppm/projectmgmt/controller/BaseController",
	"sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("colpal.ppm.projectmgmt.controller.App", {

		onInit: function() {
			var oViewModel,
				fnSetAppNotBusy,
				oListSelector = this.getOwnerComponent().oListSelector,
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

			oViewModel = new JSONModel({
				busy: true,
				delay: 0,
				itemToSelect: null,
				addEnabled: false

			});
			this.setModel(oViewModel, "appView");

			fnSetAppNotBusy = function() {
				oViewModel.setProperty("/busy", false);
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			};

			this.getOwnerComponent().getModel().metadataLoaded()
				.then(fnSetAppNotBusy);

			// Makes sure that master view is hidden in split app
			// after a new list entry has been selected.
			oListSelector.attachListSelectionChange(function() {
				this.byId("idAppControl").hideMaster();
			}, this);

			// apply content density mode to root view
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
			
			// Initialize main models
			this._createSharedModel();
			
			//Setup User Info    TODO: complete this
			this._setupUserInfo();

			//Initialize App data TODO: complete this
			// this._initializeAppData();
			
			var oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.subscribe("colgate.ppm.projectmgmt.personalization", "VariantsSet", function(sChannelId, sEventId, oData) {
				// Update table personalization
				this._performRoleOverlay(oData);
			}, this);

			oEventBus.subscribe("colgate.ppm.projectmgmt.userDataLoaded", "UserDataLoaded", function(sChannelId, sEventId, oData) {
				// Update table personalization
				this._performRoleOverlay(oData);
			}, this);

			// var oEventBus = sap.ui.getCore().getEventBus();
			// oEventBus.subscribe("colgate.ppm.projectmgmt.app.spinner", "StopSpinner", function(sChannelId, sEventId, oData) {
			// 	this.getOwnerComponent().getModel("masterShared").setProperty("/oDetailBusy/busy", false); // Stop Spinner
			// 	this.getOwnerComponent().getModel("masterShared").setProperty("/oMasterBusy/busy", false); // Stop Spinner
			// 	this.getOwnerComponent().getModel("masterShared").refresh(false);
			// }, this);

			oEventBus.subscribe("colgate.ppm.projectmgmt.app.spinner", "AppStopSpinner", function(sChannelId, sEventId, oData) {
					this.getOwnerComponent().getModel("masterShared").setProperty("/busy", false); // Stop Spinner
					this.getOwnerComponent().getModel("masterShared").refresh(false);

				// this.getOwnerComponent().getModel("masterShared").setProperty("/oDetailBusy/busy", false); // Stop Spinner
				// this.getOwnerComponent().getModel("masterShared").setProperty("/oMasterBusy/busy", false); // Stop Spinner
				// this.getOwnerComponent().getModel("masterShared").refresh(false);
			}, this);
			
			oEventBus.subscribe("colgate.ppm.projectmgmt.app.spinner", "AppStartSpinner", function(sChannelId, sEventId, oData) {
					this.getOwnerComponent().getModel("masterShared").setProperty("/busy", true); // Stop Spinner
					this.getOwnerComponent().getModel("masterShared").refresh(false);

				// this.getOwnerComponent().getModel("masterShared").setProperty("/oDetailBusy/busy", false); // Stop Spinner
				// this.getOwnerComponent().getModel("masterShared").setProperty("/oMasterBusy/busy", false); // Stop Spinner
				// this.getOwnerComponent().getModel("masterShared").refresh(false);
			}, this);

		},

		_setupUserInfo: function(){
			var sServiceUrl = this.getOwnerComponent().getModel("masterShared").getProperty("/oServiceUrls/userService");
			var oModel = new sap.ui.model.odata.v2.ODataModel(sServiceUrl, false);
			oModel.setSizeLimit(5000);
			this.getOwnerComponent().setModel(oModel, "User");
			
			var oResultModel = new sap.ui.model.json.JSONModel({});
			oResultModel.setSizeLimit(5000);
			this.getOwnerComponent().setModel(oResultModel, "P13n_Configuration");
			
			oResultModel = new sap.ui.model.json.JSONModel({});
			oResultModel.setSizeLimit(5000);
			this.getOwnerComponent().setModel(oResultModel, "P13n_Variants");
			
			var sUser = sap.ushell.Container.getService("UserInfo").getId().toUpperCase();
			var sPath = "/Personalizations";
			var that = this;
			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStartSpinner", {});
			oModel.read(sPath, {
				async: true,
				success: function(oDataIn, oResponse) {
					var aData = oDataIn.results;
					var oData = {};
					for (var i = 0; i < aData.length; i++) {
						oData[aData[i].PersKey] = JSON.parse(aData[i].PersData);
					}
					that.getOwnerComponent().getModel("P13n_Configuration").setData(oData, true);
					// Check to make sure currency exists
					var sCurrency = that.getOwnerComponent().getModel("P13n_Configuration").getProperty("/CurrencySettings");
					// if (!sCurrency || sCurrency === "") {
						var oCurrency = {};
						oCurrency.Currency = "USD"; // Default Currency is USD
						that.getOwnerComponent().getModel("P13n_Configuration").setProperty("/CurrencySettings", oCurrency);
					// }
					// Set Application Data
					if (oData.GlobalSettings) {
						that.getModel("appView").getData().settings = oData.GlobalSettings;
					}
					that.getModel("appView").refresh(false);
					sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.personalization", "Set", oData);
				},
				error: function(oError) {
					oError.ErrorOrigin = "Personalization";
					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.master", "Errors", oError);
				}
			});

// TODO: psutram
			sPath = "/Variants";
			var filters = [];
			filters.push(new sap.ui.model.Filter("PersKey", sap.ui.model.FilterOperator.EQ, "InnovationVariants"));
			oModel.read(sPath, {
				async: true,
				filters: filters,
				success: function(oDataIn, oResponse) {
					var aData = oDataIn.results;
					var oData = {};
					oData.Variants = aData;
					oData.DefaultVariant = "*standard*";
					for (var i = 0; i < aData.length; i++) {
						if (aData[i].DefaultVar === "X") {
							oData.DefaultVariant = "Variant" + i;
							console.log("Default Variant:" + aData[i].Description + ":" + oData.DefaultVariant);
						}
					}
					that.getOwnerComponent().getModel("P13n_Variants").setData(oData, true);
					that.getOwnerComponent().getModel("masterShared").getData().oInternalEvents.variantsLoaded = true;
					sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.personalization", "VariantsSet", oData);
				},
				error: function(oError) {
					oError.ErrorOrigin = "Personalization";
					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.master", "Errors", oError);
				}
			});

			sPath = "/Users('" + sUser + "')";
			oModel.read(sPath, {
				async: false,
				success: function(oData, oResponse) {
					oData.oDataOrigin = "User";
					that._handleODataSuccess(oData);
				},
				error: function(oError) {
					oError.ErrorOrigin = "User";
					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.master", "Errors", oError);
				}
			});
			this.getOwnerComponent().getModel("masterShared").setProperty("/oDetailBusy/busy", true); // Start Spinner
		
		},
		_createSharedModel: function() {
			// Create Shared Model
			var oSharedModel = new JSONModel({
				aMasterButtons: [{
					icon: "",
					text: "",
					visible: false,
					startSpinner: false
				}, {
					icon: "",
					text: "",
					visible: false,
					startSpinner: false
				}, {
					icon: "",
					text: "",
					visible: false,
					startSpinner: false
				}],
				oInternalEvents: {
					configurationLoaded: false,
					variantsLoaded: false,
					userDataLoaded: false,
					activityPersonalizationInitialized: false,
					roleOverlayInitialized: false,
					displayOnlyMode: false,
					noAuthorizationMode: false,
					lastAction: "",
					lastVariant: "*standard*",
					currentMode: "Display"
				},
				oServiceUrls: {
					//				    mainService:jQuery.sap.getModulePath("colgate.asm.planning.base") + this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").dataSources["mainService"].uri,
					//				    userService:jQuery.sap.getModulePath("colgate.asm.planning.base") + this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").dataSources["userService"].uri
					mainService: this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").dataSources["mainService"].uri,
					userService: this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").dataSources["userService"].uri
				},
				previousAction: "",
				oDetailBusy: {
					busy: true,
					delay: 0
				},
				oMasterBusy: {
					busy: true,
					delay: 0
				},
				oUser: {},
				aAddOptions: [],
				oMasterSelect: {},
				oTableSelect: {},
				oParentSelect: {},
				oFilters: {
					oExclude: {}
				}
			});
			oSharedModel.setSizeLimit(5000);
			this.getOwnerComponent().setModel(oSharedModel, "masterShared");
			
			
		},
		_handleODataSuccess: function(oDataIn) {
			var sOrigin = oDataIn.oDataOrigin;
			if (sOrigin === "User") {
				this._setupHeader();
			}
			this.getOwnerComponent().getModel("masterShared").setProperty("/oInternalEvents/userDataLoaded", true);
			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.userDataLoaded", "UserDataLoaded", {});
			this.getOwnerComponent().getModel("masterShared").setProperty("/oDetailBusy/busy", false); // Stop Spinner
		},
		_setupHeader: function() {
			var oShell = sap.ui.getCore().getElementById("shell").getHeader();
			var sPath = jQuery.sap.getModulePath("colpal.ppm.projectmgmt");
			oShell.setLogo(sPath + "/img/ZIM_Logo.png");
		},
		_performRoleOverlay: function(oDataIn) {
			if (this.getOwnerComponent().getModel("masterShared") && this.getOwnerComponent().getModel("masterShared").getData()) {
				//this.getOwnerComponent().getModel("masterShared").getProperty("/oInternalEvents/configurationLoaded") === true &&
				if (this.getOwnerComponent().getModel("masterShared").getProperty("/oInternalEvents/variantsLoaded") === true &&
					// this.getOwnerComponent().getModel("masterShared").getProperty("/oInternalEvents/userDataLoaded") === true &&
					this.getOwnerComponent().getModel("masterShared").getProperty("/oInternalEvents/roleOverlayInitialized") !== true) {
					// Do any necessary role overlays
					this.getOwnerComponent().getModel("masterShared").setProperty("/oInternalEvents/roleOverlayInitialized", true);
					// var oUserData = this.getOwnerComponent().getModel("UserData");
					// var sRole = oUserData.getProperty("/Role");
					// var oConfiguration = this.getOwnerComponent().getModel("ASMConfig");
					// var aReplacements = JSON.parse(oConfiguration.getProperty("/Properties/RoleReplacement")).Replacements;
					// for (var i = 0; i < aReplacements.length; i++) {
					// 	var oReplacementRecord = aReplacements[i];
					// 	for (var j = 0; j < oReplacementRecord.FromRoles.length; j++)
					// 		if (sRole === oReplacementRecord.FromRoles[j]) {
					// 			oUserData.setProperty("/Role", oReplacementRecord.ToRole);
					// 			sRole = oReplacementRecord.ToRole;
					// 			j = oReplacementRecord.FromRoles.length;
					// 			i = aReplacements.length;
					// 		}
					// }
					// Check if the app is supposed to be display only
					// var aDisplayOnly = JSON.parse(oConfiguration.getProperty("/Properties/RoleConfiguration")).DisplayOnly;
					// var bRoleFound = false;
					// for (var k = 0; k < aDisplayOnly.length; k++) {
					// 	if (sRole === aDisplayOnly[k]) {
					// 		bRoleFound = true;
					// 		this.getOwnerComponent().getModel("masterShared").setProperty("/oInternalEvents/displayOnlyMode", true);
					// 	}
					// }
					// var aAdvanced = JSON.parse(oConfiguration.getProperty("/Properties/RoleConfiguration")).Advanced;
					// for (var l = 0; l < aAdvanced.length; l++) {
					// 	if (sRole === aAdvanced[l]) {
					// 		bRoleFound = true;
					// 	}
					// }
					// if (!bRoleFound) {
						// this.getOwnerComponent().getModel("masterShared").setProperty("/oInternalEvents/noAuthorizationMode", false);
					// } else {
						sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.detail", "InitializationComplete", {});
									sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStopSpinner", {});
					// }
				}
			}
		}
		
	});

});