sap.ui.define([
	"colpal/ppm/projectmgmt/util/DateUtils",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/m/Dialog"
], function(DateUtils, MessageToast, MessageBox, Dialog) {
	"use strict";
	return {
		testFunction: function ()
		{
			console.log("Test message");
		},
		getUserModel: function(oContext){
			var oBaseModel = sap.ui.getCore().getModel("PPMUser");
			if (!oBaseModel)
			{
				var sServiceUrl = oContext.getModel("masterShared").getProperty("/oServiceUrls/userService");
				oBaseModel = new sap.ui.model.odata.v2.ODataModel(sServiceUrl);
				oBaseModel.setSizeLimit(5000);
				oBaseModel.setDefaultCountMode(sap.ui.model.odata.CountMode.None);
				sap.ui.getCore().setModel(oBaseModel, "PPMUser");
			}
			return oBaseModel;
		},
		getCoreModel: function(oContext){
			var oBaseModel = this.getModel("CorePPM");
			if (!oBaseModel)
			{
				var sServiceUrl = oContext.getModel("masterShared").getProperty("/oServiceUrls/coreService");
				oBaseModel = new sap.ui.model.odata.v2.ODataModel(sServiceUrl);
				oBaseModel.setSizeLimit(5000);
				oBaseModel.setDefaultCountMode(sap.ui.model.odata.CountMode.None);
				this.setModel(oBaseModel, "CorePPM");
			}
			return oBaseModel;
		},
		getBaseModel: function(oContext){
			var oBaseModel = sap.ui.getCore().getModel("PPM");
			if (!oBaseModel)
			{
				var sServiceUrl = oContext.getModel("masterShared").getProperty("/oServiceUrls/mainService");
				oBaseModel = new sap.ui.model.odata.v2.ODataModel(sServiceUrl);
				oBaseModel.setSizeLimit(5000);
				oBaseModel.setDefaultCountMode(sap.ui.model.odata.CountMode.None);
				sap.ui.getCore().setModel(oBaseModel, "PPM");
			}
			return oBaseModel;
		},
		// move this to a util class
		getPPMModel: function(oContext) {
			// Set up the initial selections
			var oModel = sap.ui.getCore().getModel("PPMData");
			if (!oModel) {
				var oData = {};
				oData.Initiatives = {};
				// create other placeholders for other data
				var oModel = new sap.ui.model.json.JSONModel(oData);
				
				oModel.setSizeLimit(5000);
				sap.ui.getCore().setModel(oModel, "PPMData");
			}
			return oModel;
		},
		getGlobalFilter: function(){
			var GlobalFilter = {
					"DivisionKey": "",
					"HubKey": "",
					"CategoryKey": "",
					"SubcategoryKey": "",
					"InnovationKey": "",
					"PhaseKey": "",
					"DivisionKeyText": "",
					"HubKeyText": "",
					"CategoryKeyText": "",
					"SubcategoryKeyText": "",
					"InnovationKeyText": "",
					"PhaseKeyText": ""
			};
			return GlobalFilter;
		},
		// move to util class
		getStaticData: function (oContext){
			var oBaseModel = this.getBaseModel(oContext);
			var sPath = "/VHCategories";
			var oExclude = {};
			var filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHCategories");
			
			sPath = "/VHDivisions";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHDivisions");
			
			sPath = "/VHPhases";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHPhases");
			
			sPath = "/VHInnovTypes";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHInnovTypes");
			
			sPath = "/VHQuestionnaires";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHQuestionnaires");
			
			sPath = "/VHMarketingObjectives";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHMarketingObjectives");
			
			sPath = "/ScoringModels";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "ScoringModels");
			
			sPath = "/VHDocsPeriod";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHDocsPeriod");
			
			sPath = "/VHManagers";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHManagers");
			
			// sPath = "/VHISubCategories";
			// oExclude = {};
			// filters = [];
			// this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHISubCategories");
			
			// sPath = "/VHIRegions";
			// oExclude = {};
			// filters = [];
			// this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHIRegions");
			
			// sPath = "/VHICategories";
			// oExclude = {};
			// filters = [];
			// this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHICategories");
			
			// Todo: once VHConsumerDiffs fixed uncomment this code
			// sPath = "/VHConsumerDiffs";
			// oExclude = {};
			// filters = [];
			// this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHConsumerDiffs");
			
			// sPath = "/VHInnovationTypes";
			// oExclude = {};
			// filters = [];
			// this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHInnovationTypes");
				
		},
		readStaticData: function(oModel, sPath, oExclude, oFilters, entityName){
			var that = this;
			oModel.read(sPath, {
					async: true,
					filters: oFilters,
					success: function(oDataIn, oResponse) {
						console.log("Success in reading" + entityName );
						that.setData(that, oDataIn, entityName);
					},
					error: function(oError) {
						console.error("Error in reading:" + entityName + ": + oError");
						//oError.ErrorOrigin = "MasterDataLoad";
						//sap.ui.getCore().getEventBus().publish("colgate.asm.planning.project", "Errors", oError);
					}
				});	
				
		},
		setData: function(oContext, oDataIn, entityName){
			var oModel = sap.ui.getCore().getModel ("PPMData");
			var oData = oModel.getData();
			if (entityName === "VHDivisions")
			{
				oData.VHDivisions = oDataIn.results;
			}
			else if (entityName === "VHHubs")
			{
				if (!oData.VHHubs)
					oData.VHHubs = {};
					
				oData.VHHubs.Current = this.filterHubData(oDataIn.results);
			}
			else if (entityName === "VHHubsGF")
			{
				if (!oData.VHHubs)
					oData.VHHubs = {};
				oData.VHHubs.CurrentGF = this.filterHubData(oDataIn.results);
			}
			else if (entityName === "VHPhases")
			{
				oData.VHPhases = oDataIn.results;
			}
			else if (entityName === "VHCategories")
			{
				oData.VHCategories = oDataIn.results;
			}
			else if (entityName === "VHSubcategories")
			{
				if (!oData.VHSubCategories)
					oData.VHSubCategories = {};
				oData.VHSubCategories.Current = oDataIn.results;
			}
			else if (entityName === "VHSubcategoriesGF")
			{
				if (!oData.VHSubCategories)
					oData.VHSubCategories = {};
				oData.VHSubCategories.CurrentGF = oDataIn.results;
			}
			else if (entityName === "VHInnovTypes")
			{
				oData.VHInnovTypes = oDataIn.results;
			}
			else if (entityName === "VHQuestionnaires")
			{
				oData.VHQuestionnaires = oDataIn.results;
			}
			else if (entityName === "VHMarketingObjectives")
			{
				oData.VHMarketingObjectives = oDataIn.results;
			}
			else if (entityName === "ScoringModels")
			{
				oData.ScoringModels = oDataIn.results;
			}
			else if (entityName === "VHDocsPeriod")
			{
				oData.VHDocsPeriod = oDataIn.results;
			}
			else if (entityName === "VHManagers")
			{
				oData.VHManagers = {};
				oData.VHManagers.All = oDataIn.results;
			}
			
			oModel.refresh(false);
		},
		filterHubData: function (hubList)
		{
			var newHubList = [];
			for (var i = 0; i < hubList.length; i++)
			{
				if (hubList[i].HubKey !== "994" && hubList[i].HubKey !== "995"  && hubList[i].HubKey !== "996" && hubList[i].HubKey !== "997" 
							&& hubList[i].HubKey !== "998"  && hubList[i].HubKey !== "999")
				{
					newHubList.push(hubList[i])	;
				}
			}
			return newHubList;
		}
		
	};
});