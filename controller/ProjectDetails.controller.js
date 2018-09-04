sap.ui.define([
	"colpal/ppm/projectmgmt/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/m/Dialog",
	"colpal/ppm/projectmgmt/model/formatter",
	"colpal/ppm/projectmgmt/util/DateUtils",
	"colpal/ppm/projectmgmt/util/QuestionnaireUtil",
	"colpal/ppm/projectmgmt/util/MgrUtils",
	"colpal/ppm/projectmgmt/util/CustomCurrencyFormatter",
	"colpal/ppm/projectmgmt/util/IPMUtils"
], function(BaseController, JSONModel, MessageBox, MessageToast, Dialog, formatter, DateUtils, QuestionnaireUtil, MgrUtils,
	CustomCurrencyFormatter, IPMUtils) {
	"use strict";

	return BaseController.extend("colpal.ppm.projectmgmt.controller.ProjectDetails", {

		formatter: formatter,
		_oBinding: {},

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */
		currencyFormatter: function(fAmount, sCurrency) {
			// if (parseFloat(fAmount) < 0) {
			// 	this.removeStyleClass("FontColorBlack");
			// 	this.addStyleClass("FontColorRed");
			// } else {
			// 	this.removeStyleClass("FontColorRed");
			// 	this.addStyleClass("FontColorBlack");
			// }
			return CustomCurrencyFormatter.formatValue(fAmount, sCurrency);
		},
		onInit: function() {
			var that = this;
			this.getRouter().getTargets().getTarget("create").attachDisplay(null, this._onDisplay, this);
			this._oODataModel = this.getOwnerComponent().getModel();
			this._oResourceBundle = this.getResourceBundle();

			this._oViewModel = new JSONModel({
				enableCreate: false,
				delay: 0,
				busy: false,
				mode: "create",
				viewTitle: ""
			});
			this.setModel(this._oViewModel, "viewModel");
			this.saveAction = "";
			this.RefreshOnSave = false;
			var oExoticDecimalTypeForUS = new sap.ui.model.type.Float({
				groupingEnabled: true,
				groupingSeparator: "-",
				minFractionDigits: 1
			});

			var oData = {};
			oData.viewTitle = "";
			oData.ProjectFinCount = 0;
			oData.originalPath = "";
			oData.Input = {};
			oData.Display = {};
			oData.Visible = {
				ProjectName: true,
				PID: true,
				IName: true,
				IID: true,
				PType: true,
				Phase: true,
				Status: true,
				Grid: true,
				PMgr: true,
				FMgr: true,
				ConsPers: true,
				Technology: true,
				Innovation: true,
				Strategic: true,
				Marketing: true,
				Division: true,
				Hub: true,
				RolloutDt: true,
				Category: true,
				ProdCategory: true,
				Brand: true,
				SubBrand: true,
				StartDt: true,
				LaunchDt: true,
				CreateDt: true,
				UpdateDt: true,
				Currency: true,
				PFinDivision: true,
				PFinHub: true,
				PFinCurrency: true,
				PFIRolloutDt: true,
				PFinMarketShare: true,
				PFinMargin: true,
				PFinNetSales: true,
				PFinIncremental: true,
				PFinIncrementalNetSales: true,
				PFinEstSpend: true,
				PFinEstSpendInsight: true,
				PFinEstSpendGTN: true,
				PFinEstSpendGDP: true,
				PFinAdd: false,
				EditButton: true
			};
			oData.Editable = {
				enableUpdate: false,
				ProjectName: false,
				PID: false,
				IName: false,
				IID: false,
				PType: false,
				Phase: false,
				Status: false,
				Grid: false,
				PMgr: false,
				FMgr: false,
				ConsPers: true,
				Technology: true,
				Innovation: false,
				Division: false,
				Strategic: false,
				Marketing: false,
				Hub: false,
				RolloutDt: false,
				Category: false,
				ProdCategory: false,
				Brand: false,
				SubBrand: false,
				StartDt: false,
				LaunchDt: false,
				CreateDt: false,
				UpdateDt: false,
				Currency: false,
				PFinDivision: false,
				PFinHub: false,
				PFinCurrency: false,
				PFIRolloutDt: false,
				PFinMarketShare: false,
				PFinMargin: false,
				PFinNetSales: false,
				PFinIncremental: false,
				PFinIncrementalNetSales: false,
				PFinEstSpend: false,
				PFinEstSpendInsight: false,
				PFinEstSpendGTN: false,
				PFinEstSpendGDP: false,
				EditButton: true,
				FinTab: true,
				AttTab: true,
				LogTab: true
			};
			oData.Internal = {
				Save2Mode: "AddActivity",
				Save3Mode: "AddSubactivity",
				CurrentSaveMode: "Display" //Display Edit Create
			};
			oData.ProjectFinInfo = [];

			var oModel = new sap.ui.model.json.JSONModel(oData);
			oModel.setSizeLimit(5000);
			this.setModel(oModel, "PGI");

			// this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			// Register the view with the message manager
			sap.ui.getCore().getMessageManager().registerObject(this.getView(), true);
			var oMessagesModel = sap.ui.getCore().getMessageManager().getMessageModel();
			this._oBinding = new sap.ui.model.Binding(oMessagesModel, "/", oMessagesModel.getContext("/"));
			this._oBinding.attachChange(function(oEvent) {
				var aMessages = oEvent.getSource().getModel().getData();
				for (var i = 0; i < aMessages.length; i++) {
					if (aMessages[i].type === "Error" && !aMessages[i].technical) {
						that._oViewModel.setProperty("/enableCreate", false);
					}
				}
			});

			var oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.subscribe("colgate.ppm.projectmgmt.projectdetail", "setLeadHubRolloutDate",
				function(sChannelId, sEventId, oDataIn) {
					this.setLeadHubRolloutDate();
				}, this);

			oEventBus.subscribe("colgate.ppm.projectmgmt.projectdetail", "refreshAttachments",
				function(sChannelId, sEventId, oDataIn) {
					if (this.attachmentDialog) {
						this.attachmentDialog.close();
						this.attachmentDialog.destroy();
						this.attachmentDialog = null;
						// this.getItemAttachments();
					}
					this.getItemAttachments();
				}, this);

			oEventBus.subscribe("colgate.ppm.projectmgmt.projectdetail", "updateFinInfoRowCount",
				function(sChannelId, sEventId, oDataIn) {
					setTimeout(function() {
						that.updateFinInfoRowCount();
					}, 200);
					// this.updateFinInfoRowCount ();
				}, this);

			// var jsonModel = new JSONModel();
			// var Project = {};
			// jsonModel.setData (Project);
			// this.getView().setModel (jsonModel, "PGI");

			// var ppmModel = sap.ui.core.getModel ("PPMData");
			// var ppmModel = sap.ui.getCore().getModel("PPMData");
			// if (ppmModel)
			// {
			// 	this.getView().setModel (ppmModel, "PPMData");
			// }
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
		setupItemforUpdate: function(oItem, pgiData) {

			// Questions: ItemType or Project Type key ????
			// CreatedBy & CreatedDate : does it need to be populated
			// LastupdbyKey, LastupdateDate & LastUpdateTime : does it need to be populated
			oItem.ItemDesc = pgiData.Project.ItemDesc;
			oItem.ProjecttypeKey = pgiData.Project.ProjecttypeKey;
			oItem.DivisionKey = pgiData.Project.DivisionKey;
			oItem.HubKey = pgiData.Project.HubKey;
			oItem.CategoryKey = pgiData.Project.CategoryKey;
			oItem.SubcategoryKey = pgiData.Project.SubcategoryKey;
			oItem.BrandKey = pgiData.Project.BrandKey;
			oItem.SubbrandKey = pgiData.Project.SubbrandKey;
			oItem.CurrencyKey = pgiData.Project.CurrencyKey;
			oItem.InnovationKey = pgiData.Project.InnovationKey;
			// oItem.CreatedbyKey = pgiData.Project.CreatedbyKey;
			// oItem.CreatedDate = pgiData.Project.CreatedDate;

			// new Date (DateUtils.getSystemAdjISODate_fromDate (oDataIn.StartDate));

			oItem.LaunchDate = new Date(DateUtils.getSystemAdjISODate_fromDate(pgiData.Project.LaunchDate));
			oItem.StartDate = new Date(DateUtils.getSystemAdjISODate_fromDate(pgiData.Project.StartDate));

			// var launctDt = pgiData.Project.LaunchDate;
			// launctDt.setUTCDate(launctDt.getDate());
			// oItem.LaunchDate = launctDt;

			// oItem.PlannedFinish = new Date (DateUtils.getSystemAdjISODate_fromDate (pgiData.Project.PlannedFinish));
			console.log("Update: Start Date:" + oItem.StartDate);
			console.log("Update: Launch Date:" + oItem.LaunchDate);

			// oItem.LastupdbyKey = pgiData.Project.LastupdbyKey;
			// oItem.LastupdateDate = pgiData.Project.LastupdateDate;
			// oItem.LastUpdateTime = pgiData.Project.LastUpdateTime;
			// oItem.PlannedFinish = pgiData.Project.PlannedFinish;
			oItem.PhaseKey = pgiData.Project.PhaseKey;
			oItem.PhasestatusKey = pgiData.Project.PhasestatusKey;

			oItem.ProjmanagerKey = pgiData.Project.ProjmanagerKey;
			oItem.FinamanagerKey = pgiData.Project.FinamanagerKey;
			// oItem.ConprediffKey = pgiData.Project.ConprediffKey;
			// oItem.TobmuKey = pgiData.Project.TobmuKey;
			oItem.StarfoKey = pgiData.Project.StarfoKey;
			oItem.MarkobjeKey = pgiData.Project.MarkobjeKey;

			if (pgiData.Project.Grid) {
				oItem.ZimGrid = "1";
			} else {
				oItem.ZimGrid = "0";
			}
			// oItem.ProjecttypeKey = pgiData.Project.ProjecttypeKey;

			return oItem;
		},
		setupFinItemForUpdate: function(oItemFin, oRecord) {
			oItemFin.RpmGuid = oRecord.RpmGuid;
			oItemFin.IniGuid = oRecord.IniGuid;
			oItemFin.SerialNo = oRecord.SerialNo;
			oItemFin.DivisionKey = oRecord.DivisionKey;
			// oItemFin.DivisionDesc = oRecord.DivisionDesc;
			oItemFin.HubKey = oRecord.HubKey;
			// oItemFin.HubDesc = oRecord.HubDesc;
			oItemFin.ProjectID = oRecord.ProjectID;
			oItemFin.InitiaitiveID = oRecord.InitiaitiveID;
			// oItemFin.RolloutDate = oRecord.RolloutDate;
			oItemFin.CurrencyKey = oRecord.CurrencyKey;
			// oItemFin.CurrencyDesc = oRecord.CurrencyDesc;
			// oItemFin.MarketShare = oRecord.MarketShare;
			oItemFin.Margin = oRecord.Margin;
			oItemFin.NetSales = oRecord.NetSales;
			oItemFin.Incremental = oRecord.Incremental;
			oItemFin.IncrementalNetSales = oRecord.IncrementalNetSales;
			oItemFin.EstimatedSpendAP = oRecord.EstimatedSpendAP;
			oItemFin.EstimatedDesign = oRecord.EstimatedDesign;
			oItemFin.EstimatedSpendInsights = oRecord.EstimatedSpendInsights;
			oItemFin.EstimatedSpendGTN = oRecord.EstimatedSpendGTN;
			return oItemFin;
		},
		checkForFinChanges: function(oRecord, orgFinInfo) {
			var rowChanged = false;
			for (var i = 0; i < orgFinInfo.length; i++) {
				// if (oRecord.HubKey === ppmData.ProjectFinInfo[i].HubKey)
				//psutram7
				if (oRecord.SerialNo === orgFinInfo[i].SerialNo) {
					if (oRecord.HubKey !== orgFinInfo[i].HubKey)
						return true;
					if (oRecord.CurrencyKey !== orgFinInfo[i].CurrencyKey)
						return true;
					if (oRecord.RolloutDate !== orgFinInfo[i].RolloutDate)
						return true;
					// if (parseFloat(oRecord.MarketShare) !== parseFloat(orgFinInfo[i].MarketShare))
					// 	return true;

					if (parseFloat(oRecord.Margin) !== parseFloat(orgFinInfo[i].Margin))
						return true;

					if (parseFloat(oRecord.NetSales) !== parseFloat(orgFinInfo[i].NetSales))
						return true;

					if (parseFloat(oRecord.Incremental) !== parseFloat(orgFinInfo[i].Incremental))
						return true;

					// if (parseFloat(oRecord.EstimatedSpendAP) !== parseFloat(ppmData.ProjectFinInfo[i].EstimatedSpendAP))
					// 	return true;

					// if (parseFloat(oRecord.EstimatedDesign) !== parseFloat(ppmData.ProjectFinInfo[i].EstimatedDesign))
					// 	return true;

					// if (parseFloat(oRecord.EstimatedSpendInsights) !== parseFloat(ppmData.ProjectFinInfo[i].EstimatedSpendInsights))
					// 	return true;

					// if (parseFloat(oRecord.EstimatedSpendGTN) !== parseFloat(ppmData.ProjectFinInfo[i].EstimatedSpendGTN))
					// 	return true;

					if (oRecord.EstimatedSpendAP !== orgFinInfo[i].EstimatedSpendAP)
						return true;

					if (oRecord.EstimatedDesign !== orgFinInfo[i].EstimatedDesign)
						return true;

					if (oRecord.EstimatedSpendInsights !== orgFinInfo[i].EstimatedSpendInsights)
						return true;

					if (oRecord.EstimatedSpendGTN !== orgFinInfo[i].EstimatedSpendGTN)
						return true;
				}
			}
			return rowChanged;
		},
		setupFinForInsert: function(pgiData) {
			var ppmData = this.getModel("PPMData").getData();
			var projectFinInfo = [];

			for (var i = 0; i < pgiData.ProjectFinInfo.length; i++) {

				var currentRow = pgiData.ProjectFinInfo[i];
				var oItemFin = {};
				var onCreateAmtValue = "0";
				if (currentRow.rowMode === "Add" ||
					(currentRow.rowMode === "Edit" && this.checkForFinChanges(currentRow, ppmData.ProjectFinInfo))) {
					if (currentRow.rowMode === "Edit") {
						console.log("RowChanged for HubKey:" + currentRow.HubKey);
						oItemFin.RpmGuid = currentRow.RpmGuid;
						oItemFin.IniGuid = currentRow.IniGuid;
						// oItemFin.__metadata = currentRow.__metadata;
					}
					oItemFin.SerialNo = currentRow.SerialNo + "";
					oItemFin.DivisionKey = currentRow.DivisionKey;
					// oItemFin.DivisionDesc = pgiData.ProjectFin.DivisionDesc;
					oItemFin.HubKey = currentRow.HubKey;
					oItemFin.HubDesc = pgiData.ProjectFin.HubDesc;
					oItemFin.ProjectID = currentRow.ProjectID;
					oItemFin.InitiaitiveID = currentRow.InitiaitiveID;
					// oItemFin.RolloutDate = currentRow.RolloutDate;

					oItemFin.RolloutDate = new Date(DateUtils.getSystemAdjISODate_fromDate(currentRow.RolloutDate));

					oItemFin.CurrencyKey = currentRow.CurrencyKey;
					oItemFin.CurrencyDesc = pgiData.ProjectFin.CurrencyDesc;
					// oItemFin.MarketShare = currentRow.MarketShare.toString();

					// oItemFin.Margin = currentRow.Margin.toString();
					// oItemFin.NetSales = currentRow.NetSalesEdit[0].toString();
					// oItemFin.Incremental = currentRow.Incremental.toString();
					// oItemFin.IncrementalNetSales = currentRow.IncrementalNetSales.toString();
					// oItemFin.EstimatedSpendAP = currentRow.EstimatedSpendAPEdit[0].toString();
					// oItemFin.EstimatedDesign = currentRow.EstimatedDesignEdit[0].toString();
					// oItemFin.EstimatedSpendInsights = currentRow.EstimatedSpendInsightsEdit[0].toString();
					// oItemFin.EstimatedSpendGTN = currentRow.EstimatedSpendGTN.toString();

					oItemFin.Margin = onCreateAmtValue;
					oItemFin.NetSales = onCreateAmtValue;
					oItemFin.Incremental = onCreateAmtValue;
					oItemFin.IncrementalNetSales = onCreateAmtValue;
					oItemFin.EstimatedSpendAP = onCreateAmtValue;
					oItemFin.EstimatedDesign = onCreateAmtValue;
					oItemFin.EstimatedSpendInsights = onCreateAmtValue;
					oItemFin.EstimatedSpendGTN = onCreateAmtValue;

					projectFinInfo.push(oItemFin);
				}
			}
			return projectFinInfo;
		},
		// psutram7
		setupItemAnswerForInsert: function(pgiData) {
			var ppmData = this.getModel("PPMData").getData();
			var qCollection = [];
			var bCreate = false;
			var updateCollection = [];
			// pgiData.ItemQuesAnswer
			// pgiData.Questionnaire
			//ppmData.VHQuestionnaires
			// if No ItemAnswer exists on retrieve 
			// then get List of Questions and then set the corresponding answers from QuestionnaireUtil

			if (ppmData.ItemQuesAnswer && ppmData.ItemQuesAnswer.length > 0) {
				console.log("setupItemAnswerForInsert: Using ppmData.ItemQuesAnswer ");
				qCollection = ppmData.ItemQuesAnswer;
			} else {
				console.log("setupItemAnswerForInsert: Using VHQuestionnaires");
				qCollection = ppmData.VHQuestionnaires;
				bCreate = true;
			}
			for (var i = 0; i < qCollection.length; i++) {

				// var currentRow = qCollection[i];
				var oItemQuesAnswers = {};
				if (bCreate) {
					oItemQuesAnswers.RpmGuid = pgiData.Project.RpmGuid;
					oItemQuesAnswers.RpmGuidC = pgiData.Project.RpmGuidC;
					oItemQuesAnswers.QnnrId = qCollection[i].QnnrId;
					oItemQuesAnswers.QstgrpId = qCollection[i].QstgrpId;
					oItemQuesAnswers.QuestionId = qCollection[i].QuestionId;
					oItemQuesAnswers.OptionId = qCollection[i].OptionId;
					oItemQuesAnswers.Valuation = qCollection[i].Valuation;
					// oItemQuesAnswers.Answered = "";
					// oItemQuesAnswers.Answered =  qCollection.Answered;
				} else {
					oItemQuesAnswers = qCollection[i];
					oItemQuesAnswers.Answered = "";
				}
				if (pgiData.Questionnaire && pgiData.Questionnaire.length > 0) {
					for (var j = 0; j < pgiData.Questionnaire.length; j++) {
						// console.log ("Q Id:" + oItemQuesAnswers.QnnrId + ":" + "")
						if (pgiData.Questionnaire[j].QuestionId === oItemQuesAnswers.QuestionId &&
							oItemQuesAnswers.Valuation === pgiData.Questionnaire[j].AnswerValuation) {
							oItemQuesAnswers.Answered = "X";
							j = pgiData.Questionnaire.length;
						}
					}
					updateCollection.push(oItemQuesAnswers);
				}
				// if (bCreate)
				// {
				// 	qCollection.push(oItemQuesAnswers);
				// }
			}
			return updateCollection;
		},
		/*
		createProjectFinInfo: function(){
			var that = this;
			var oBaseModel = sap.ui.getCore().getModel ("PPM");
			var oModel = this.getModel("PGI");
			var pgiData = oModel.getData();
			
			for (var i = 0; i < pgiData.ProjectFinInfo.length; i++)
			{
				
				var currentRow = pgiData.ProjectFinInfo[i];
				if (currentRow.rowMode === "Add")
				{
					var oItemFin = {};
					
					oItemFin.RpmGuid = currentRow.RpmGuid;
					oItemFin.IniGuid = currentRow.IniGuid;
					oItemFin.DivisionKey = currentRow.DivisionKey;
					// oItemFin.DivisionDesc = pgiData.ProjectFin.DivisionDesc;
					oItemFin.HubKey = currentRow.HubKey;
					// oItemFin.HubDesc = pgiData.ProjectFin.HubDesc;
					oItemFin.ProjectID = currentRow.ProjectID;
					oItemFin.InitiaitiveID = currentRow.InitiaitiveID;
					// oItemFin.RolloutDate = pgiData.ProjectFin.RolloutDate;
					oItemFin.CurrencyKey = currentRow.CurrencyKey;
					// oItemFin.CurrencyDesc = pgiData.ProjectFin.CurrencyDesc;
					oItemFin.MarketShare = currentRow.MarketShare;
					oItemFin.Margin = currentRow.Margin;
					oItemFin.NetSales = currentRow.NetSales;
					oItemFin.Incremental = currentRow.Incremental;
					oItemFin.IncrementalNetSales = currentRow.IncrementalNetSales;
					oItemFin.EstimatedSpendAP = currentRow.EstimatedSpendAP;
					oItemFin.EstimatedDesign = currentRow.EstimatedDesign;
					oItemFin.EstimatedSpendInsights = currentRow.EstimatedSpendInsights;
					oItemFin.EstimatedSpendGTN = currentRow.EstimatedSpendGTN;
					
					oBaseModel.create("/ItemFinancialInfo", oItemFin, {
						success: function(oData, oResponse) {
							console.log ("Success in creating ItemFinancialInfo:" + oResponse.statusCode);
						},
						error: function(oError) {
							oError.ErrorOrigin = "CreateProject";
							sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
						}
					});
				}
			}
		},
		*/
		/*
		updateProjectFinInfo: function(){
			var that = this;
			var oBaseModel = sap.ui.getCore().getModel ("PPM");
			var oModel = this.getModel("PGI");
			var ppmModel = this.getModel("PPMData");
			var ppmData = ppmModel.getData ();
			var pgiData = oModel.getData();
			var fields = ["DivisionKey", "HubKey", "RolloutDate", "CurrencyKey", "CurrencyDesc", "MarketShare", "Margin", "NetSales", "Incremental", "IncrementalNetSales", "EstimatedSpendAP", "EstimatedDesign", "EstimatedSpendInsights", "EstimatedSpendGTN"]
						
			var updateItems = [];
			var createItems = [];
			var oItemFin = {};
			for (var i = 0; i < pgiData.ProjectFinInfo.length;i++)
			{
				var oRecord = pgiData.ProjectFinInfo[i];
				if (oRecord.rowMode === "Add")
				{
					
					oItemFin = {};
					oItemFin = this.setupFinItemForUpdate(oItemFin, oRecord);
					// oItemFin.push(oItemFin);
					
					oBaseModel.create("/ItemFinancialInfo", oItemFin, {
										success: function(oData, oResponse) {
											console.log ("Success in creating ItemFinancialInfo:" + oResponse.statusCode);
										},
										error: function(oError) {
											oError.ErrorOrigin = "CreateProject";
											sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
										}
						});
				}				
				else
				{
					// edit mode
					for (var j  = 0; j < ppmData.ProjectFinInfo.length; j++)
					{
						var orgRecord = ppmData.ProjectFinInfo[j];
						if (orgRecord.RpmGuid === oRecord.RpmGuid && orgRecord.DivisionKey === oRecord.DivisionKey && orgRecord.HubKey === oRecord.HubKey)
						{
							console.log ("Record Matched");
							for (var x=0; x< fields.length; x++)
							{
								if (orgRecord[fields[x]] !== oRecord[fields[x]])
								{
									console.log ("Record has Changed");
									x = fields.length;
									j = ppmData.ProjectFinInfo.length;
									oItemFin = {};
									oItemFin = this.setupFinItemForUpdate(oItemFin, oRecord);
					
									var sPath = oRecord.__metadata.uri.substring(oRecord.__metadata.uri.lastIndexOf("/"));
									oBaseModel.update(sPath, oItemFin, {
										success: function(oData, oResponse) {
											console.log("Success in Updating:" + oResponse.statusCode);
										},
										error: function(oError) {
											oError.ErrorOrigin = "UpdateProject";
											console.log("Error in Updating:" + oError);
											sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
										}
									});
								}
							}
						}
					}
					//var sPath = oRecord.__metadata.uri.substring(oRecord.__metadata.uri.lastIndexOf("/"));
				}
			}
		},
		*/
		onCopy: function() {
			var that = this;
			sap.m.MessageBox.show(
				this.getModel("i18n").getResourceBundle().getText("PGI_Confirm_Copy"), {
					icon: sap.m.MessageBox.Icon.QUESTION,
					title: this.getModel("i18n").getResourceBundle().getText("PGI_Confirm_Copy_title"),
					actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
					onClose: function(oAction) {
						if (oAction === sap.m.MessageBox.Action.YES) {
							that.createProject();
						}
					}
				}
			);
		},
		// copyProject: function(oContext){
		// 	var oBaseModel = sap.ui.getCore().getModel("PPM");
		// 	var oModel = this.getModel("PGI");
		// 	var pgiData = oModel.getData();
		// 	var oItem = {};

		// 	oItem = this.setupItemforUpdate(oItem, pgiData);
		// 	oItem.ItemFinancialInfoSet = this.setupFinForInsert(pgiData);

		// },
		createProject: function() {
			// pgiData.CurrentMode === "Create"
			var that = this;
			var oBaseModel = sap.ui.getCore().getModel("PPM");
			var oModel = this.getModel("PGI");
			var pgiData = oModel.getData();
			var oItem = {};
			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStartSpinner", {});
			// oItem.IniGuidC = "binary\'" + pgiData.Project.IniGuidC + "\'";
			// oItem.IniGuidC = pgiData.Project.IniGuidC;
			// oItem.ItemDesc = pgiData.Project.ItemDesc;
			// oItem.IniId = pgiData.Project.IniId;
			oItem = this.setupItemforUpdate(oItem, pgiData);
			// oItem = this.setupItemforUpdate(oItem, pgiData);

			if (pgiData.CurrentMode === "Display") {
				oItem.ItemDesc = "Copy:" + pgiData.Project.ItemDesc;
			}
			oItem.ItemFinancialInfoSet = this.setupFinForInsert(pgiData);
			oItem.ItemQuesAnswerSet = this.setupItemAnswerForInsert(pgiData);

			// oItem.ItemFinancialInfo = this.setupFinForInsert(pgiData);

			console.log("data setup for create");
			oBaseModel.create("/ItemsList", oItem, {
				success: function(oData, oResponse) {
					console.log("Success in creating ItemsList:" + oResponse.statusCode);
					var sMessage = that.getModel("i18n").getResourceBundle().getText("PGI_CreateprojectSuccess", [oItem.ItemDesc]);
					MessageToast.show(sMessage);
					that._navBack();
					sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStopSpinner", {});
					sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.detail", "refresh", {});

				},
				error: function(oError) {
					var sMessage = that.getModel("i18n").getResourceBundle().getText("PGI_CreateprojectError", [oError]);
					MessageToast.show(sMessage);
					oError.ErrorOrigin = "CreateProject";
					sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStopSpinner", {});

					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
				}
			});
		},
		updateProjectBatch: function() {
			var that = this;
			var oBaseModel = sap.ui.getCore().getModel("PPM");
			var oModel = this.getModel("PGI");
			var pgiData = oModel.getData();
			var oRow = sap.ui.getCore().getModel("PPMData").getProperty(pgiData.originalPath);
			var ppmData = this.getModel("PPMData").getData();
			var batchOperations = [];
			var mParameters = {
				"groupId": "PPM",
				"changeSetId": "PPM1"
			};
			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStartSpinner", {});

			var aKeys = Object.keys(oRow);
			var oItem = {};
			for (var i = 0; i < aKeys.length; i++) {
				oItem[aKeys[i]] = oRow[aKeys[i]];
			}
			this.setupItemforUpdate(oItem, pgiData);
			// oItem.ItemFinancialInfoSet = this.setupFinForInsert(pgiData);
			oBaseModel.setUseBatch(true);
			oBaseModel.setDeferredGroups(["PPM"]);
			var sPath = oRow.__metadata.uri.substring(oRow.__metadata.uri.lastIndexOf("/"));
			// batchOperations.push(oBaseModel.update(sPath, oItem));
			oBaseModel.update(sPath, oItem, mParameters);

			var orgFinInfo = JSON.parse(this.orgFinInfo);

			for (var i = 0; i < pgiData.ProjectFinInfo.length; i++) {

				var currentRow = pgiData.ProjectFinInfo[i];
				var oItemFin = {};
				if ((this.checkForFinChanges(currentRow, orgFinInfo) && currentRow.rowMode === "Edit") ||
					currentRow.rowMode === "Add") {
					oItemFin.DivisionKey = currentRow.DivisionKey;
					oItemFin.HubKey = currentRow.HubKey;
					// oItemFin.HubDesc = pgiData.ProjectFin.HubDesc;
					// oItemFin.ProjectID = currentRow.ProjectID;
					// oItemFin.InitiaitiveID = currentRow.InitiaitiveID;
					// oItemFin.RolloutDate = currentRow.RolloutDate;
					oItemFin.RolloutDate = new Date(DateUtils.getSystemAdjISODate_fromDate(currentRow.RolloutDate));

					// var rolloutDt = currentRow.RolloutDate;
					// rolloutDt.setUTCDate(rolloutDt.getDate());
					// oItemFin.RolloutDate = rolloutDt;

					// console.log("Retrieve Fin Info Rollout Date:" + i + ":" + oItemFin.RolloutDate);
					oItemFin.CurrencyKey = currentRow.CurrencyKey;
					// oItemFin.CurrencyDesc = pgiData.ProjectFin.CurrencyDesc;
					// oItemFin.MarketShare = currentRow.MarketShare.toString();
					oItemFin.Margin = currentRow.Margin.toString();
					oItemFin.NetSales = currentRow.NetSalesEdit[0].toString();
					oItemFin.Incremental = currentRow.Incremental.toString();
					oItemFin.IncrementalNetSales = currentRow.IncrementalNetSales.toString();
					oItemFin.EstimatedSpendAP = currentRow.EstimatedSpendAPEdit[0].toString();
					oItemFin.EstimatedDesign = currentRow.EstimatedDesignEdit[0].toString();
					oItemFin.EstimatedSpendInsights = currentRow.EstimatedSpendInsightsEdit[0].toString();
					oItemFin.EstimatedSpendGTN = currentRow.EstimatedSpendGTN.toString();

					oItemFin.SerialNo = currentRow.SerialNo + "";

					if (currentRow.rowMode === "Edit") {
						oItemFin.RpmGuid = currentRow.RpmGuid;

						sPath = currentRow.__metadata.uri.substring(currentRow.__metadata.uri.lastIndexOf("/"));
						mParameters = {
							"groupId": "PPM",
							"changeSetId": "PPM2"
						};

						oBaseModel.update(sPath, oItemFin, mParameters);
					} else {
						oItemFin.RpmGuid = oItem.RpmGuid;
						sPath = "/ItemFinancialInfo";
						mParameters = {
							"groupId": "PPM",
							"changeSetId": "PPM3"
						};
						oBaseModel.create(sPath, oItemFin, mParameters);
					}

				} else if (currentRow.rowMode === "Delete") {
					sPath = currentRow.__metadata.uri.substring(currentRow.__metadata.uri.lastIndexOf("/"));
					mParameters = {
						"groupId": "PPM",
						"changeSetId": "PPM2"
					};

					oBaseModel.remove(sPath, mParameters);
				}

			}
			mParameters = {
				// "groupId": "PPM",
				// "changeSetId": "PPM",
				"success": function(oData, response) {
					console.log("Success in Batch Update:");
				},
				"error": function(params) {
					console.log("Error in Batch Update:");
				}
			};
			// oItem.ItemQuesAnswerSet = this.setupItemAnswerForInsert(pgiData);
			var itemAnswersSet = this.setupItemAnswerForInsert(pgiData);
			for (var i = 0; i < itemAnswersSet.length; i++) {
				var currentRow = itemAnswersSet[i];
				var sPath = "";
				if (ppmData.ItemQuesAnswer.length === 0) {
					//create
					if (currentRow.Answered === "X") {
						mParameters = {
							"groupId": "PPM",
							"changeSetId": "PPM4"
						};
						sPath = "/ItemQuesAnswer";
						oBaseModel.create(sPath, currentRow, mParameters);
					}
				} else {
					if (currentRow.Answered === "X") {
						//update
						mParameters = {
							"groupId": "PPM",
							"changeSetId": "PPM5"
						};
						sPath = currentRow.__metadata.uri.substring(currentRow.__metadata.uri.lastIndexOf("/"));
						oBaseModel.update(sPath, currentRow, mParameters);
					}
				}
			}
			oBaseModel.submitChanges({
				// "groupId": "PPM",
				// "changeSetId": "PPM",
				"success": function(oData, response) {
					console.log("Success in Batch Update:");
					var sMessage = that.getModel("i18n").getResourceBundle().getText("PGI_UpdateprojectSuccess", [oItem.ItemDesc]);
					MessageToast.show(sMessage);
					if (that.saveAction.includes("saveClose")) {
						that.saveAction = "";
						that._navBack();
						sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStopSpinner", {});
						sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.detail", "refresh", {});
					} else {
						that.RefreshOnSave = true;
						that.getItemInfo(pgiData.Project.RpmGuidC);
						sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStopSpinner", {});
					}
				},
				"error": function(params) {
					sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStopSpinner", {});
					console.log("Error in Batch Update:");
				}
			});

		},
		updateBatchSuccess: function(params) {
			console.log("Success in Batch Update:");
		},
		updateBatchError: function(params) {
			console.log("Error in Batch Update:");
		},
		/*
		updateProject: function(){
				// pgiData.CurrentMode === "Edit"
			var that = this;
			var oModel = this.getModel("PGI");
			var oData = oModel.getData();
			var oRow = sap.ui.getCore().getModel("PPMData").getProperty(oData.originalPath);
			
			var aKeys = Object.keys(oRow);
			var oItem = {};
			for (var i = 0; i < aKeys.length; i++) {
				oItem[aKeys[i]] = oRow[aKeys[i]];
			}
			this.setupItemforUpdate(oItem, oData);
			oItem.ItemFinancialInfoSet = this.setupFinForInsert(oData);

			var sPath = oRow.__metadata.uri.substring(oRow.__metadata.uri.lastIndexOf("/"));
			console.log ("Before Update:sPath:" + sPath);
			var oBaseModel = sap.ui.getCore().getModel("PPM");
			oBaseModel.update(sPath, oItem, {
				success: function(oData, oResponse) {
					console.log("Success in Updating:" + oResponse.statusCode);
					// Add a Success toast and navigate back to the Project view and refresh the data.
					// if (oResponse.statusCode !== "204") {
					// 	oData.ErrorOrigin = "UpdateProject";
					// 	sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oData);
					// } else {
					// 	//sap.ui.getCore().getEventBus().publish("colgate.asm.planning.project", "Refresh", {});
					// 		that.getRouter().navTo("activities", {
					// 			objectId: "Activities"
					// 		}, true);
					// 		that._currentAction = "";
					// 	}
					var sMessage = this.getModel("i18n").getResourceBundle().getText("PGI_UpdateprojectSuccess", [oItem.ItemDesc]);
					MessageToast.show(sMessage);
					that._navBack();
					sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.detail", "refresh", {});
					
				},
				error: function(oError) {
					oError.ErrorOrigin = "UpdateProject";
					console.log("Error in Updating:" + oError);
					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
					var sMessage = this.getModel("i18n").getResourceBundle().getText("PGI_UpdateprojectError", [oItem.ItemDesc]);
					MessageToast.show(sMessage);
				
				}
			});
		},
		*/
		onValidate: function(oData) {
			// var pgiModel = this.getModel ("PGI");
			// var pgiData = pgiModel.getData();
			var validateFlag = true;
			var validateFinInfoFlag = true;
			var ppmData = this.getModel("PPMData").getData();

			if (oData.Project.PhasestatusKey === "IM003" && ppmData.Project.PhasestatusKey !== oData.Project.PhasestatusKey) {
				var sMessage = this.getModel("i18n").getResourceBundle().getText("PGI_PhaseStatusSetToCancel");
				MessageBox.confirm(
					sMessage, {
						// styleClass: oComponent.getContentDensityClass(),
						onClose: function(oAction) {
							if (oAction !== sap.m.MessageBox.Action.OK) {
								return false;
							}
						}
					}
				);
			}
			// COmmercialization & Complete
			if (oData.Project.PhaseKey === "DIM004" && oData.Project.PhasestatusKey === "IM004" && ppmData.Project.PhasestatusKey !== oData.Project
				.PhasestatusKey) {
				var sMessage = this.getModel("i18n").getResourceBundle().getText("PGI_PhaseStatusSetToCommercializeComplete");
				MessageBox.confirm(
					sMessage, {
						// styleClass: oComponent.getContentDensityClass(),
						onClose: function(oAction) {
							if (oAction !== sap.m.MessageBox.Action.OK) {
								return false;
							}
						}
					}
				);
			}

			if (oData.ProjectFinInfo.length === 0) {
				//have atleast one Project fin Info
				var sMessage = this.getModel("i18n").getResourceBundle().getText("PGI_MinNumberOfHub");
				MessageToast.show(sMessage);
				oData.Project.ProjectGenInfoColor = "Negative";
				validateFlag = false;
			} else {
				if (oData.CurrentMode === "Create") {
					// assign the lead hub to hub key in itemslist
					for (var i = 0; i < oData.ProjectFinInfo.length; i++) {
						var oRecord = oData.ProjectFinInfo[i];
						if (oRecord.leadHubIndicator === 1) {
							oData.Project.HubKey = oRecord.HubKey;
							oData.Project.CurrencyKey = oRecord.CurrencyKey;
						}
					}
				}
				if (!this.onCheckForDupicateHub(oData)) {
					oData.Project.ProjectGenInfoColor = "Negative";
					return false;
				}
				var sMessage = "";
				// check for required
				if (oData.Project.ItemDesc === "") {
					sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_ProjectNameRequired");
					oData.Project.ValueState_ItemDesc = sap.ui.core.ValueState.Error;
					oData.Project.ValueStateText_ItemDesc = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
						"PGI_Error_ProjectNameRequired");
					validateFlag = false;
				} else {
					oData.Project.ValueState_ItemDesc = sap.ui.core.ValueState.None;
					oData.Project.ValueStateText_ItemDesc = "";
				}

				if (oData.CurrentMode === "Edit" && oData.Project.PhaseKey === "") {
					sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_PhaseRequired");
					validateFlag = false;
					oData.Project.ValueState_PhaseKey = sap.ui.core.ValueState.Error;
					oData.Project.ValueStateText_PhaseKey = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
						"PGI_Error_PhaseKeyRequired");
				} else {
					oData.Project.ValueState_PhaseKey = sap.ui.core.ValueState.None;
					oData.Project.ValueStateText_PhaseKey = "";
				}

				if (oData.CurrentMode === "Edit" && oData.Project.PhasestatusKey === "") {
					sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_PhaseStatusRequired");
					validateFlag = false;
					oData.Project.ValueState_PhasestatusKey = sap.ui.core.ValueState.Error;
					oData.Project.ValueStateText_PhasestatusKey = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
						"PGI_Error_PhasestatusKeyRequired");
				} else {
					oData.Project.ValueState_PhasestatusKey = sap.ui.core.ValueState.None;
					oData.Project.ValueStateText_PhasestatusKey = "";
				}

				if (oData.Project.InnovationKey === "") {
					sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_InnovationKeyRequired");
					// oData.Project.ValueState_InnovationKey = "Negative";
					// oData.Project.ValueStateText_InnovationKey = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
					// 	"PGI_Error_InnovationKeyRequired");

					oData.Editable.InnovationKeyIconColor = "Negative";
					oData.Editable.InnovationKeyIconTooltip = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
						"PGI_Error_InnovationKeyRequired");

					validateFlag = false;
				} else {
					// oData.Project.ValueState_InnovationKey = "Default";
					// oData.Project.ValueStateText_InnovationKey = "";
					oData.Editable.InnovationKeyIconColor = "Default";
					oData.Editable.InnovationKeyIconTooltip = "";
				}

				// if (oData.Project.ConprediffKey === "") {
				// 	sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_ConprediffKeyRequired");
				// 	validateFlag = false;
				// 	oData.Project.ValueState_ConprediffKey = sap.ui.core.ValueState.Error;
				// 	oData.Project.ValueStateText_ConprediffKey = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
				// 		"PGI_Error_ConprediffKeyRequired");
				// } else {
				// 	oData.Project.ValueState_ConprediffKey = sap.ui.core.ValueState.None;
				// 	oData.Project.ValueStateText_ConprediffKey = "";
				// }

				// if (oData.Project.TobmuKey === "") {
				// 	sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_TobmuKeyRequired");
				// 	validateFlag = false;
				// 	oData.Project.ValueState_TobmuKey = sap.ui.core.ValueState.Error;
				// 	oData.Project.ValueStateText_TobmuKey = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
				// 		"PGI_Error_TobmuKeyRequired");
				// } else {
				// 	oData.Project.ValueState_TobmuKey = sap.ui.core.ValueState.None;
				// 	oData.Project.ValueStateText_TobmuKey = "";
				// }

				// if (oData.Project.InnovationKey === "") {
				// 	sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_InnovationKeyRequired");
				// 	validateFlag = false;
				// 	oData.Project.ValueState_InnovationKey = sap.ui.core.ValueState.Error;
				// 	oData.Project.ValueStateText_InnovationKey = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
				// 		"PGI_Error_InnovationKeyRequired");
				// } else {
				// 	oData.Project.ValueState_InnovationKey = sap.ui.core.ValueState.None;
				// 	oData.Project.ValueStateText_InnovationKey = "";
				// }

				if (oData.Project.StarfoKey === "") {
					sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_StarfoKeyRequired");
					validateFlag = false;
					oData.Project.ValueState_StarfoKey = sap.ui.core.ValueState.Error;
					oData.Project.ValueStateText_StarfoKey = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
						"PGI_Error_StarfoKeyRequired");
				} else {
					oData.Project.ValueState_StarfoKey = sap.ui.core.ValueState.None;
					oData.Project.ValueStateText_StarfoKey = "";
				}

				if (oData.Project.MarkobjeKey === "") {
					sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_MarketingKeyRequired");
					validateFlag = false;
					oData.Project.ValueState_MarkobjeKey = sap.ui.core.ValueState.Error;
					oData.Project.ValueStateText_MarkobjeKey = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
						"PGI_Error_MarketingKeyRequired");
				} else {
					oData.Project.ValueState_MarkobjeKey = sap.ui.core.ValueState.None;
					oData.Project.ValueStateText_MarkobjeKey = "";
				}

				// TODO: psutram
				if (oData.Project.ProjecttypeKey === "") {
					sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_ProjecttypeKeyRequired");
					validateFlag = false;
					oData.Project.ValueState_ProjecttypeKey = sap.ui.core.ValueState.Error;
					oData.Project.ValueStateText_ProjecttypeKey = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
						"PGI_Error_ProjecttypeKeyRequired");
				} else {
					oData.Project.ValueState_ProjecttypeKey = sap.ui.core.ValueState.None;
					oData.Project.ValueStateText_ProjecttypeKey = "";
				}

				if (oData.Project.DivisionKey === "") {
					sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_DivisionKeyRequired");
					validateFlag = false;
					oData.Project.ValueState_DivisionKey = sap.ui.core.ValueState.Error;
					oData.Project.ValueStateText_DivisionKey = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
						"PGI_Error_DivisionKeyRequired");
				} else {
					oData.Project.ValueState_DivisionKey = sap.ui.core.ValueState.None;
					oData.Project.ValueStateText_DivisionKey = "";
				}

				if (oData.Project.CategoryKey === "") {
					sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_CategoryKeyRequired");
					validateFlag = false;
					oData.Project.ValueState_CategoryKey = sap.ui.core.ValueState.Error;
					oData.Project.ValueStateText_CategoryKey = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
						"PGI_Error_CategoryKeyRequired");
				} else {
					oData.Project.ValueState_CategoryKey = sap.ui.core.ValueState.None;
					oData.Project.ValueStateText_CategoryKey = "";
				}

				if (oData.Project.SubcategoryKey === "") {
					sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_SubcategoryKeyRequired");
					validateFlag = false;
					oData.Project.ValueState_SubcategoryKey = sap.ui.core.ValueState.Error;
					oData.Project.ValueStateText_SubcategoryKey = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
						"PGI_Error_SubcategoryKeyRequired");
				} else {
					oData.Project.ValueState_SubcategoryKey = sap.ui.core.ValueState.None;
					oData.Project.ValueStateText_SubcategoryKey = "";
				}

				if (oData.Project.BrandKey === "") {
					sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_BrandKeyRequired");
					validateFlag = false;
					oData.Project.ValueState_BrandKey = sap.ui.core.ValueState.Error;
					oData.Project.ValueStateText_BrandKey = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
						"PGI_Error_BrandKeyRequired");
				} else {
					oData.Project.ValueState_BrandKey = sap.ui.core.ValueState.None;
					oData.Project.ValueStateText_BrandKey = "";
				}

				if (oData.Project.SubbrandKey === "") {
					sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_SubbrandKeyRequired");
					validateFlag = false;
					oData.Project.ValueState_SubbrandKey = sap.ui.core.ValueState.Error;
					oData.Project.ValueStateText_SubbrandKey = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
						"PGI_Error_SubbrandKeyRequired");
				} else {
					oData.Project.ValueState_SubbrandKey = sap.ui.core.ValueState.None;
					oData.Project.ValueStateText_SubbrandKey = "";
				}

				if (oData.Project.ProjmanagerKey === "") {
					sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_ProjmanagerKeyRequired");
					validateFlag = false;
					// oData.Project.ValueState_ProjmanagerKey = "Negative";
					// oData.Project.ValueStateText_ProjmanagerKey = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
					// 	"PGI_Error_ProjmanagerKeyRequired");
					oData.Editable.ProjmanagerKeyIconColor = "Negative";
					oData.Editable.ProjmanagerKeyIconTooltip = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
						"PGI_Error_ProjmanagerKeyRequired");
				} else {
					// oData.Project.ValueState_ProjmanagerKey = "Default";
					// oData.Project.ValueStateText_ProjmanagerKey = "";
					oData.Editable.ProjmanagerKeyIconColor = "Default";
					oData.Editable.ProjmanagerKeyIconTooltip = "";
				}

				if (oData.Project.FinamanagerKey === "") {
					sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_FinamanagerKeyRequired");
					validateFlag = false;
					// oData.Project.ValueState_FinamanagerKey = "Negative";
					// oData.Project.ValueStateText_FinamanagerKey = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
					// 	"PGI_Error_FinamanagerKeyRequired");
					oData.Editable.FinamanagerKeyIconColor = "Negative";
					oData.Editable.FinamanagerKeyIconTooltip = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
						"PGI_Error_FinamanagerKeyRequired");
				} else {
					// oData.Project.ValueState_FinamanagerKey = "Default";
					// oData.Project.ValueStateText_FinamanagerKey = "";
					oData.Editable.FinamanagerKeyIconColor = "Default";
					oData.Editable.FinamanagerKeyIconTooltip = "";

				}

				// TODO: psutram: implement Date validations
				// check for Dates
				// check for dates in past 
				// check if rolloutdates are greater than Start Dates and lesser than Finish dates
				if (oData.Project.ValueState_StartDate === sap.ui.core.ValueState.Error ||
					// oData.Project.ValueState_PlannedFinish === sap.ui.core.ValueState.Error ||
					oData.Project.ValueState_LaunchDate === sap.ui.core.ValueState.Error) {
					validateFlag = false;
				}

				// if (!validateFlag) {
				// 	MessageToast.show(sMessage);
				// 	return validateFlag;
				// }

				// Planned Finish is earlier than Start Date
				/*
				if (oData.Project.PlannedFinish <= oData.Project.StartDate) {
					sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_Finish_LT_Start");
					validateFlag = false;
					oData.Project.ValueState_PlannedFinish = sap.ui.core.ValueState.Error;
					oData.Project.ValueStateText_PlannedFinish = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
						"PGI_Error_Finish_LT_Start");
				} else {
					oData.Project.ValueState_PlannedFinish = sap.ui.core.ValueState.None;
					oData.Project.ValueStateText_PlannedFinish = "";
				}
	
				// Planned Finish is earlier than Start Date
				if (oData.Project.LaunchDate <= oData.Project.StartDate) {
					sMessage += "\n" + this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_Launch_LT_Start");
					validateFlag = false;
					oData.Project.ValueState_LaunchDate = sap.ui.core.ValueState.Error;
					oData.Project.ValueStateText_LaunchDate = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
						"PGI_Error_Launch_LT_Start");
				} else {
					oData.Project.ValueState_LaunchDate = sap.ui.core.ValueState.None;
					oData.Project.ValueStateText_LaunchDate = "";
				}
*/

				var launchDt = oData.Project.LaunchDate;
				var leahHubRolloutDt;
				var bvalidRolloutDt = true;
				for (var i = 0; i < oData.ProjectFinInfo.length; i++) {
					if (oData.ProjectFinInfo[i].leadHubIndicator === 1) {
						if (oData.ProjectFinInfo[i].RolloutDate < launchDt) {
							oData.ProjectFinInfo[i].ValueState_RolloutDate = sap.ui.core.ValueState.Error;
							oData.ProjectFinInfo[i].ValueStateText_RolloutDate = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
								"PGI_Error_RolloutDt_LT_Launch");
							bvalidRolloutDt = false;
							validateFlag = false;
							// validateFinInfoFlag = false;
						} else {
							leahHubRolloutDt = oData.ProjectFinInfo[i].RolloutDate;
							oData.ProjectFinInfo[i].ValueState_RolloutDate = sap.ui.core.ValueState.None;
							oData.ProjectFinInfo[i].ValueStateText_RolloutDate = "";
						}
						i = oData.ProjectFinInfo.length;
					}
				}

				if (bvalidRolloutDt) {
					for (var i = 0; i < oData.ProjectFinInfo.length; i++) {
						if (oData.ProjectFinInfo[i].leadHubIndicator !== 1) {
							// if (oData.ProjectFinInfo[i].RolloutDate.toString() === "Invalid Date"
							if (oData.ProjectFinInfo[i].RolloutDate.toString() === "Invalid Date" || oData.ProjectFinInfo[i].RolloutDate === null || oData.ProjectFinInfo[
									i].RolloutDate < leahHubRolloutDt) {
								oData.ProjectFinInfo[i].ValueState_RolloutDate = sap.ui.core.ValueState.Error;
								oData.ProjectFinInfo[i].ValueStateText_RolloutDate = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
									"PGI_Error_RolloutDt_LT_Launch");
								validateFlag = false;
								// validateFinInfoFlag = false;
							} else {
								oData.ProjectFinInfo[i].ValueState_RolloutDate = sap.ui.core.ValueState.None;
								oData.ProjectFinInfo[i].ValueStateText_RolloutDate = "";
							}
						}
					}
				}

				// "{"DP":{"PhaseKey":"DPM003","PhaseDesc":"Develop",
				// "StatusKey":"IM001","StatusDesc":"On Going",
				// "NextStatus" :[{"NSKey":"IM002","NSDesc":"On Hold"},
				// {"NSKey":"IM003","NSDesc":"Canceled"},
				// {"NSKey":"IM004","NSDesc":"Complete"}]}}"

				if (!validateFlag)
					oData.Project.ProjectGenInfoColor = "Negative";
				else
					oData.Project.ProjectGenInfoColor = "Default";

				if (oData.Project.PhasestatusKey === "IM001" || oData.Project.PhasestatusKey === "IM004") {
					for (var i = 0; i < oData.ProjectFinInfo.length; i++) {

						if (!this.validateFinInfoExists(oData.ProjectFinInfo[i])) {
							validateFinInfoFlag = false;
							oData.Project.ProjectFinInfoColor = "Negative";
							if (validateFlag) {
								//setfocus onto fininfo tab
								var oIconTab = this.byId("__bar0");
								var oFinInfoTab = this.byId("_fin");
								oIconTab.setSelectedItem(oFinInfoTab);
							}
							validateFlag = false;

						}
					}
				}
			}

			if (validateFinInfoFlag) {
				oData.Project.ProjectFinInfoColor = "Default";
			}
			// else
			// {
			// 	oData.Project.ProjectFinInfoColor = "Negative";
			// 	if (validateFlag)
			// 	{
			// 		//setfocus onto fininfo tab
			// 		var oIconTab = this.byId("__bar0");
			// 		var oFinInfoTab = this.byId("_fin");
			// 		oIconTab.setSelectedItem(oFinInfoTab);
			// 	}
			// 	validateFlag = false;
			// }

			return validateFlag;
		},
		validateFinInfoExists: function(oRecord) {
			// called only if status is OnGoing and higher
			var validateFlag = true;
			// if (parseFloat(oRecord.MarketShare) === 0) {
			// 	oRecord.ValueState_FinMarket = sap.ui.core.ValueState.Error;
			// 	oRecord.ValueStateText_FinMarket = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
			// 		"PFI_Error_FinInfo_required");

			// 	validateFlag = false;
			// } else {
			// 	oRecord.ValueState_FinMarket = sap.ui.core.ValueState.None;
			// 	oRecord.ValueStateText_FinMarket = "";
			// }

			if (parseFloat(oRecord.Margin) === 0) {
				oRecord.ValueState_Margin = sap.ui.core.ValueState.Error;
				oRecord.ValueStateText_Margin = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
					"PFI_Error_FinInfo_required");
				validateFlag = false;
			} else {
				oRecord.ValueState_Margin = sap.ui.core.ValueState.None;
				oRecord.ValueStateText_Margin = "";
			}

			//+ INBHD02
			// if (parseFloat(oRecord.NetSales) === 0) {
			if (parseFloat(oRecord.NetSalesEdit) === 0) {
				//- INBHD02				
				oRecord.ValueState_NetSales = sap.ui.core.ValueState.Error;
				oRecord.ValueStateText_NetSales = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
					"PFI_Error_FinInfo_required");
				validateFlag = false;
			} else {
				oRecord.ValueState_NetSales = sap.ui.core.ValueState.None;
				oRecord.ValueStateText_NetSales = "";
			}

			// if (parseFloat(oRecord.Incremental) === 0) {
			// 	oRecord.ValueState_Incremental = sap.ui.core.ValueState.Error;
			// 	oRecord.ValueStateText_Incremental = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
			// 		"PFI_Error_FinInfo_required");
			// 						validateFlag = false;
			// } else {
			// 	oRecord.ValueState_Incremental = sap.ui.core.ValueState.None;
			// 	oRecord.ValueStateText_Incremental = "";
			// }

			if (parseFloat(oRecord.IncrementalNetSales) === 0) {
				oRecord.ValueState_IncrementalNetSales = sap.ui.core.ValueState.Error;
				oRecord.ValueStateText_IncrementalNetSales = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
					"PFI_Error_FinInfo_required");
				validateFlag = false;
			} else {
				oRecord.ValueState_IncrementalNetSales = sap.ui.core.ValueState.None;
				oRecord.ValueStateText_IncrementalNetSales = "";
			}

			return validateFlag;
		},

		handleDateChange: function(oEvent) {
			// var oDP = oEvent.oSource;
			var oDP = oEvent.getSource();
			var sValue = oEvent.getParameter("value");
			var bValid = oEvent.getParameter("valid");
			//this._iEvent++;

			if (bValid) {
				oDP.setValueState(sap.ui.core.ValueState.None);
				if (oDP.getId().match("LaunchDt")) {
					//psutram7
					// this.setLeadHubRolloutDate ();	
					sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.projectdetail", "setLeadHubRolloutDate", {});
				}

				var pgiData = this.getModel("PGI").getData();
				if (oEvent.getSource().getId().includes("Launch") && pgiData.CurrentMode === "Edit") {
					var sMessage = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_LaunchDate_Changed");
					MessageToast.show(sMessage);
				}

			} else {
				oDP.setValueState(sap.ui.core.ValueState.Error);
			}

		},
		setLeadHubRolloutDate: function(oEvent) {
			var oModel = this.getModel("PGI");
			var oData = this.getModel("PGI").getData();

			var launchDt = oData.Project.LaunchDate;

			for (var i = 0; i < oData.ProjectFinInfo.length; i++) {
				if (oData.ProjectFinInfo[i].leadHubIndicator === 1) {
					oData.ProjectFinInfo[i].RolloutDate = launchDt;
				}
				if (oData.ProjectFinInfo[i].RolloutDate < launchDt) {
					oData.ProjectFinInfo[i].ValueState_RolloutDate = sap.ui.core.ValueState.Error;
					oData.ProjectFinInfo[i].ValueStateText_RolloutDate = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(
						"PGI_Error_RolloutDt_LT_Launch");
				}
			}

		},
		onCheckForDupicateHub: function(oData) {
			//ToDO: psutram
			for (var i = 0; i < oData.ProjectFinInfo.length; i++) {
				var oRecord = oData.ProjectFinInfo[i];
				if (oRecord.HubKey === "") {
					var sMessage = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_HubRequired");
					MessageToast.show(sMessage);
					return false;
				}
				for (var j = i + 1; j < oData.ProjectFinInfo.length; j++) {
					if (oRecord.HubKey === oData.ProjectFinInfo[j].HubKey) {
						// oData.ProjectFinInfo[j].HubKey = "";

						var sMessage = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("PGI_Error_DuplicateHub");
						// oRecord["FC_ValueState_StartDt"] = sap.ui.core.ValueState.Error;
						oData.ProjectFinInfo[j].ValueState_HubKey = sap.ui.core.ValueState.Error;
						oData.ProjectFinInfo[j].ValueStateText_HubKey = sMessage;
						MessageToast.show(sMessage);
						return false;
					}
				}

			}
			return true;
		},
		onSave: function(oEvent) {
			var that = this;
			this.saveAction = oEvent.getSource().getId();
			console.log("Save Action:" + this.saveAction);
			var oModel = this.getModel("PGI");

			var oData = this.getModel("PGI").getData();
			if (this.onValidate(oData)) {
				// oModel.refresh(false);
				if (oData.CurrentMode === "Create") {
					this.createProject();
				} else if (oData.CurrentMode === "Edit") {
					this.updateProjectBatch();
				}
			}
			oModel.refresh(false);

		},
		// onSaveClose: function(oEvent) {

		// },
		_checkIfBatchRequestSucceeded: function(oEvent) {
			var oParams = oEvent.getParameters();
			var aRequests = oEvent.getParameters().requests;
			var oRequest;
			if (oParams.success) {
				if (aRequests) {
					for (var i = 0; i < aRequests.length; i++) {
						oRequest = oEvent.getParameters().requests[i];
						if (!oRequest.success) {
							return false;
						}
					}
				}
				return true;
			} else {
				return false;
			}
		},

		/**
		 * Event handler (attached declaratively) for the view cancel button. Asks the user confirmation to discard the changes. 
		 * @function
		 * @public
		 */
		onCancel: function() {
			// check if the model has been changed
			var pgiData = this.getModel("PGI").getData();
			var dataChanged = false;
			if (pgiData.CurrentMode === "Display") {
				this._navBack();
				return;
			}
			dataChanged = this.checkForChanges(pgiData);
			// if (pgiData.CurrentMode === "Edit")
			// {
			// }
			if (dataChanged) {
				this._showConfirmQuitChanges();
			} else {
				this._navBack();
			}
			// if (this.getModel().hasPendingChanges()) {
			// 	// get user confirmation first
			// 	this._showConfirmQuitChanges(); // some other thing here....
			// } else {
			// 	this.getModel("appView").setProperty("/addEnabled", true);
			// 	// cancel without confirmation
			// 	this._navBack();
			// }
		},
		checkForChanges: function(pgiData) {
			var ppmData = this.getModel("PGI").getData();
			var orgRecord = {};
			if (pgiData.CurrentMode === "Edit") {
				orgRecord = ppmData.Project;
			}
			var modRecord = pgiData.Project;

			if (pgiData.CurrentMode === "Edit") {
				var fields = ["ItemDesc", "BrandKey", "CategoryKey", "CurrencyKey", "DivisionKey", "FinamanagerKey", "HubKey",
					"InnovationKey", "ItemtypeKey", "PhaseKey", "PhasestatusKey", "ProjecttypeKey", "ProjmanagerKey", "StarfoKey", "SubbrandKey",
					"SubcategoryKey", "PlannedFinish", "StartDate", "LaunchDate"
				];

				for (var i = 0; i < fields.length; i++) {
					if (orgRecord[fields[i]] !== modRecord[fields[i]])
						return true;
				}
			} else if (pgiData.CurrentMode === "Create") {
				var fields = ["ItemDesc", "BrandKey", "CategoryKey", "CurrencyKey", "DivisionKey", "FinamanagerKey", "HubKey",
					"InnovationKey", "ItemtypeKey", "PhaseKey", "PhasestatusKey", "ProjecttypeKey", "ProjmanagerKey", "StarfoKey", "SubbrandKey",
					"SubcategoryKey"
				];
				for (var i = 0; i < fields.length; i++) {
					if (orgRecord[fields[i]] !== "")
						return true;
				}
			}

			for (var i = 0; i < pgiData.ProjectFinInfo.length; i++) {
				var currentRow = pgiData.ProjectFinInfo[i];
				if (currentRow.mode === "Add" || currentRow.mode === "Delete")
					return true;

				if (this.checkForFinChanges(currentRow, ppmData))
					return true;
			}

			return false;
		},
		/* =========================================================== */
		/* Internal functions
		/* =========================================================== */
		/**
		 * Navigates back in the browser history, if the entry was created by this app.
		 * If not, it navigates to the Details page
		 * @private
		 */
		_navBack: function() {
			var oHistory = sap.ui.core.routing.History.getInstance(),
				sPreviousHash = oHistory.getPreviousHash();
			this.saveAction = "";
			this.getView().unbindObject();
			if (sPreviousHash !== undefined) {
				// The history contains a previous entry
				history.go(-1);
			} else {
				this.getRouter().getTargets().display("object");
			}
		},

		/**
		 * Opens a dialog letting the user either confirm or cancel the quit and discard of changes.
		 * @private
		 */
		_showConfirmQuitChanges: function() {
			var oComponent = this.getOwnerComponent(),
				oModel = this.getModel();
			var that = this;
			MessageBox.confirm(
				this._oResourceBundle.getText("confirmCancelMessage"), {
					styleClass: oComponent.getContentDensityClass(),
					onClose: function(oAction) {
						if (oAction === sap.m.MessageBox.Action.OK) {
							// that.getModel("appView").setProperty("/addEnabled", true);
							// oModel.resetChanges();
							that._navBack();
						}
					}
				}
			);
		},
		getPhases: function() {
			var oModel = sap.ui.getCore().getModel("PPM");
			var oData = oModel.getData();
			var ppmData = sap.ui.getCore().getModel("PPMData").getData();
			if (!ppmData || !ppmData.VHPhases) {
				var sPath = "/VHPhases";
				var oExclude = {};
				var oFilters = [];
				var that = this;
				oModel.read(sPath, {
					async: true,
					filters: oFilters,
					success: function(oDataIn, oResponse) {
						console.log("Success in reading" + sPath);
						that.setPhases(that, oDataIn);
					},
					error: function(oError) {
						console.error("Error in reading:" + sPath + ": + oError");
						//oError.ErrorOrigin = "MasterDataLoad";
						//sap.ui.getCore().getEventBus().publish("colgate.asm.planning.project", "Errors", oError);
					}
				});
			}
		},
		setPhases: function(oContext, oDataIn) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			ppmData.VHPhases = oDataIn.results;
			oModel.refresh(false);
		},
		getMarketingObjective: function() {

			var oModel = sap.ui.getCore().getModel("PPM");
			var oData = oModel.getData();
			var ppmData = sap.ui.getCore().getModel("PPMData").getData();
			if (!ppmData || !ppmData.VHMarketing) {
				var sPath = "/VHMarketing";
				// TODO: psutram comment the next line and uncoment  the rest of the line
				this.setMarketingObjective(this, null);
				// var oExclude = {};
				// var oFilters = [];
				// var that = this;
				// oModel.read(sPath, {
				// 	async: true,
				// 	filters: oFilters,
				// 	success: function(oDataIn, oResponse) {
				// 		console.log("Success in reading" + sPath);
				// 		that.setMarketingObjective(that, oDataIn);
				// 	},
				// 	error: function(oError) {
				// 		console.error("Error in reading:" + sPath + ": + oError");
				// 		//oError.ErrorOrigin = "MasterDataLoad";
				// 		//sap.ui.getCore().getEventBus().publish("colgate.asm.planning.project", "Errors", oError);
				// 	}
				// });

			}

		},
		setMarketingObjective: function(oContext, oDataIn) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			// TODO: psutram uncomment the next line and remove the hard coded values
			// ppmData.VHMarketing = oDataIn.results;

			var marketing = [{
				"Key": "0001",
				"Description": "Penetration"
			}, {
				"Key": "0002",
				"Description": "Loyalty"
			}, {
				"Key": "0003",
				"Description": "Consumption"
			}];
			ppmData.VHMarketing = marketing;

			oModel.refresh(false);

		},
		getTechnology: function() {
			var oModel = sap.ui.getCore().getModel("PPM");
			var oData = oModel.getData();
			var ppmData = sap.ui.getCore().getModel("PPMData").getData();
			if (!ppmData || !ppmData.VHTechnology) {
				var sPath = "/VHTechnology";
				var oExclude = {};
				var oFilters = [];
				var that = this;
				oModel.read(sPath, {
					async: true,
					filters: oFilters,
					success: function(oDataIn, oResponse) {
						console.log("Success in reading" + sPath);
						that.setTechnology(that, oDataIn);
					},
					error: function(oError) {
						console.error("Error in reading:" + sPath + ": + oError");
						//oError.ErrorOrigin = "MasterDataLoad";
						//sap.ui.getCore().getEventBus().publish("colgate.asm.planning.project", "Errors", oError);
					}
				});
			}

		},
		setTechnology: function(oContext, oDataIn) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			ppmData.VHTechnology = oDataIn.results;
			oModel.refresh(false);

		},
		getCurrencies: function() {
			var oModel = sap.ui.getCore().getModel("PPM");
			var oData = oModel.getData();
			var ppmData = sap.ui.getCore().getModel("PPMData").getData();
			if (!ppmData || !ppmData.VHCurrency) {
				var sPath = "/VHCurrencies";
				var oExclude = {};
				var oFilters = [];
				var that = this;
				oModel.read(sPath, {
					async: true,
					filters: oFilters,
					success: function(oDataIn, oResponse) {
						console.log("Success in reading" + sPath);
						that.setCurrencies(that, oDataIn);
					},
					error: function(oError) {
						console.error("Error in reading:" + sPath + ": + oError");
						//oError.ErrorOrigin = "MasterDataLoad";
						//sap.ui.getCore().getEventBus().publish("colgate.asm.planning.project", "Errors", oError);
					}
				});
			}
		},
		setCurrencies: function(oContext, oDataIn) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			ppmData.VHCurrency = oDataIn.results;
			oModel.refresh(false);
		},
		getCategories: function() {
			var oModel = sap.ui.getCore().getModel("PPM");
			var oData = oModel.getData();
			var ppmData = sap.ui.getCore().getModel("PPMData").getData();
			if (!ppmData || !ppmData.VHCategories) {
				var sPath = "/VHCategories";
				var oExclude = {};
				var oFilters = [];
				var that = this;
				oModel.read(sPath, {
					async: true,
					filters: oFilters,
					success: function(oDataIn, oResponse) {
						console.log("Success in reading" + sPath);
						that.setCategoriesData(that, oDataIn);
					},
					error: function(oError) {
						console.error("Error in reading:" + sPath + ": + oError");
						//oError.ErrorOrigin = "MasterDataLoad";
						//sap.ui.getCore().getEventBus().publish("colgate.asm.planning.project", "Errors", oError);
					}
				});
			}
		},
		setCategoriesData: function(oContext, oDataIn) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			ppmData.VHCategories = oDataIn.results;
			oModel.refresh(false);
		},

		getDivisions: function() {
			var oModel = sap.ui.getCore().getModel("PPM");
			var oData = oModel.getData();
			var ppmData = sap.ui.getCore().getModel("PPMData").getData();
			if (!ppmData || !ppmData.VHDivisions) {
				var sPath = "/VHDivisions";
				var oExclude = {};
				var oFilters = [];
				var that = this;
				oModel.read(sPath, {
					async: true,
					filters: oFilters,
					success: function(oDataIn, oResponse) {
						console.log("Success in reading" + sPath);
						that.setDivisionsData(that, oDataIn);
					},
					error: function(oError) {
						console.error("Error in reading:" + sPath + ": + oError");
						//oError.ErrorOrigin = "MasterDataLoad";
						//sap.ui.getCore().getEventBus().publish("colgate.asm.planning.project", "Errors", oError);
					}
				});
			}
		},
		setDivisionsData: function(oContext, oDataIn) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			ppmData.VHDivisions = oDataIn.results;
			oModel.refresh(false);
		},
		onChangeFinHub: function(oEvent) {
			var sChanged = oEvent.getSource().getId();
			if (!oEvent.getParameters().selectedItem) {
				oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
				return;
			} else {
				oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
			}
			var pgiModel = this.getModel("PGI");
			var pgiData = pgiModel.getData();
			var sPath = oEvent.getSource().getBindingContext("PGI").getPath();
			var oRowData = pgiModel.getProperty(sPath);

			if (parseFloat(oRowData.SerialNo) === 1) {
				pgiData.Project.HubKey = oRowData.HubKey;
			}
// INBHD02
			var count = pgiData.ProjectFinCount - 1;
			var ProjectFinInfo = pgiData.ProjectFinInfo[count];
			if (count === 0) {
				this.addFinHub(oEvent);
			} else if (ProjectFinInfo.HubKey !== '') {
				this.addFinHub(oEvent);
			}
// INBHD02
		},
		deleteFinInfoRow: function(oEvent) {
			var pgiModel = this.getModel("PGI");
			var pgiData = pgiModel.getData();
			var sPath = oEvent.getSource().getBindingContext("PGI").getPath();
			var oRowData = pgiModel.getProperty(sPath);
			if (oRowData.rowMode === "Edit") {
				oRowData.rowMode = "Delete";
				var aFilters = [];
				var oFilter = new sap.ui.model.Filter("rowMode", sap.ui.model.FilterOperator.NE, "Delete");
				aFilters.push(oFilter);
				var fragmentId = this.getView().createId("general");
				var oTable = sap.ui.core.Fragment.byId(fragmentId, "FinItemsList");
				oTable.getBinding("rows").filter(aFilters);
			} else {
				var i = parseFloat(sPath.substr(sPath.lastIndexOf("/") + 1));
				pgiData.ProjectFinInfo.splice(i, 1);
				// pgiData.ProjectFinInfo.pop(oRowData);
			}
			pgiData.ProjectFinCount = pgiData.ProjectFinInfo.length;
			// sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.projectdetail", "updateFinInfoRowCount", {});
			var that = this;
			setTimeout(function() {
				that.updateFinInfoRowCount();
			}, 200);
			pgiModel.refresh(false);

		},
		updateFinInfoRowCount: function() {
			var pgiModel = this.getModel("PGI");
			var pgiData = pgiModel.getData();
			var fragmentId = this.getView().createId("general");
			var oTable = sap.ui.core.Fragment.byId(fragmentId, "FinItemsList");
			// pgiData.ProjectFinCount = oTable._getRowCount();
			pgiData.ProjectFinCount = oTable._getTotalRowCount();	//upgrade		
			pgiModel.refresh(false);
		},
		onDataChange: function(oEvent) {
			// var oField = oEvent.getSource();
			// // var sCurrentValue = oEvent.getParameters().value;
			// var oRecord = this.getModel("PGI").getProperty(oField.getParent().getBindingContext("PGI").sPath);
			// oRecord[oField.getBindingInfo("valueState").binding.getPath()] = sap.ui.core.ValueState.None;
			// oRecord[oField.getBindingInfo("valueStateText").binding.getPath()] = "";

			// this.getModel("PGI").refresh(false);
		},
		onHeaderChange: function(oEvent) {
			console.log("ProjectDetails: onHeaderChange");
			var oField = oEvent.getSource();
			var sCurrentValue = oEvent.getParameters().value;
			if (oField.getId().includes("Freeze")) {
				sCurrentValue = sCurrentValue.replace("%", "");
			}
			sCurrentValue = sCurrentValue.replace(" ", "");
			// var oRecord = this.getModel("PGI").getProperty("/OnScreenParent");
			// psutram27
			// var finFragmentId = this.getView().createId("fin");
			// var oTable = sap.ui.core.Fragment.byId(finFragmentId, "lineItemsList");
			// var selectedRow = oTable.getSelectedIndex ();
			// var sPath = oTable.getContextByIndex(oTable.getSelectedIndex ()).getPath();
			// var oRecord = JSON.parse(JSON.stringify(this.getModel("PGI").getProperty(sPath)));

			var bNumber = /^-*[0-9,\.]+$/.test(sCurrentValue);
			if (sCurrentValue !== "" && !bNumber) {
				// PSW Start Correction for Budget entry errored on non numeric value June 13th 2016	
				oField.setValue("0");
				// PSW End Correction for Budget entry errored on non numeric value June 13th 2016

				// oRecord[oField.getBindingInfo("valueState").binding.getPath()] = sap.ui.core.ValueState.Error;
				// oRecord[oField.getBindingInfo("valueState").binding.getPath()] = sap.ui.core.ValueState.Warning;
				// oRecord[oField.getBindingInfo("valueStateText").binding.getPath()] = this.getOwnerComponent().getModel("i18n").getResourceBundle()
				// .getText("PFI_InvalidEntry", [sCurrentValue]);
			}
			// else {
			// 	// if (this._validateInput(oRecord)) {
			// 		// oRecord[oField.getBindingInfo("valueState").binding.getPath()] = sap.ui.core.ValueState.None;
			// 		// oRecord[oField.getBindingInfo("valueStateText").binding.getPath()] = "";
			// 	// }
			// }
			this.getModel("PGI").refresh(false);
		},
		onFinInfoEnter: function(oEvent) {
			var params = oEvent.getParameters();
			console.log("onEnter event");
			var oField = oEvent.getSource();
			var sId = oField.getId();
			// if (sId.includes("PFinNetSales"))
			// {
			// 	var oCustomInteger = sap.ui.core.format.NumberFormat.getIntegerInstance({
			// 								groupingEnabled: true,
			// 								groupingSeparator: ","
			// 							});
			// 	var org = 	oField.getValue();
			// 	console.log("Formatted value:" + oCustomInteger.format(org));
			// 	oField.setValue(oCustomInteger.format(org));
			// }
			if (oField.getValue() === "") {
				oField.setValue(0);
			}
			var bFocusSet = false;
			var aCells = oField.getParent().getCells();
			var sFieldName = oField.getBindingInfo("value").parts[0].path;
			var bFieldFound = false;
			var firstEditableField = -1;
			for (var i = 0; i < aCells.length; i++) {
				if (firstEditableField === -1 && aCells[i].getMetadata()._sClassName === "sap.m.Input" &&
					aCells[i].getBindingInfo("editable")) {
					firstEditableField = i;
				}
				if (bFieldFound) {
					if (aCells[i].getMetadata()._sClassName === "sap.m.Input" &&
						aCells[i].getBindingInfo("editable") &&
						this.getModel("PGI").getProperty(aCells[i].getBindingInfo("editable").parts[0].path)) {
						aCells[i].focus();
						bFocusSet = true;
						i = aCells.length;
					}
				}
				if (!bFieldFound && aCells[i].getMetadata()._sClassName === "sap.m.Input" &&
					aCells[i].getBindingInfo("value") &&
					aCells[i].getBindingInfo("value").parts[0] &&
					aCells[i].getBindingInfo("value").parts[0].path ===
					sFieldName) {
					bFieldFound = true;
				}
			}
			if (!bFocusSet) {
				var oRow = oField.getParent();
				var oTable = oRow.getParent();
				var aRows = oTable.getRows();
				var selectedIndex = oTable.getSelectedIndex();
				console.log("Selected Index:" + selectedIndex);
				var iRowIndex = 0;
				// for (var j = 0; j < aRows.length; j++) {
				// 	if (aRows[j] === oRow) {
				// 		iRowIndex = j + 1;
				// 		j = aRows.length;
				// 	}
				// }
				if (iRowIndex < aRows.length) {
					var k = selectedIndex + 1;
					var aRowCells = aRows[k].getCells();
					aRowCells[firstEditableField].focus();
					bFocusSet = true;
				}
				// for (var k = iRowIndex; k < aRows.length; k++) {
				// 	if (this.getModel("Project").getProperty(aRows[k].getBindingContext("Project").sPath).ItemType !== "PT") {
				// 		var aRowCells = aRows[k].getCells();
				// 		for (var l = 0; l < aRowCells.length; l++) {
				// 			if (aRowCells[l].getMetadata()._sClassName === "sap.m.Input" &&
				// 				aRowCells[l].getBindingInfo("editable") &&
				// 				this.getModel("Project").getProperty(aRows[k].getBindingContext("Project").sPath)[aRowCells[l].getBindingInfo("editable").parts[
				// 					0].path]) {
				// 				aRowCells[l].focus();
				// 				l = aRowCells.length;
				// 				bFocusSet = true;
				// 			}
				// 		}
				// 		if (bFocusSet) {
				// 			k = aRows.length;
				// 		}
				// 	}
				// }
			}

		},
		onProjectTypeQuestionnaire: function(oEvent) {
			QuestionnaireUtil.displayQuestionnaire(this);
		},
		onChange: function(oEvent) {
			var sChanged = oEvent.getSource().getId();
			var aParts = sChanged.split("--");
			sChanged = aParts[aParts.length - 1];
			var pgiData = this.getModel("PGI").getData();

			var bValid = oEvent.getParameter("valid");

			if (!oEvent.getParameters().selectedItem) {
				oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
			} else {
				oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
			}

			if (sChanged === "Category") {
				pgiData.Project.SubcategoryKey = "";
				pgiData.Project.BrandKey = "";
				pgiData.Project.SubbrandKey = "";

				this.getSubCategories();
			} else if (sChanged === "SubCategory") {
				pgiData.Project.BrandKey = "";
				pgiData.Project.SubbrandKey = "";
				this.getBrands();
			} else if (sChanged === "Brand") {
				pgiData.Project.SubbrandKey = "";
				this.getSubBrands();
			} else if (sChanged === "PGIDivision") {
				this.getHubs();
				var pgiData = this.getModel("PGI").getData();
				if (pgiData && pgiData.ProjectFinInfo && pgiData.ProjectFinInfo.length === 0) {
					this.addFinHub(oEvent);
				} else {
					for (var i = 0; i < pgiData.ProjectFinInfo.length; i++) {
						pgiData.ProjectFinInfo[i].DivisionKey = pgiData.Project.DivisionKey;
						pgiData.ProjectFinInfo[i].HubKey = "";
					}
				}
			} else if (sChanged === "Phase") {
				pgiData.Project.PhasestatusKey = "";
				this.getVHStatus();
				// } else if (sChanged === "Technology" || sChanged === "ConsPers") {
				// 	this.getInnovationType();
			} else if (sChanged === "Status") {
				if (pgiData.Project.PhasestatusKey === "IM001" || pgiData.Project.PhasestatusKey === "IM004") {
					this.configRequiredColumnFinInfo(true);
				} else {
					this.configRequiredColumnFinInfo(false);
				}
			}
			this.getModel("PGI").refresh(false);
		},
		getVHStatus: function() {
			var oBaseModel = sap.ui.getCore().getModel("PPM");

			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();
			var phaseKey = pgiData.Project.PhaseKey;
			if (phaseKey === "") {
				return;
			}
			if (!ppmData.VHStatus) {
				ppmData.VHStatus = {};
			}
			// if (ppmData.VHStatus[phaseKey])
			// {
			// 	ppmData.VHStatus.Current = ppmData.VHStatus[phaseKey];	
			// 	oModel.refresh (false);
			// }
			// else
			// {
			var filters = [];
			filters.push(new sap.ui.model.Filter("RpmGuidC", sap.ui.model.FilterOperator.EQ, pgiData.Project.RpmGuidC));
			filters.push(new sap.ui.model.Filter("PhaseId", sap.ui.model.FilterOperator.EQ, phaseKey));
			// filters.push(new sap.ui.model.Filter( "RpmGuid",sap.ui.model.FilterOperator.EQ, "binary\'" + pgiData.Project.RpmGuid + "\'"));
			var sPath = "/VHStatus";
			this.getOwnerComponent().getModel("masterShared").setProperty("/oDetailBusy/busy", true); // Start Spinner
			var that = this;
			oBaseModel.read(sPath, {
				async: true,
				filters: filters,
				success: function(oDataIn, oResponse) {
					that.setVHStatus(that, oDataIn, phaseKey);
				},
				error: function(oError) {
					oError.ErrorOrigin = "VHStatus";
					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
				}
			});
			// }

		},
		setVHStatus: function(oContext, oDataIn, phaseKey) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			if (!ppmData.VHStatus) {
				ppmData.VHStatus = {};
				ppmData.VHStatus.Current = {};
			}
			ppmData.VHStatus.Current = oDataIn.results;
			ppmData.VHStatus[phaseKey] = oDataIn.results;
			oModel.refresh(false);
		},
		getSubBrands: function() {
			var oBaseModel = sap.ui.getCore().getModel("PPM");

			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();
			var categoryKey = pgiData.Project.CategoryKey;
			var subCategoryKey = pgiData.Project.SubcategoryKey;
			var brandKey = pgiData.Project.BrandKey;

			if (!ppmData.VHSubBrands) {
				ppmData.VHSubBrands = {};
			}
			if (ppmData.VHSubBrands[brandKey]) {
				ppmData.VHSubBrands.Current = ppmData.VHSubBrands[brandKey];
				oModel.refresh(false);
			}
			var filters = [];
			filters.push(new sap.ui.model.Filter({
				path: "Category",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: categoryKey
			}));
			filters.push(new sap.ui.model.Filter({
				path: "PSubCategory",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: subCategoryKey
			}));
			filters.push(new sap.ui.model.Filter({
				path: "Brand",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: brandKey
			}));
			var sPath = "/VHSubbrands";
			this.getOwnerComponent().getModel("masterShared").setProperty("/oDetailBusy/busy", true); // Start Spinner
			var that = this;
			oBaseModel.read(sPath, {
				async: true,
				filters: filters,
				success: function(oDataIn, oResponse) {
					that.setSubbrands(that, oDataIn, brandKey);
				},
				error: function(oError) {
					oError.ErrorOrigin = "Subbrands";
					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
				}
			});
		},
		setSubbrands: function(oContext, oDataIn, brandKey) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			if (!ppmData.VHSubBrands) {
				ppmData.VHSubBrands = {};
				ppmData.VHSubBrands.Current = {};
			}
			ppmData.VHSubBrands.Current = oDataIn.results;
			ppmData.VHSubBrands[brandKey] = oDataIn.results;
			oModel.refresh(false);
		},
		getBrands: function() {
			var oBaseModel = sap.ui.getCore().getModel("PPM");

			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();
			var categoryKey = pgiData.Project.CategoryKey;
			var subCategoryKey = pgiData.Project.SubcategoryKey;

			if (!ppmData.VHBrands) {
				ppmData.VHBrands = {};
			}
			if (ppmData.VHBrands[subCategoryKey]) {
				ppmData.VHBrands.Current = ppmData.VHBrands[subCategoryKey];
				oModel.refresh(false);
			}
			var filters = [];
			filters.push(new sap.ui.model.Filter({
				path: "Category",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: categoryKey
			}));
			filters.push(new sap.ui.model.Filter({
				path: "PSubCategory",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: subCategoryKey
			}));
			var sPath = "/VHBrands";
			var that = this;
			oBaseModel.read(sPath, {
				async: true,
				filters: filters,
				success: function(oDataIn, oResponse) {
					that.setBrands(that, oDataIn, subCategoryKey);
				},
				error: function(oError) {
					oError.ErrorOrigin = "Brands";
					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
				}
			});
		},
		setBrands: function(oContext, oDataIn, subCategoryKey) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			if (!ppmData.VHBrands) {
				ppmData.VHBrands = {};
				ppmData.VHBrands.Current = {};
			}
			ppmData.VHBrands.Current = oDataIn.results;
			ppmData.VHBrands[subCategoryKey] = oDataIn.results;
			oModel.refresh(false);
		},
		getSubCategories: function() {
			var oBaseModel = sap.ui.getCore().getModel("PPM");

			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();
			var categoryKey = pgiData.Project.CategoryKey;
			if (!ppmData.VHSubCategories) {
				ppmData.VHSubCategories = {};
			}
			if (ppmData.VHSubCategories[categoryKey]) {
				ppmData.VHSubCategories.Current = ppmData.VHSubCategories[categoryKey];
				oModel.refresh(false);
			} else {
				var oFilters = [];

				oFilters.push(new sap.ui.model.Filter({
					path: "Category",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: categoryKey
				}));

				var sPath = "/VHSubcategories";
				var that = this;
				oBaseModel.read(sPath, {
					async: true,
					filters: oFilters,
					success: function(oDataIn, oResponse) {
						that.setSubcategories(that, oDataIn, categoryKey);
					},
					error: function(oError) {
						oError.ErrorOrigin = "Brands";
						sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
					}
				});
			}
		},
		setSubcategories: function(oContext, oDataIn, categoryKey) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			if (!ppmData.VHSubCategories) {
				ppmData.VHSubCategories = {};
				ppmData.VHSubCategories.Current = {};
			}
			ppmData.VHSubCategories.Current = oDataIn.results;
			ppmData.VHSubCategories[categoryKey] = oDataIn.results;
			oModel.refresh(false);
		},
		getVHConsumerDiffs: function() {
			var oBaseModel = sap.ui.getCore().getModel("PPM");
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();
			if (!ppmData.VHConsumerDiffs) {
				ppmData.VHConsumerDiffs = {};
			}
			var oFilters = [];

			var sPath = "/VHConsumerDiffs";
			var that = this;
			oBaseModel.read(sPath, {
				async: true,
				filters: oFilters,
				success: function(oDataIn, oResponse) {
					that.setVHConsumerDiffs(that, oDataIn);
				},
				error: function(oError) {
					oError.ErrorOrigin = "Brands";
					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
				}
			});
		},
		setVHConsumerDiffs: function(oContext, oDataIn) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			if (!ppmData.VHConsumerDiffs) {
				ppmData.VHConsumerDiffs = {};
			}
			ppmData.VHConsumerDiffs = oDataIn.results;
			oModel.refresh(false);
		},
		getHubs: function() {
			var oBaseModel = sap.ui.getCore().getModel("PPM");

			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();
			var divisionKey = pgiData.Project.DivisionKey;
			if (!ppmData.VHHubs) {
				ppmData.VHHubs = {};
			}
			if (ppmData.VHHubs[divisionKey]) {
				ppmData.VHHubs.Current = ppmData.VHHubs[divisionKey];
				oModel.refresh(false);
			} else {
				var oFilters = [];

				oFilters.push(new sap.ui.model.Filter({
					path: "DivisionKey",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: divisionKey
				}));

				var sPath = "/VHHubs";
				var that = this;
				oBaseModel.read(sPath, {
					async: true,
					filters: oFilters,
					success: function(oDataIn, oResponse) {
						that.setHubs(that, oDataIn, divisionKey);
					},
					error: function(oError) {
						oError.ErrorOrigin = "Brands";
						sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
					}
				});
			}
		},
		getInnovationType: function() {
			var oBaseModel = sap.ui.getCore().getModel("PPM");

			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();
			// var conprediff = pgiData.Project.ConprediffKey;
			// var tobmuKey = pgiData.Project.TobmuKey;
			// if (conprediff !== undefined && tobmuKey !== undefined && conprediff !== "" && tobmuKey !== "") {
			// 	var oFilters = [];
			// 	oFilters.push(new sap.ui.model.Filter({
			// 		path: "ZimConprediff",
			// 		operator: sap.ui.model.FilterOperator.EQ,
			// 		value1: conprediff
			// 	}));
			// 	oFilters.push(new sap.ui.model.Filter({
			// 		path: "ZimTobmu",
			// 		operator: sap.ui.model.FilterOperator.EQ,
			// 		value1: tobmuKey
			// 	}));

			var sPath = "/VHInnovationTypes";
			var that = this;
			oBaseModel.read(sPath, {
				async: true,
				// filters: oFilters,
				success: function(oDataIn, oResponse) {
					// that.setHubs(that, oDataIn, divisionKey);
					if (oDataIn.results.length > 0) {
						pgiData.Project.InnovationKey = oDataIn.results[0].Key;
						pgiData.Project.InnovationTypeDesc = oDataIn.results[0].InnovationDesc;
						ppmData.VHInnovationTypes = oDataIn.results;

						oModel.refresh(false);
						pgiModel.refresh(false);
					}
				},
				error: function(oError) {
					oError.ErrorOrigin = "Brands";
					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
				}
			});
			// }
		},
		setHubs: function(oContext, oDataIn, divisionKey) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			if (!ppmData.VHHubs) {
				ppmData.VHHubs = {};
				ppmData.VHHubs.Current = {};
			}

			ppmData.VHHubs.Current = IPMUtils.filterHubData(oDataIn.results);
			ppmData.VHHubs[divisionKey] = IPMUtils.filterHubData(oDataIn.results);
			oModel.refresh(false);
		},
		onPMgrSuggest: function(event) {
			var value = event.getParameter("suggestValue");

			var oBaseModel = sap.ui.getCore().getModel("PPM");

			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();

			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();

			if (event.getSource().getId().match("PMgr")) {
				pgiData.Project.ProjmanagerKey = "";
			} else if (event.getSource().getId().match("FMgr")) {
				pgiData.Project.FinamanagerKey = "";
			}

			var oFilters = [];

			oFilters.push(new sap.ui.model.Filter({
				path: "Key",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: value
			}));

			var sPath = "/VHManagers";
			var that = this;
			oBaseModel.read(sPath, {
				async: true,
				filters: oFilters,
				success: function(oDataIn, oResponse) {
					ppmData.VHManagers = oDataIn.results;
					oModel.refresh(false);
				},
				error: function(oError) {
					oError.ErrorOrigin = "VHManagers";
					// sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
				}
			});
		},
		onPMgrSearch: function(oEvent) {
			// if (oEvent.getSource())
			console.log("onPMgrSearch");
			var oSource = oEvent.getSource();
			var fragmentId = this.getView().createId("general");
			var oComboBox;
			if (oSource.getId().includes("PMgrSearch")) {
				oComboBox = sap.ui.core.Fragment.byId(fragmentId, "PMgr");
			} else if (oSource.getId().includes("FMgrSearch")) {
				oComboBox = sap.ui.core.Fragment.byId(fragmentId, "FMgr");
			}
			MgrUtils.onMgrShow(oEvent, this.getModel("PPMData"), this.getModel("i18n"), oComboBox);
		},
		onSuggestSelected: function(oEvent) {
			var params = oEvent.getParameters();
			var mgrKey = params.selectedItem.getKey();
			var text = params.selectedItem.getText();
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();

			if (oEvent.getSource().getId().match("PMgr")) {
				pgiData.Project.ProjmanagerKey = mgrKey;
			} else if (oEvent.getSource().getId().match("FMgr")) {
				pgiData.Project.FinamanagerKey = mgrKey;
			}

		},
		getItemInfo: function(rpmGuidC) {
			var oBaseModel = sap.ui.getCore().getModel("PPM");
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();

			var oFilters = [];
			// sPath = "/Initiatives(RpmGuid=binary\'" + rpmGuid + "\',IniGuid=binary\'" +  iniGuid + "\')/ItemListSet";
			// ItemsList(RpmGuid=binary'005056A2473E1ED787F0E49EE7F477CA',RpmGuidC='')/ItemFinancialInfoSet
			// ?$expand=ItemFinancialInfoSet
			// var sPath = "/ItemsList(RpmGuid=binary\'" + rpmGuidC + "\',RpmGuidC=\'\')/ItemFinancialInfoSet";
			// var sPath = "/ItemsList(RpmGuid=binary\'" + rpmGuidC + "\',RpmGuidC=\'\')?$expand=ItemFinancialInfoSet";
			// var sPath = "/ItemsList(RpmGuid=binary'005056A2473E1EE78C9C5258B15C6CD6',RpmGuidC='')?$expand=ItemFinancialInfoSet";

			// Expand included in the URL Parameters  
			var sPath = "/ItemsList(RpmGuid=binary\'" + rpmGuidC + "\',RpmGuidC=\'\')";
			var that = this;
			oBaseModel.read(sPath, {
				async: true,
				urlParameters: {
					"$expand": "ItemFinancialInfoSet,ItemQuesAnswerSet"
				},
				// filters: oFilters,
				success: function(oDataIn, oResponse) {
					that.setItemInfo(that, oDataIn);
				},
				error: function(oError) {
					oError.ErrorOrigin = "ItemFinancialInfoSet";
					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
				}
			});

		},
		setItemInfo: function(oContext, oDataIn) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();
			ppmData.Project = oDataIn;
			this.setItemFinInfo(oContext, oDataIn.ItemFinancialInfoSet);
			this.setItemQuesAnswer(oContext, oDataIn.ItemQuesAnswerSet);
			// ppmData.ProjectFinInfo = oDataIn.ItemFinancialInfoSet.results;
			// ppmData.ProjectFinInfo = oDataIn.ItemQuesAnswerSet.results;

			this.configureStatusOptions(ppmData);

			var sProject = JSON.stringify(oDataIn) + "";
			//pgiData.Project = JSON.parse(sProject);
			pgiData.Project = Object.assign({}, oDataIn);
			if (pgiData.Project.ZimGrid === "1") {
				pgiData.Project.Grid = true;
			} else {
				pgiData.Project.Grid = false;
			}
			pgiData.Project.StartDate = new Date(DateUtils.getSystemAdjISODate_fromDate(oDataIn.StartDate));

			pgiData.Project.LaunchDate = new Date(DateUtils.getSystemAdjISODate_fromDate(oDataIn.LaunchDate));
			// pgiData.Project.LaunchDate = oDataIn.LaunchDate;
			// pgiData.Project.PlannedFinish = new Date (DateUtils.getSystemAdjISODate_fromDate (oDataIn.PlannedFinish));
			pgiData.Project.CreatedDate = new Date(DateUtils.getSystemAdjISODate_fromDate(oDataIn.CreatedDate));
			pgiData.Project.LastupdateDate = new Date(DateUtils.getSystemAdjISODate_fromDate(oDataIn.LastupdateDate));

			console.log("Retrieve: Start Date:" + pgiData.Project.StartDate);
			console.log("Retrieve: Planned Finish:" + pgiData.Project.PlannedFinish);
			console.log("Retrieve: Launch Date:" + pgiData.Project.LaunchDate);

			// pgiData.Project.BrandKey = ppmData.Project.BrandKey.substring(1);
			// pgiData.ProjectFinInfo = JSON.parse(JSON.stringify(ppmData.ProjectFinInfo));

			// ppmData.ProjectFinInfo = oDataIn.results;
			// pgiData.ProjectFinInfo = JSON.parse(JSON.stringify(oDataIn.results));
			/*
			pgiData.ProjectFinInfo = ppmData.ProjectFinInfo;

						for (var i = 0; i < pgiData.ProjectFinInfo.length; i++) {
							// pgiData.ProjectFinInfo[i].SerialNo = i;
							// ppmData.ProjectFinInfo[i].SerialNo = i;
							if (pgiData.ProjectFinInfo[i].CurrencyKey === "") {
								pgiData.ProjectFinInfo[i].CurrencyKey = this.getOwnerComponent().getModel("P13n_Configuration").getProperty(
									"/CurrencySettings/Currency");
							}
							var oRecord = pgiData.ProjectFinInfo[i];
							for (var j = 0; j < ppmData.ProjectFinInfo.length; j++) {
								if (oRecord.HubKey === ppmData.ProjectFinInfo[j].HubKey) {
									oRecord.RolloutDate = ppmData.ProjectFinInfo[j].RolloutDate;
									j = ppmData.ProjectFinInfo.length;
								}
							}
							this.addFinInfoAttributes(oRecord, pgiData.Project.HubKey);
						}

						var aSorter = [];
						aSorter.push(new sap.ui.model.Sorter("leadHubIndicator", false, false));

						var fragmentId = this.getView().createId("general");
						var oTable = sap.ui.core.Fragment.byId(fragmentId, "FinItemsList");
						var oBinding = oTable.getBinding("rows");
						oBinding.sort(aSorter);

						var finFragmentId = this.getView().createId("fin");
						oTable = sap.ui.core.Fragment.byId(finFragmentId, "lineItemsList");
						oBinding = oTable.getBinding("rows");
						oBinding.sort(aSorter);
						pgiData.Visible.FinInfoRowCount = pgiData.ProjectFinInfo.length;
						*/

			// if commercialize & complete then Status field is not editable any more
			if (pgiData.Project.PhaseKey === "DIM004" && pgiData.Project.PhasestatusKey === "IM004") {
				pgiData.Editable.Status = false;
			}

			oModel.refresh(false);
			pgiModel.refresh(false);

			if (this.RefreshOnSave) {
				this.RefreshOnSave = false;
				// this.getItemFinInfo();
				// this.getItemQuesAnswer();
				sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStopSpinner", {});
			} else {
				this.configScreen();
				// this.getItemFinInfo();
				// this.getItemQuesAnswer();

				this.getVHStatus();
				this.getHubs();
				this.getSubCategories();
				this.getBrands();
				this.getSubBrands();
				// this.getItemAttachments();
				// this.getItemChangeLogs(true);
				sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStopSpinner", {});
			}

		},
		onTabSelect: function(oEvent) {
			var tabItem = oEvent.getParameter("item");
			var tabKey = oEvent.getParameter("key");
			tabItem = tabItem + "";

			if (tabItem.includes("_attachment")) {
				var pgiModel = this.getView().getModel("PGI");
				var pgiData = pgiModel.getData();
				if (!pgiData.AttachmentLoaded) {
					pgiData.AttachmentLoaded = true;
					this.getItemAttachments();
				}
			} else if (tabItem.includes("_logs")) {
				var pgiModel = this.getView().getModel("PGI");
				var pgiData = pgiModel.getData();
				if (!pgiData.LogsLoaded) {
					pgiData.LogsLoaded = true;
					this.getItemChangeLogs(true);
				}

			}
		},
		getItemQuesAnswer: function() {
			var oBaseModel = sap.ui.getCore().getModel("PPM");
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();

			var oFilters = [];
			var rpmGuidC = pgiData.Project.RpmGuidC;
			var sPath = "/ItemsList(RpmGuid=binary\'" + rpmGuidC + "\',RpmGuidC=\'\')/ItemQuesAnswerSet";

			var that = this;
			oBaseModel.read(sPath, {
				async: true,
				// urlParameters: {
				// 	"$expand": "ItemFinancialInfoSet"
				// },
				// filters: oFilters,
				success: function(oDataIn, oResponse) {
					that.setItemQuesAnswer(that, oDataIn);

				},
				error: function(oError) {
					oError.ErrorOrigin = "ItemFinancialInfoSet";
					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
				}
			});

		},
		setItemQuesAnswer: function(oContext, oDataIn) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();
			ppmData.ItemQuesAnswer = oDataIn.results;
			pgiData.ItemQuesAnswer = oDataIn.results;

			// this.orgFinInfo = JSON.stringify(ppmData.ProjectFinInfo);
		},
		getItemFinInfo: function() {
			var oBaseModel = sap.ui.getCore().getModel("PPM");
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();

			var oFilters = [];
			var rpmGuidC = pgiData.Project.RpmGuidC;
			// sPath = "/Initiatives(RpmGuid=binary\'" + rpmGuid + "\',IniGuid=binary\'" +  iniGuid + "\')/ItemListSet";
			// ItemsList(RpmGuid=binary'005056A2473E1ED787F0E49EE7F477CA',RpmGuidC='')/ItemFinancialInfoSet
			// ?$expand=ItemFinancialInfoSet
			var sPath = "/ItemsList(RpmGuid=binary\'" + rpmGuidC + "\',RpmGuidC=\'\')/ItemFinancialInfoSet";
			// var sPath = "/ItemsList(RpmGuid=binary\'" + rpmGuidC + "\',RpmGuidC=\'\')?$expand=ItemFinancialInfoSet";
			// var sPath = "/ItemsList(RpmGuid=binary'005056A2473E1EE78C9C5258B15C6CD6',RpmGuidC='')?$expand=ItemFinancialInfoSet";

			// Expand included in the URL Parameters  
			// var sPath = "/ItemsList(RpmGuid=binary\'" + rpmGuidC + "\',RpmGuidC=\'\')";
			var that = this;
			oBaseModel.read(sPath, {
				async: true,
				// urlParameters: {
				// 	"$expand": "ItemFinancialInfoSet"
				// },
				// filters: oFilters,
				success: function(oDataIn, oResponse) {
					that.setItemFinInfo(that, oDataIn);
				},
				error: function(oError) {
					oError.ErrorOrigin = "ItemFinancialInfoSet";
					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
				}
			});

		},
		setItemFinInfo: function(oContext, oDataIn) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();
			ppmData.ProjectFinInfo = oDataIn.results;
			pgiData.ProjectFinInfo = oDataIn.results;

			this.orgFinInfo = JSON.stringify(ppmData.ProjectFinInfo);

			for (var i = 0; i < pgiData.ProjectFinInfo.length; i++) {
				// pgiData.ProjectFinInfo[i].SerialNo = i;
				// ppmData.ProjectFinInfo[i].SerialNo = i;
				if (pgiData.ProjectFinInfo[i].CurrencyKey === "") {
					pgiData.ProjectFinInfo[i].CurrencyKey = this.getOwnerComponent().getModel("P13n_Configuration").getProperty(
						"/CurrencySettings/Currency");
				}
				var oRecord = pgiData.ProjectFinInfo[i];

				oRecord.NetSalesEdit = [];
				oRecord.EstimatedSpendAPEdit = [];
				oRecord.EstimatedSpendInsightsEdit = [];
				oRecord.EstimatedDesignEdit = [];
				oRecord.NetSalesEdit[0] = parseFloat(oRecord.NetSales);
				oRecord.EstimatedSpendAPEdit[0] = parseFloat(oRecord.EstimatedSpendAP);
				oRecord.EstimatedSpendInsightsEdit[0] = parseFloat(oRecord.EstimatedSpendInsights);
				oRecord.EstimatedDesignEdit[0] = parseFloat(oRecord.EstimatedDesign);

				// oRecord.RolloutDate = new Date (DateUtils.getSystemAdjISODate_fromDate (ppmData.ProjectFinInfo[j].RolloutDate));
				for (var j = 0; j < ppmData.ProjectFinInfo.length; j++) {
					if (oRecord.HubKey === ppmData.ProjectFinInfo[j].HubKey) {
						// new Date (DateUtils.getSystemAdjISODate_fromDate (currentRow.RolloutDate));
						oRecord.RolloutDate = new Date(DateUtils.getSystemAdjISODate_fromDate(ppmData.ProjectFinInfo[j].RolloutDate));
						console.log("Retrieve Fin Info Rollout Date:" + i + ":" + oRecord.RolloutDate);
						j = ppmData.ProjectFinInfo.length;
					}
				}
				this.addFinInfoAttributes(oRecord, pgiData.Project.HubKey);
				if (pgiData.CurrentMode === "Edit") {
					var finDeleteable = this.checkFinInfoDeletable(oRecord);
					oRecord.PGHub = finDeleteable;
					oRecord.PGRolloutDtEnabled = true;
					if (oRecord.leadHubIndicator !== 1) {
						oRecord.PFinDel = finDeleteable;
					}
				}
			}

			var aSorter = [];
			aSorter.push(new sap.ui.model.Sorter("leadHubIndicator", false, false));

			var fragmentId = this.getView().createId("general");
			var oTable = sap.ui.core.Fragment.byId(fragmentId, "FinItemsList");
			var oBinding = oTable.getBinding("rows");
			oBinding.sort(aSorter);

			var finFragmentId = this.getView().createId("fin");
			oTable = sap.ui.core.Fragment.byId(finFragmentId, "lineItemsList");
			oBinding = oTable.getBinding("rows");
			oBinding.sort(aSorter);
			pgiData.Visible.FinInfoRowCount = pgiData.ProjectFinInfo.length;

			oModel.refresh(false);
			pgiModel.refresh(false);
			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.projectdetail", "updateFinInfoRowCount", {});
		},
		configureStatusOptions: function(ppmData) {
			// 			var temp = JSON.parse(pgiData.Project.ConfigStatus)
			// Object {DP: Object}DP: ObjectNextStatus: Array(2)0: ObjectNSDesc: "On Going"NSKey: "IM001"__proto__: Object1: ObjectNSDesc: "Canceled"NSKey: "IM003"__proto__: Objectlength: 2__proto__: Array(0)PhaseDesc: "Exploration"PhaseKey: "DPM001"StatusDesc: "In Draft"StatusKey: "IM000"__proto__: Object__proto__: Object
			// temp.DP
			// Object {PhaseKey: "DPM001", PhaseDesc: "Exploration", StatusKey: "IM000", StatusDesc: "In Draft", NextStatus: Array(2)}
			// temp.DP.NextStatus
			// (2) [Object, Object]
			// temp.DP.NextStatus[0]
			// Object {NSKey: "IM001", NSDesc: "On Going"}
			// temp.DP.NextStatus[1]
			// Object {NSKey: "IM003", NSDesc: "Canceled"}
			if (ppmData.Project.ConfigStatus === "") {
				var pgiModel = this.getModel("PGI");
				var pgiData = pgiModel.getData();
				pgiData.Editable.Status = false;
				pgiModel.refresh(false);
			} else {
				var config = JSON.parse(ppmData.Project.ConfigStatus);
				var nextStatus = config.DP.NextStatus;
				var options = [];
				var statusOption = {
					"Key": ppmData.Project.PhasestatusKey,
					"Description": ppmData.Project.PhasestatusDesc
				};

				options.push(statusOption);
				if (nextStatus) {
					for (var i = 0; i < nextStatus.length; i++) {
						var statusOption = {
							"Key": nextStatus[i].NSKey,
							"Description": nextStatus[i].NSDesc
						};
						options.push(statusOption);
					}
				}
				if (!ppmData.VHStatus) {
					ppmData.VHStatus = {};
				}
				ppmData.VHStatus.CurrentOptions = options;
			}

		},
		addFinInfoAttributes: function(oRecord, leadHub) {
			oRecord.rowMode = "Edit";
			oRecord.PFinDivision = false;
			oRecord.PFinHub = false;
			oRecord.PGRolloutDtEnabled = false;
			oRecord.ValueState_HubKey = sap.ui.core.ValueState.None;
			oRecord.ValueStateText_HubKey = "";
			oRecord.PGHub = false;
			// oRecord.PGHub = this.checkFinInfoDeletable(oRecord);

			// if (oRecord.HubKey === leadHub) {
			if (parseFloat(oRecord.SerialNo) === 1) {
				oRecord.leadHubIndicator = 1;
				oRecord.LeadHubText = "Lead Hub:";
				oRecord.PFinDel = false;
			} else {
				oRecord.leadHubIndicator = 100;
				oRecord.LeadHubText = "";
				//psutram7
				oRecord.PFinDel = oRecord.PGHub;
			}
		},
		checkFinInfoDeletable: function(oRecord) {
			//(parseFloat(oRecord.MarketShare) === 0) && 
			if ((parseFloat(oRecord.Margin) === 0) &&
				(parseFloat(oRecord.NetSales) === 0) && (parseFloat(oRecord.Incremental) === 0) &&
				(parseFloat(oRecord.IncrementalNetSales) === 0) && (parseFloat(oRecord.EstimatedSpendAP) === 0) &&
				(parseFloat(oRecord.EstimatedDesign) === 0) && (parseFloat(oRecord.EstimatedSpendInsights) === 0) &&
				(parseFloat(oRecord.EstimatedSpendGTN) === 0)) {
				// oRecord.PFinDel = true;
				return true;
			}
			return false;
		},
		/**
		 * Prepares the view for editing the selected object
		 * @param {sap.ui.base.Event} oEvent the  display event
		 * @private
		 */
		_onEdit: function(oEvent) {
			var oData = oEvent.getParameter("data");
			var oView = this.getView();
			var sPath = oData.objectPath;

			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			var inputData = oModel.getProperty(sPath);
			ppmData.Project = {};

			ppmData.Project.Input = JSON.parse(JSON.stringify(inputData));

			oView.setModel(oModel, "PPMData");
			oModel.refresh(false);

			this.getItemInfo(inputData.RpmGuidC);

			this._oViewModel.setProperty("/mode", "edit");
			this._oViewModel.setProperty("/enableCreate", true);
			// this._oViewModel.setProperty("/viewTitle", this._oResourceBundle.getText("editViewTitle"));

			var jsonModel = this.getView().getModel("PGI");
			var jsonData = jsonModel.getData();

			jsonModel.setProperty("/viewTitle", this._oResourceBundle.getText("PGIEditTitle", [inputData.ItemDesc]));

			jsonData.CurrentMode = oData.mode;
			jsonData.originalPath = sPath;
			jsonData.Project = {};
			jsonData.ProjectFinInfo = [];
			jsonData.Questionnaire = null;
			// jsonData.Project = JSON.parse(JSON.stringify(inputData));
			// if (jsonData.Project.ZimGrid === "1") {
			// 	jsonData.Project.Grid = true;
			// } else {
			// 	jsonData.Project.Grid = false;
			// }
			// jsonData.Project.StartDate = inputData.StartDate;
			// jsonData.Project.LaunchDate = inputData.LaunchDate;
			// jsonData.Project.PlannedFinish = inputData.PlannedFinish;
			// jsonData.Project.CreatedDate = inputData.CreatedDate;
			// jsonData.Project.LastupdateDate = inputData.LastupdateDate;

			// console.log("Brand Key:" + jsonData.Project.BrandKey);
			// jsonData.Project.BrandKey = jsonData.Project.BrandKey.substring(1);

			jsonModel.refresh(false);

			// this.getPhases();
			// this.getVHStatus();
			// this.getVHConsumerDiffs();
			// this.getTechnology();
			// this.getInnovationType();
			// this.getDivisions();
			// this.getHubs();

			// this.getCategories();
			// this.getSubCategories();
			// this.getBrands();
			// this.getSubBrands();

			// this.getStrategicFocus ();
			// this.getCurrencies();
			//setup managers
			var mgrList = [];
			console.log("Project Manager:" + inputData.ProjmanagerDesc + ":" + inputData.FinamanagerDesc);
			// inputData.ProjmanagerDesc = "Meena";
			// inputData.FinamanagerDesc = "Bhavik";
			/*

						if (inputData.ProjmanagerKey !== "") {
							var mgr = {
								Id: inputData.ProjmanagerKey,
								Key: "",
								Name: inputData.ProjmanagerDesc,
								Select: ""
							};
							mgrList.push(mgr);
						}
						if (inputData.FinamanagerKey !== "") {
							var mgr = {
								Id: inputData.FinamanagerKey,
								Key: "",
								Name: inputData.FinamanagerDesc,
								Select: ""
							};
							mgrList.push(mgr);
						}
						if (mgrList.length > 0) {
							ppmData.VHManagers = mgrList;
						}
			*/
			this.getView().setModel(jsonModel, "PGI");

			this.setModel(jsonModel, "PGI");
			jsonModel.refresh(false);
			// this.getOwnerComponent().setModel(oModel, "PPMData");
			console.log("finished onEdit");

		},
		onPressEdit: function(oEvent) {
			var jsonModel = this.getView().getModel("PGI");
			var jsonData = jsonModel.getData();
			jsonData.CurrentMode = "Edit";
			// this.getView().setModel (jsonModel, "PGI");
			// this.setModel(jsonModel, "PGI");
			jsonModel.refresh(false);
			this.configScreen();
		},
		configRequiredColumnFinInfo: function(bRequired) {
			var fragmentId = this.getView().createId("fin");
			var oTable = sap.ui.core.Fragment.byId(fragmentId, "lineItemsList");
			var oColumns = oTable.getColumns();

			for (var i = 0; i < oColumns.length; i++) {
				var labelText = oColumns[i].getLabel().getText();
				if (labelText.includes("Net Sales") || labelText.includes("Market Share") ||
					labelText.includes("Margin") || labelText.includes("Incremental Sales")) {
					oColumns[i].getLabel().setRequired(bRequired);
				}
			}
		},
		configRequiredColumnHubInfo: function() {
			var fragmentId = this.getView().createId("general");
			var oTable = sap.ui.core.Fragment.byId(fragmentId, "FinItemsList");
			var oColumns = oTable.getColumns();

			for (var i = 1; i < oColumns.length; i++) {
				var labelText = oColumns[i].getLabel().getText();
				if (labelText.includes("Hub") || labelText.includes("Rollout")) {
					oColumns[i].getLabel().setRequired(true);
				}
			}
		},
		configScreen: function() {
			var oModel = this.getView().getModel("PGI");
			var pgiData = oModel.getData();
			var oIconTab = this.byId("__bar0");
			var oGeneralTab = this.byId("__filter0");
			this.configChangeLogsScreen();

			oIconTab.setExpandable(false);
			oIconTab.setSelectedItem(oGeneralTab);

			pgiData.Project.ProjectGenInfoColor = "Default";
			pgiData.Project.ProjectFinInfoColor = "Default";
			pgiData.Project.ProjectAttColor = "Default";
			pgiData.Project.ProjectChangeLogsColor = "Default";

			pgiData.Editable.InnovationKeyIconColor = "Default";
			pgiData.Editable.InnovationKeyIconTooltip = "";
			pgiData.Editable.ProjmanagerKeyIconColor = "Default";
			pgiData.Editable.ProjmanagerKeyIconTooltip = "";
			pgiData.Editable.FinamanagerKeyIconColor = "Default";
			pgiData.Editable.FinamanagerKeyIconTooltip = "";

			// sap.ui.core.Fragment.byId(fragmentId, "_marketShare")._oLabel.setRequired(true);

			if (pgiData.CurrentMode === "Display") {
				pgiData.AttachmentLoaded = false;
				pgiData.LogsLoaded = false;

				var fragmentId = this.getView().createId("general");
				sap.ui.core.Fragment.byId(fragmentId, "__PName")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__Phase")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__Status")._oLabel.setRequired(true);
				// sap.ui.core.Fragment.byId(fragmentId, "__CP")._oLabel.setRequired(true);
				// sap.ui.core.Fragment.byId(fragmentId, "__technology")._oLabel.setRequired(true);

				// sap.ui.core.Fragment.byId(fragmentId, "__Innovation")._oLabel.setRequired(true);

				sap.ui.core.Fragment.byId(fragmentId, "__Strategic")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__Marketing")._oLabel.setRequired(true);

				sap.ui.core.Fragment.byId(fragmentId, "__PGIDivision1")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__category")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__Subcategory")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__Brand")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__SubBrand")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__PM")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__FM")._oLabel.setRequired(true);

				sap.ui.core.Fragment.byId(fragmentId, "__PType")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__StartDt")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__LaunchDt")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__Innovation")._oLabel.setRequired(true);

				if (pgiData.Project.PhasestatusKey === "IM001" || pgiData.Project.PhasestatusKey === "IM004") {
					this.configRequiredColumnFinInfo(true);
				} else {
					this.configRequiredColumnFinInfo(false);
				}
				this.configRequiredColumnHubInfo();

				pgiData.Editable.enableUpdate = false;
				pgiData.Editable.ProjectName = false;
				pgiData.Editable.PID = false;
				pgiData.Editable.IName = false;
				pgiData.Editable.IID = false;
				pgiData.Editable.PType = false;
				pgiData.Editable.Phase = false;
				pgiData.Editable.Status = false;
				pgiData.Editable.Grid = false;
				pgiData.Editable.PMgr = false;
				pgiData.Editable.FMgr = false;
				pgiData.Editable.ConsPers = false;
				pgiData.Editable.Technology = false;
				pgiData.Editable.Innovation = false;
				pgiData.Editable.Strategic = false;
				pgiData.Editable.Marketing = false;

				pgiData.Editable.Division = false;
				pgiData.Editable.Hub = false;
				pgiData.Editable.RolloutDt = false;
				pgiData.Editable.Category = false;
				pgiData.Editable.ProdCategory = false;
				pgiData.Editable.Brand = false;
				pgiData.Editable.SubBrand = false;
				pgiData.Editable.StartDt = false;
				pgiData.Editable.FinishDt = false;
				pgiData.Editable.LaunchDt = false;
				pgiData.Editable.CreateDt = false;
				pgiData.Editable.UpdateDt = false;
				pgiData.Editable.Currency = false;

				pgiData.Editable.FinTab = true;
				pgiData.Editable.AttTab = true;
				pgiData.Editable.LogTab = true;

				pgiData.Visible.ProjectName = true;
				pgiData.Visible.PID = true;
				pgiData.Visible.IName = true;
				pgiData.Visible.IID = true;
				pgiData.Visible.PType = true;
				pgiData.Visible.Phase = true;
				pgiData.Visible.Status = true;
				pgiData.Visible.Grid = true;
				pgiData.Visible.PMgr = true;
				pgiData.Visible.FMgr = true;
				pgiData.Visible.ConsPers = true;
				pgiData.Visible.Technology = true;

				pgiData.Visible.Innovation = true;
				pgiData.Visible.Strategic = true;
				pgiData.Visible.Marketing = true;

				pgiData.Visible.Division = true;
				pgiData.Visible.Hub = true;
				pgiData.Visible.RolloutDt = true;
				pgiData.Visible.Category = true;
				pgiData.Visible.ProdCategory = true;
				pgiData.Visible.Brand = true;
				pgiData.Visible.SubBrand = true;
				pgiData.Visible.StartDt = true;
				pgiData.Visible.FinishDt = false;

				pgiData.Visible.LaunchDt = true;
				pgiData.Visible.CreateDt = true;
				pgiData.Visible.UpdateDt = true;
				pgiData.Visible.Currency = true;

				// Fin Info Tab controls
				pgiData.Visible.PFinDivision = true;
				pgiData.Visible.PFinHub = true;
				pgiData.Visible.PFinCurrency = true;
				pgiData.Visible.PFIRolloutDt = true;
				pgiData.Visible.PFinMarketShare = true;
				pgiData.Visible.PFinMargin = true;
				pgiData.Visible.PFinNetSales = true;
				pgiData.Visible.PFinIncremental = true;
				pgiData.Visible.PFinIncrementalNetSales = true;
				pgiData.Visible.PFinEstSpend = true;
				pgiData.Visible.PFinEstSpendInsight = true;
				pgiData.Visible.PFinEstSpendGTN = true;
				pgiData.Visible.PFinEstSpendGDP = true;
				pgiData.Visible.PFinAdd = false;

				pgiData.Editable.PFinDivision = false;
				pgiData.Editable.PFinHub = false;
				pgiData.Editable.PFinCurrency = false;
				pgiData.Editable.PFIRolloutDt = false;
				pgiData.Editable.PFinMarketShare = false;
				pgiData.Editable.PFinMargin = false;
				pgiData.Editable.PFinNetSales = false;
				pgiData.Editable.PFinIncremental = false;
				pgiData.Editable.PFinIncrementalNetSales = false;
				pgiData.Editable.PFinEstSpend = false;
				pgiData.Editable.PFinEstSpendInsight = false;
				pgiData.Editable.PFinEstSpendGTN = false;
				pgiData.Editable.PFinEstSpendGDP = false;

				for (var i = 0; i < pgiData.ProjectFinInfo.length; i++) {
					pgiData.ProjectFinInfo[i].PGRolloutDt = true;
				}

				// if ConfigUser has Access.Editable as X, the Item is editable.
				//"{"Access":{"Editable":" "}}"
				var access = JSON.parse(pgiData.Project.ConfigUser);
				if (access.Access.Editable === "X") {
					pgiData.Editable.EditButton = true;
					pgiData.Visible.EditButton = true;
				} else {
					pgiData.Editable.EditButton = false;
					pgiData.Visible.EditButton = false;
				}
				pgiData.Editable.enableUpdate = false;
				pgiData.Visible.enableUpdate = false;
				pgiData.Visible.enableSaveClose = false;

			} else if (pgiData.CurrentMode === "Edit") {
				pgiData.Editable.enableUpdate = true;
				pgiData.Editable.ProjectName = true;
				pgiData.Editable.PID = false;
				pgiData.Editable.IName = false;
				pgiData.Editable.IID = false;
				pgiData.Editable.PType = true;
				pgiData.Editable.Phase = false;
				pgiData.Editable.Status = true;
				pgiData.Editable.Grid = true;
				pgiData.Editable.PMgr = true;
				pgiData.Editable.FMgr = true;
				pgiData.Editable.ConsPers = true;
				pgiData.Editable.Technology = true;
				pgiData.Editable.Strategic = true;
				pgiData.Editable.Marketing = true;

				pgiData.Editable.Innovation = true;
				pgiData.Editable.Division = false;
				pgiData.Editable.Hub = true;
				pgiData.Editable.RolloutDt = true;
				pgiData.Editable.Category = true;
				pgiData.Editable.ProdCategory = true;
				pgiData.Editable.Brand = true;
				pgiData.Editable.SubBrand = true;
				pgiData.Editable.StartDt = true;
				pgiData.Editable.FinishDt = false;

				pgiData.Editable.LaunchDt = true;
				pgiData.Editable.CreateDt = false;
				pgiData.Editable.UpdateDt = false;
				pgiData.Editable.Currency = true;

				pgiData.Visible.enableUpdate = true;
				pgiData.Visible.enableSaveClose = true;
				pgiData.Visible.ProjectName = true;
				pgiData.Visible.PID = true;
				pgiData.Visible.IName = true;
				pgiData.Visible.IID = true;
				pgiData.Visible.PType = true;
				pgiData.Visible.Phase = true;
				pgiData.Visible.Status = true;
				pgiData.Visible.Grid = true;
				pgiData.Visible.PMgr = true;
				pgiData.Visible.FMgr = true;
				pgiData.Visible.ConsPers = true;
				pgiData.Visible.Technology = true;

				pgiData.Visible.Innovation = true;
				pgiData.Visible.Strategic = true;
				pgiData.Visible.Marketing = true;

				pgiData.Visible.Division = true;
				pgiData.Visible.Hub = true;
				pgiData.Visible.RolloutDt = true;
				pgiData.Visible.Category = true;
				pgiData.Visible.ProdCategory = true;
				pgiData.Visible.Brand = true;
				pgiData.Visible.SubBrand = true;
				pgiData.Visible.StartDt = true;
				pgiData.Visible.FinishDt = false;

				pgiData.Visible.LaunchDt = true;
				pgiData.Visible.CreateDt = true;
				pgiData.Visible.UpdateDt = true;
				pgiData.Visible.Currency = true;

				// Fin Info Tab controls
				pgiData.Visible.PFinDivision = true;
				pgiData.Visible.PFinHub = true;
				pgiData.Visible.PFinCurrency = true;
				pgiData.Visible.PFIRolloutDt = true;
				pgiData.Visible.PFinMarketShare = true;
				pgiData.Visible.PFinMargin = true;
				pgiData.Visible.PFinNetSales = true;
				pgiData.Visible.PFinIncremental = true;
				pgiData.Visible.PFinIncrementalNetSales = true;
				pgiData.Visible.PFinEstSpend = true;
				pgiData.Visible.PFinEstSpendInsight = true;
				pgiData.Visible.PFinEstSpendGTN = true;
				pgiData.Visible.PFinEstSpendGDP = true;
				pgiData.Visible.PFinAdd = true;

				pgiData.Editable.PFinDivision = false;
				pgiData.Editable.PFinHub = false;
				pgiData.Editable.PFinCurrency = false;
				pgiData.Editable.PFIRolloutDt = true;
				pgiData.Editable.PFinMarketShare = true;
				pgiData.Editable.PFinMargin = true;
				pgiData.Editable.PFinNetSales = true;
				pgiData.Editable.PFinIncremental = true;
				pgiData.Editable.PFinIncrementalNetSales = true;
				pgiData.Editable.PFinEstSpend = true;
				pgiData.Editable.PFinEstSpendInsight = true;
				pgiData.Editable.PFinEstSpendGTN = true;
				pgiData.Editable.PFinEstSpendGDP = true;

				pgiData.Editable.EditButton = false;
				pgiData.Visible.EditButton = false;
				pgiData.Editable.FinTab = true;

				pgiData.Editable.AttTab = true;
				pgiData.Editable.LogTab = true;

				for (var i = 0; i < pgiData.ProjectFinInfo.length; i++) {
					pgiData.ProjectFinInfo[i].PGRolloutDtEnabled = true;
					var finDeleteable = this.checkFinInfoDeletable(pgiData.ProjectFinInfo[i]);
					pgiData.ProjectFinInfo[i].PGHub = finDeleteable;
					if (pgiData.ProjectFinInfo[i].leadHubIndicator !== 1) {
						pgiData.ProjectFinInfo[i].PFinDel = finDeleteable;
					}
				}
			} else if (pgiData.CurrentMode === "Create") {
				var fragmentId = this.getView().createId("general");
				sap.ui.core.Fragment.byId(fragmentId, "__PName")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__Phase")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__Status")._oLabel.setRequired(true);
				// sap.ui.core.Fragment.byId(fragmentId, "__CP")._oLabel.setRequired(true);
				// sap.ui.core.Fragment.byId(fragmentId, "__technology")._oLabel.setRequired(true);

				// sap.ui.core.Fragment.byId(fragmentId, "__Innovation")._oLabel.setRequired(true);

				sap.ui.core.Fragment.byId(fragmentId, "__Strategic")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__Marketing")._oLabel.setRequired(true);

				sap.ui.core.Fragment.byId(fragmentId, "__PGIDivision1")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__category")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__Subcategory")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__Brand")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__SubBrand")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__PM")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__FM")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__PType")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__StartDt")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__LaunchDt")._oLabel.setRequired(true);
				sap.ui.core.Fragment.byId(fragmentId, "__Innovation")._oLabel.setRequired(true);

				this.configRequiredColumnHubInfo();

				pgiData.Editable.enableUpdate = true;
				pgiData.Editable.ProjectName = true;
				pgiData.Editable.PID = false;
				pgiData.Editable.IName = false;
				pgiData.Editable.IID = false;
				pgiData.Editable.PType = true;
				pgiData.Editable.Phase = true;
				pgiData.Editable.Status = true;
				pgiData.Editable.Grid = false;
				pgiData.Editable.PMgr = true;
				pgiData.Editable.FMgr = true;
				pgiData.Editable.ConsPers = true;
				pgiData.Editable.Technology = true;
				pgiData.Editable.Strategic = true;
				pgiData.Editable.Marketing = true;

				pgiData.Editable.Innovation = true;
				pgiData.Editable.Division = true;
				pgiData.Editable.Hub = true;
				pgiData.Editable.RolloutDt = true;
				pgiData.Editable.Category = true;
				pgiData.Editable.ProdCategory = true;
				pgiData.Editable.Brand = true;
				pgiData.Editable.SubBrand = true;
				pgiData.Editable.StartDt = true;
				pgiData.Editable.FinishDt = false;

				pgiData.Editable.LaunchDt = true;
				pgiData.Editable.CreateDt = false;
				pgiData.Editable.UpdateDt = false;
				pgiData.Editable.Currency = true;

				pgiData.Editable.EditButton = false;
				pgiData.Visible.EditButton = false;

				pgiData.Editable.FinTab = false;
				pgiData.Editable.AttTab = false;
				pgiData.Editable.LogTab = false;

				pgiData.Visible.enableUpdate = true;
				pgiData.Visible.enableSaveClose = false;
				pgiData.Visible.ProjectName = true;
				pgiData.Visible.PID = false;
				pgiData.Visible.IName = true;
				pgiData.Visible.IID = true;
				pgiData.Visible.PType = true;
				pgiData.Visible.Phase = true;
				pgiData.Visible.Status = false;
				pgiData.Visible.Grid = false;
				pgiData.Visible.PMgr = true;
				pgiData.Visible.FMgr = true;
				pgiData.Visible.ConsPers = true;
				pgiData.Visible.Technology = true;
				pgiData.Visible.Innovation = true;
				pgiData.Visible.Strategic = true;
				pgiData.Visible.Marketing = true;

				pgiData.Visible.Division = true;
				pgiData.Visible.Hub = true;
				pgiData.Visible.RolloutDt = true;
				pgiData.Visible.Category = true;
				pgiData.Visible.ProdCategory = true;
				pgiData.Visible.Brand = true;
				pgiData.Visible.SubBrand = true;
				pgiData.Visible.StartDt = true;
				pgiData.Visible.FinishDt = false;

				pgiData.Visible.LaunchDt = true;
				pgiData.Visible.CreateDt = false;
				pgiData.Visible.UpdateDt = false;
				pgiData.Visible.Currency = true;

				pgiData.Visible.PFinAdd = true;
				// fin info tab
				pgiData.Visible.PFinDivision = true;
				pgiData.Visible.PFinHub = true;
				pgiData.Visible.PFinCurrency = true;
				pgiData.Visible.PFIRolloutDt = true;
				pgiData.Visible.PFinMarketShare = true;
				pgiData.Visible.PFinMargin = true;
				pgiData.Visible.PFinNetSales = true;
				pgiData.Visible.PFinIncremental = true;
				pgiData.Visible.PFinIncrementalNetSales = true;
				pgiData.Visible.PFinEstSpend = true;
				pgiData.Visible.PFinEstSpendInsight = true;
				pgiData.Visible.PFinEstSpendGTN = true;
				pgiData.Visible.PFinEstSpendGDP = true;
				pgiData.Visible.PFinAdd = true;

				pgiData.Editable.PFinDivision = false;
				pgiData.Editable.PFinHub = false;
				pgiData.Editable.PFinCurrency = false;
				pgiData.Editable.PFIRolloutDt = true;
				pgiData.Editable.PFinMarketShare = true;
				pgiData.Editable.PFinMargin = true;
				pgiData.Editable.PFinNetSales = true;
				pgiData.Editable.PFinIncremental = true;
				pgiData.Editable.PFinIncrementalNetSales = true;
				pgiData.Editable.PFinEstSpend = true;
				pgiData.Editable.PFinEstSpendInsight = true;
				pgiData.Editable.PFinEstSpendGTN = true;
				pgiData.Editable.PFinEstSpendGDP = true;

				pgiData.Editable.EditButton = false;
				pgiData.Visible.EditButton = false;
				// pgiData.Editable.FinTab = true;

				for (var i = 0; i < pgiData.ProjectFinInfo.length; i++) {
					pgiData.ProjectFinInfo[i].PGRolloutDt = true;
				}
			}

			oModel.refresh(false);
		},

		/**
		 * Prepares the view for creating new object
		 * @param {sap.ui.base.Event} oEvent the  display event
		 * @private
		 */
		//psutram7
		_onCreate: function(oEvent) {
			// if (oEvent.getParameter("name") && oEvent.getParameter("name") !== "create") {
			// 	this._oViewModel.setProperty("/enableCreate", false);
			// 	this.getRouter().getTargets().detachDisplay(null, this._onDisplay, this);
			// 	this.getView().unbindObject();
			// 	return;
			// }

			// this._oViewModel.setProperty("/viewTitle", this._oResourceBundle.getText("createViewTitle"));
			// this._oViewModel.setProperty("/mode", "create");
			// var oContext = this._oODataModel.createEntry("initiativesSet", {
			// 	success: this._fnEntityCreated.bind(this),
			// 	error: this._fnEntityCreationFailed.bind(this)
			// });
			// this.getView().setBindingContext(oContext);

			var oModel = sap.ui.getCore().getModel("PPMData");
			var oData = oEvent.getParameter("data");
			// var sPath = oData.objectPath;

			this._oViewModel.setProperty("/viewTitle", this._oResourceBundle.getText("createViewTitle"));
			this._oViewModel.setProperty("/mode", "create");

			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			// var initiativeData = oModel.getProperty (sPath);
			this.getView().setModel(oModel, "PPMData");

			var oModel = this.getView().getModel("PGI");
			var pgiData = oModel.getData();

			oModel.setProperty("/viewTitle", this._oResourceBundle.getText("PGICreateTitle"));

			pgiData.CurrentMode = "Create";
			pgiData.ProjectAttCount = 0;
			pgiData.Questionnaire = null;
			// pgiData.originalPath = sPath;

			// var newProject =
			// {
			//      IniGuidC    : initiativeData.IniGuidC,
			//      IniId  	: initiativeData.Id,
			//      IniDesc	: initiativeData.Name,
			//      DivisionKey: initiativeData.RegionKey
			// };
			pgiData.ProjectFinInfo = [];
			pgiData.ProjectFinCount = 0;
			pgiData.Project = {};

			pgiData.Project = {
				"ItemDesc": "",
				"DivisionKey": "",
				"CategoryKey": "",
				"PhaseKey": "",
				"PhasestatusKey": "",
				"ConprediffKey": "",
				"TobmuKey": "",
				"StarfoKey": "",
				"ProjecttypeKey": "",
				"InnovationKey": "",
				"SubcategoryKey": "",
				"BrandKey": "",
				"ProjmanagerKey": "",
				"FinamanagerKey": "",
				"StartDate": null,
				"LaunchDate": null
			};

			// this.getCategories();
			// this.getDivisions();
			// this.getPhases();
			// this.getTechnology();
			// this.getInnovationType();
			// this.getMarketingObjective();
			oModel.refresh(false);
			this.configScreen();

			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStopSpinner", {});
		},

		/**
		 * Checks if the save button can be enabled
		 * @private
		 */
		_validateSaveEnablement: function() {
			var aInputControls = this._getFormFields(this.byId("newEntitySimpleForm"));
			var oControl;
			for (var m = 0; m < aInputControls.length; m++) {
				oControl = aInputControls[m].control;
				if (aInputControls[m].required) {
					var sValue = oControl.getValue();
					if (!sValue) {
						this._oViewModel.setProperty("/enableCreate", false);
						return;
					}
				}
			}
			this._checkForErrorMessages();
		},

		/**
		 * Checks if there is any wrong inputs that can not be saved.
		 * @private
		 */

		_checkForErrorMessages: function() {
			var aMessages = this._oBinding.oModel.oData;
			if (aMessages.length > 0) {
				var bEnableCreate = true;
				for (var i = 0; i < aMessages.length; i++) {
					if (aMessages[i].type === "Error" && !aMessages[i].technical) {
						bEnableCreate = false;
						break;
					}
				}
				this._oViewModel.setProperty("/enableCreate", bEnableCreate);
			} else {
				this._oViewModel.setProperty("/enableCreate", true);
			}
		},

		/**
		 * Handles the success of updating an object
		 * @private
		 */
		_fnUpdateSuccess: function() {
			this.getModel("appView").setProperty("/busy", false);
			this.getView().unbindObject();
			this.getRouter().getTargets().display("object");
		},

		/**
		 * Handles the success of creating an object
		 *@param {object} oData the response of the save action
		 * @private
		 */
		_fnEntityCreated: function(oData) {
			var sObjectPath = this.getModel().createKey("initiativesSet", oData);
			this.getModel("appView").setProperty("/itemToSelect", "/" + sObjectPath); //save last created
			this.getModel("appView").setProperty("/busy", false);
			this.getRouter().getTargets().display("object");
		},

		/**
		 * Handles the failure of creating/updating an object
		 * @private
		 */
		_fnEntityCreationFailed: function() {
			this.getModel("appView").setProperty("/busy", false);
		},

		// psutram: Todo: get the object path
		_onDisplay: function(oEvent) {
			var oData = oEvent.getParameter("data");
			if (oData) {
				if (oData.mode === "Display") {
					this._onEdit(oEvent);
				} else {
					this._onCreate(oEvent);
				}
			}
		},

		/**
		 * Gets the form fields
		 * @param {sap.ui.layout.form} oSimpleForm the form in the view.
		 * @private
		 */
		_getFormFields: function(oSimpleForm) {
			var aControls = [];
			var aFormContent = oSimpleForm.getContent();
			var sControlType;
			for (var i = 0; i < aFormContent.length; i++) {
				sControlType = aFormContent[i].getMetadata().getName();
				if (sControlType === "sap.m.Input" || sControlType === "sap.m.DateTimeInput" ||
					sControlType === "sap.m.CheckBox") {
					aControls.push({
						control: aFormContent[i],
						required: aFormContent[i - 1].getRequired && aFormContent[i - 1].getRequired()
					});
				}
			}
			return aControls;
		},

		addFinHub: function(oEvent) {
			var oView = this.getView();
			var oModel = this.getModel("PGI");
			var pgiData = oModel.getData();
			var ppmData = this.getModel("PPMData").getData();
			var finInfo = {};
			if (!pgiData.ProjectFinInfo || pgiData.ProjectFinInfo.length === 0) {
				finInfo = {
					RpmGuid: pgiData.Project.RpmGuid,
					IniGuid: pgiData.Project.IniGuid,
					DivisionKey: pgiData.Project.DivisionKey,
					DivisionDesc: pgiData.Project.DivisionDesc,
					HubKey: "",
					HubDesc: "",
					ProjectID: pgiData.Project.ProjectID,
					InitiaitiveID: pgiData.Project.InitiaitiveID,
					RolloutDate: pgiData.Project.LaunchDate,
					CurrencyKey: this.getOwnerComponent().getModel("P13n_Configuration").getProperty("/CurrencySettings/Currency"),
					CurrencyDesc: "",
					// MarketShare: 0,
					Margin: 0,
					NetSales: 0,
					Incremental: 0,
					IncrementalNetSales: 0,
					EstimatedSpendAP: 0,
					EstimatedDesign: 0,
					EstimatedSpendInsights: 0,
					EstimatedSpendGTN: 0,
					//+ INBHD02
					NetSalesEdit: [0],
					EstimatedSpendAPEdit: [0],
					EstimatedDesignEdit: [0],
					EstimatedSpendInsightsEdit: [0],
					//- INBHD02
					rowMode: "Add",
					leadHubIndicator: 1,
					SerialNo: "1",
					LeadHubText: "Lead Hub",
					PFinDivision: false,
					PFinHub: false,
					PGRolloutDt: true,
					PGHub: true,
					PFinDel: false
				};
				pgiData.ProjectFinInfo = [];
				pgiData.ProjectFinInfo.push(finInfo);
				pgiData.Visible.FinInfoRowCount = pgiData.ProjectFinInfo.length;
			} else {
				var fragmentId = this.getView().createId("general");
				var oTable = sap.ui.core.Fragment.byId(fragmentId, "FinItemsList");
				// var rowCount = oTable._getRowCount();
				var rowCount = oTable._getTotalRowCount();		//upgrade		
				if (rowCount < 6) {
					finInfo = {
						RpmGuid: pgiData.Project.RpmGuid,
						IniGuid: pgiData.Project.IniGuid,
						DivisionKey: pgiData.Project.DivisionKey,
						DivisionDesc: pgiData.Project.DivisionDesc,
						HubKey: "",
						HubDesc: "",
						ProjectID: pgiData.Project.ProjectID,
						InitiaitiveID: pgiData.Project.InitiaitiveID,
						RolloutDate: pgiData.ProjectFinInfo[0].RolloutDate,
						CurrencyKey: this.getOwnerComponent().getModel("P13n_Configuration").getProperty("/CurrencySettings/Currency"),
						CurrencyDesc: "",
						// MarketShare: 0,
						Margin: 0,
						NetSales: 0,
						Incremental: 0,
						IncrementalNetSales: 0,
						EstimatedSpendAP: 0,
						EstimatedDesign: 0,
						EstimatedSpendInsights: 0,
						EstimatedSpendGTN: 0,
						//+ INBHD02
						NetSalesEdit: [0],
						EstimatedSpendAPEdit: [0],
						EstimatedDesignEdit: [0],
						EstimatedSpendInsightsEdit: [0],
						//- INBHD02
						rowMode: "Add",
						leadHubIndicator: 100,
						SerialNo: this.getNextFinInfoSerialNo(pgiData),
						LeadHubText: "",
						PFinDivision: false,
						PFinHub: false,
						PGRolloutDt: true,
						PGHub: true,
						PFinDel: true
					};
					// pgiData.ProjectFinInfo = [];
					pgiData.ProjectFinInfo.push(finInfo);
					pgiData.Visible.FinInfoRowCount = pgiData.ProjectFinInfo.length;
				} else {
					var sMessage = this.getModel("i18n").getResourceBundle().getText("PGI_MaxNumberOfHubReached");
					MessageToast.show(sMessage);

				}
			}
			pgiData.ProjectFinCount = pgiData.ProjectFinInfo.length;
			pgiData.currentFinMode = "Add";
			oModel.refresh(false);

			// this.configFinScreen ();

			pgiData.ProjectFin = finInfo;
			oModel.refresh(false);
			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.projectdetail", "updateFinInfoRowCount", {});

		},
		getNextFinInfoSerialNo: function(pgiData) {
			var maxSerialNumber = 0;
			for (var i = 0; i < pgiData.ProjectFinInfo.length; i++) {
				if (parseFloat(pgiData.ProjectFinInfo[i].SerialNo) > maxSerialNumber)
					maxSerialNumber = parseFloat(pgiData.ProjectFinInfo[i].SerialNo);
			}
			maxSerialNumber++;
			return maxSerialNumber + "";
		},
		editFinHub: function(oEvent) {
			var oView = this.getView();
			var oModel = this.getModel("PGI");
			var pgiData = oModel.getData();
			var projectTable = oView.byId("lineItemsList");
			var selectedRow = projectTable.getSelectedIndex();
			if (selectedRow > -1) {
				var sObjectPath = projectTable.getContextByIndex(selectedRow).sPath;
				var finInfo = oModel.getProperty(sObjectPath);
				pgiData.ProjectFin = finInfo;
				finInfo.currentMode = "Edit";
				pgiData.currentFinMode = "Edit";
				oModel.refresh(false);
				// this.configFinScreen();
			}
			oModel.refresh(false);
		},
		// Project Attachment Methods
		getItemAttachments: function() {
			var oBaseModel = sap.ui.getCore().getModel("PPM");
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();

			var oFilters = [];
			// Todo: fix the rpmGuid to current Guid
			// var rpmGuidC = '005056A2473E1EE78DE4DA7FC048B33F';
			var rpmGuidC = pgiData.Project.RpmGuidC;
			// Expand included in the URL Parameters  
			var sPath = "/ItemsList(RpmGuid=binary\'" + rpmGuidC + "\',RpmGuidC=\'" + rpmGuidC + "\')/ItemAttachmentsSet";
			// sPath = "/ItemsList(RpmGuid=binary\'005056A2473E1EE78DE4DA7FC048B33F\',RpmGuidC=\'005056A2473E1EE78DE4DA7FC048B33F\')/ItemAttachmentsSet";

			var that = this;
			oBaseModel.read(sPath, {
				async: true,
				// filters: oFilters,
				success: function(oDataIn, oResponse) {
					that.setItemAttachments(that, oDataIn);
				},
				error: function(oError) {
					oError.ErrorOrigin = "ItemAttachmentsSet";
					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
				}
			});
		},
		setItemAttachments: function(oContext, oDataIn) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();

			pgiData.ItemAttachmentsSet = oDataIn.results;

			// pgiData.ItemAttachmentsSet[0].__metadata.media_src
			// "http://ngd.colgate.com:8000/sap/opu/odata/sap/ZIM_MAIN_SRV/ItemAttachments(�cumentGuid='76A3205973021ED78EAFB96EEB5E8A78',ActFileId='IM000141')/$value"
			// pgiData.ItemAttachments[2].children[0].__metadata.media_src

			pgiModel.refresh(false);

			this.configProjectAttachmentData();
			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStopSpinner", {});
		},
		configProjectAttachmentData: function() {
			// "{"FolderStructure":{"FS":[{"IType":"9109","ParentKey":"","Key":"01","Text":"Marketing"},{"IType":"9109","ParentKey":"","Key":"02","Text":"Legal"},{"IType":"9109","ParentKey":"","Key":"03","Text":"Regulatory"},{"IType":"9109","ParentKey":"","Key":"04","Text":"Design"},{"IType":"9109","ParentKey":"","Key":"05","Text":"Global Tech Center"},{"IType":"9109","ParentKey":"","Key":"06","Text":"Supply Chain"}]}}"
			//"{"FolderStructure":{"FS":[{"IType":"9109","ParentKey":"9999","Key":"01","Text":"Marketing"},{"IType":"9109","ParentKey":"9999","Key":"02","Text":"Legal"},{"IType":"9109","ParentKey":"9999","Key":"03","Text":"Regulatory"},{"IType":"9109","ParentKey":"9999","Key":"04","Text":"Design"},{"IType":"9109","ParentKey":"9999","Key":"05","Text":"Global Tech Center"},{"IType":"9109","ParentKey":"9999","Key":"06","Text":"Supply Chain"}]}}"
			// IType
			// ParentKey
			// Key
			// Text
			var pgiModel = this.getModel("PGI");
			var pgiData = pgiModel.getData();
			// var folderList = JSON.parse(pgiData.Project.ConfigFolderStr);
			var folderStructure = JSON.parse(pgiData.Project.ConfigFolderStr);
			var folderList = folderStructure.FolderStructure.FS;
			var attachmentList = pgiData.ItemAttachmentsSet;

			for (var i = 0; i < folderList.length; i++) {
				folderList[i].nodeType = "Folder";
				// folderList[i].SubFolderName = folderList[i].Text;
				folderList[i].children = this.getAttachmentsByFolder(folderList[i], attachmentList);
				if (folderList[i].children.length > 0) {
					folderList[i].iconPath = "sap-icon://folder";
				} else {
					folderList[i].iconPath = "sap-icon://folder-blank";
				}
			}

			pgiData.ItemAttachments = folderList;

			if (pgiData.ItemAttachmentsSet) {
				pgiData.ProjectAttCount = pgiData.ItemAttachmentsSet.length;
			} else {
				pgiData.ProjectAttCount = 0;
			}
			pgiData.Visible.PAttDelete = false;
			pgiData.Visible.PAttAdd = false;
			pgiModel.refresh(false);
		},
		getAttachmentsByFolder: function(parentFolder, attachmentList) {
			var attachments = [];
			for (var i = 0; i < attachmentList.length; i++) {
				if (attachmentList[i].SubfolderId === parentFolder.Key) {
					attachmentList[i].nodeType = "File";
					// attachmentList[i].iconPath = "sap-icon://document";
					attachmentList[i].Text = attachmentList[i].ActFileDescription;
					attachmentList[i].SubFolderName = parentFolder.Text;
					attachmentList[i].ParentKey = parentFolder.ParentKey;
					console.log("Mime Type:" + attachmentList[i].ActFileMimetype);
					attachmentList[i].iconPath = this.getIconByAttachmentType(attachmentList[i].ActFileMimetype, attachmentList[i].ActFileName);
					if (attachmentList[i].ActFileMimetype === "text/html") {
						attachmentList[i].ActFileURL = attachmentList[i].ActFileName;
						// attachmentList[i].ActFileDescription = "";
						attachmentList[i].ActFileName = "";
					} else {
						// 
						attachmentList[i].ActFileURL = "";
					}

					var temp = attachmentList[i].__metadata.media_src;
					var mediaURL = temp.substring(temp.indexOf("ItemAttachments"));
					mediaURL = temp.substring(temp.indexOf("/sap/opu/odata/sap"));

					attachmentList[i].mimeType = attachmentList[i].ActFileName.substring(attachmentList[i].ActFileName.lastIndexOf("."));
					attachmentList[i].fileURL = mediaURL;

					attachments.push(attachmentList[i]);
				}
			}
			return attachments;
		},
		getIconByAttachmentType: function(mimeType, fileName) {
			var sFileExtension = fileName.substring(fileName.lastIndexOf(".") + 1);
			var sIconPath = "sap-icon://document";
			if (mimeType === "text/html") {
				sIconPath = "sap-icon://attachment-html";
			} else if (mimeType === "application/pdf" || sFileExtension === "pdf") {
				sIconPath = "sap-icon://pdf-attachment";
			} else if (mimeType === "image/png" || sFileExtension === "png") {
				sIconPath = "sap-icon://attachment-photo";
			} else if (mimeType === "application/vnd.openxmlformats") {
				if (sFileExtension === "doc" || sFileExtension === "docx") {
					sIconPath = "sap-icon://doc-attachment";
				} else if (sFileExtension === "xls" || sFileExtension === "xlsx") {
					sIconPath = "sap-icon://excel-attachment";
				} else if (sFileExtension === "ppt" || sFileExtension === "pptx") {
					sIconPath = "sap-icon://ppt-attachment";
				}
			}
			return sIconPath;
		},
		onAttachmentPress: function(oEvent) {
			var params = oEvent.getParameters();

			var pgiModel = this.getModel("PGI");
			var sPath = oEvent.getSource().getBindingContext("PGI").getPath();
			var oRow = pgiModel.getProperty(sPath);

			var fragmentId = this.getView().createId("attchmnt");
			var oUpload = sap.ui.core.Fragment.byId(fragmentId, "UploadCollection");

			var items = oUpload.getItems();
			for (var i = 0; i < items.length; i++) {
				var oUploadItem = items[i];
				sPath = oUploadItem.getBindingContext("PGI").getPath();
				var currentRow = pgiModel.getProperty(sPath);
				if (oRow.DocumentGuid === currentRow.DocumentGuid) {
					console.log("Download Start");
					oUpload.downloadItem(oUploadItem, true);
					console.log("Download completed");
					i = items.length;
				}
			}
		},
		onAddAttachement: function(oEvent) {
			var that = this;
			var oBaseModel = sap.ui.getCore().getModel("PPM");
			var oBaseData = oBaseModel.getData();
			var fragmentId = this.getView().createId("attchmnt");
			var oTreeTable = sap.ui.core.Fragment.byId(fragmentId, "TreeTableAttachment");
			var pgiModel = this.getModel("PGI");
			var pgiData = pgiModel.getData();
			var selectedIndex = oTreeTable.getSelectedIndex();
			var sPath = "";
			var selectedRow;
			if (selectedIndex >= 0) {
				sPath = oTreeTable.getContextByIndex(selectedIndex).getPath();
				if (sPath !== "") {
					selectedRow = pgiModel.getProperty(sPath);
				}
			}

			if (selectedIndex < 0 || selectedRow.nodeType !== "Folder") {
				var sMessage = that.getModel("i18n").getResourceBundle().getText("PAttSelectFolder");
				sMessage = "Please select a folder before adding an Attachment";
				MessageToast.show(sMessage);
				return;
			}

			var addAttachment = {};
			addAttachment.RpmGuid = pgiData.Project.RpmGuid; //PK
			addAttachment.RpmGuidC = pgiData.Project.RpmGuidC; //PK
			addAttachment.ActFileId = pgiData.Project.ItemId; //PK
			addAttachment.FolderId = selectedRow.ParentKey; // ParentKey	PK
			addAttachment.SubfolderId = selectedRow.Key; // Key			PK
			addAttachment.FolderName = selectedRow.Text;
			addAttachment.ActFileName = ""; // Actual Name
			addAttachment.ActFileDescription = ""; // Description entered by user
			addAttachment.url = ""; // url entered by user
			addAttachment.ItemType = pgiData.Project.ItemtypeKey;

			// addAttachment.FolderId = selectedRow.SubFolderId;
			// addAttachment.FolderName = selectedRow.Text;
			// addAttachment.ActFileDescription = "";
			// addAttachment.ActFileName = "";
			// addAttachment.uploadUrl = "";
			addAttachment.fileEnabled = true;
			addAttachment.urlEnabled = false;

			// addAttachment.uploadUrl = "/sap/opu/odata/sap/ZIM_MAIN_SRV/ItemCreAttachment(RpmGuid=binary\'" + addAttachment.RpmGuidC +  "\',RpmGuidC=\'" + addAttachment.RpmGuidC +  
			// 						"\',ActFileId=\'" + addAttachment.ActFileId + "\',FolderId=\'" + addAttachment.FolderId + "\',SubfolderId=\'" + addAttachment.SubfolderId + "\')";
			// var sPath = "/sap/opu/odata/sap/ZIM_MAIN_SRV/ItemCreAttachment";

			var sPath = "/sap/opu/odata/sap/ZIM_MAIN_SRV/ItemsList(RpmGuid=binary\'" + addAttachment.RpmGuidC + "\',RpmGuidC=\'" +
				addAttachment.RpmGuidC +
				"\')/ItemCreAttachment";

			addAttachment.uploadUrl = sPath;

			console.log("Upload Url:" + addAttachment.uploadUrl);
			pgiData.AddAttachment = addAttachment;
			// oBaseData.AddAttachment = addAttachment;

			pgiData.AttachmentDialogBusy = false;

			var dialog = new Dialog("NewAttachment", {
				title: that.getModel("i18n").getResourceBundle().getText("NewAttachment"),
				type: 'Message',
				busy: "{path: 'PGI>/AttachmentDialogBusy'}",
				content: [
					new sap.m.HBox({
						fitContainer: true,
						alignItems: sap.m.FlexAlignItems.Center,
						justifyContent: sap.m.FlexJustifyContent.SpaceBetween,
						items: [
							new sap.m.Label({
								text: that.getModel("i18n").getResourceBundle().getText("PAttFolderName")
							}),
							new sap.m.Input("folderName", {
								width: "200px",
								maxLength: 40,
								value: "{path: 'PGI>/AddAttachment/FolderName'}",
								editable: false
							})
						]
					}), new sap.m.HBox({
						fitContainer: true,
						alignItems: sap.m.FlexAlignItems.Center,
						justifyContent: sap.m.FlexJustifyContent.SpaceBetween,
						items: [
							new sap.m.Label({
								text: that.getModel("i18n").getResourceBundle().getText("PAttFileDescr")
							}),
							new sap.m.Input("descr", {
								width: "200px",
								maxLength: 40,
								value: "{path: 'PGI>/AddAttachment/ActFileDescription'}"
							})
						]
					}), new sap.m.HBox({
						fitContainer: true,
						alignItems: sap.m.FlexAlignItems.Center,
						justifyContent: sap.m.FlexJustifyContent.SpaceBetween,
						items: [
							new sap.m.RadioButtonGroup("group", {
								width: "300px",
								columns: 2,
								buttons: [
									new sap.m.RadioButton("button1", {
										text: that.getModel("i18n").getResourceBundle().getText("PAttFiletext")
									}),
									new sap.m.RadioButton("button2", {
										text: that.getModel("i18n").getResourceBundle().getText("PAttURLtext")
									})
								],
								select: function(oEvent) {
									var index = oEvent.getParameters().selectedIndex;
									if (index === 0) {
										this.getModel("PGI").setProperty("/AddAttachment/fileEnabled", true);
										this.getModel("PGI").setProperty("/AddAttachment/urlEnabled", false);
									} else {
										this.getModel("PGI").setProperty("/AddAttachment/fileEnabled", false);
										this.getModel("PGI").setProperty("/AddAttachment/urlEnabled", true);
									}
									this.getModel("PGI").refresh(false);

								}
							})
						]
					}), new sap.m.HBox({
						fitContainer: true,
						alignItems: sap.m.FlexAlignItems.Center,
						justifyContent: sap.m.FlexJustifyContent.SpaceBetween,
						items: [
							new sap.m.Label({
								text: that.getModel("i18n").getResourceBundle().getText("PAttFile")
							}),
							// new sap.m.Input("fileName", {
							// 	type: sap.m.InputType.Text
							// }),
							new sap.ui.unified.FileUploader("fileUploader", {
								uploadUrl: "{path: 'PGI>/AddAttachment/uploadUrl'}",
								width: "200px",
								enabled: "{path: 'PGI>/AddAttachment/fileEnabled'}",
								uploadOnChange: false,
								sendXHR: true,
								maximumFileSize: 25,
								useMultipart: false,
								additionalData: "ItemType=9109",
								headerParameters: [
									new sap.ui.unified.FileUploaderParameter({
										name: "x-csrf-token",
										value: sap.ui.getCore().getModel("PPM").getHeaders()['x-csrf-token']
									})
								],
								tooltip: that.getModel("i18n").getResourceBundle().getText("PAttTooltip"),
								uploadComplete: function(oEvent) {
									that.handleUploadComplete(oEvent);
								}
							})

						]
					}), new sap.m.HBox({
						fitContainer: true,
						alignItems: sap.m.FlexAlignItems.Center,
						justifyContent: sap.m.FlexJustifyContent.SpaceBetween,
						items: [
							new sap.m.Label({
								text: that.getModel("i18n").getResourceBundle().getText("PAttURL")
							}),
							new sap.m.Input("urlName", {
								width: "200px",
								enabled: "{path: 'PGI>/AddAttachment/urlEnabled'}",
								type: sap.m.InputType.Url,
								value: "{path: 'PGI>/AddAttachment/url'}"
							})

						]
					})
				],
				beginButton: new sap.m.Button({
					text: that.getModel("i18n").getResourceBundle().getText("PAttCreate"),
					press: function(oEvent) {
						console.log("begin Upload process");
						sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStartSpinner", {});
						var pgiModel = this.getModel("PGI");
						var pgiData = this.getModel("PGI").getData();
						pgiData.AttachmentDialogBusy = true;
						pgiModel.refresh(false);
						// sap.ui.getCore().getOwnerComponent().getModel("PGI").setProperty("/AttachmentDialogBusy", true); // Stop Spinner
						// sap.ui.getCore().getOwnerComponent().getModel("PGI").refresh(false);

						var folderName = sap.ui.getCore().byId("folderName").getValue();
						var descr = sap.ui.getCore().byId("descr").getValue();
						var selectedIndex = sap.ui.getCore().byId("group").getSelectedIndex();
						var sUrl = "";
						var sFileName = "";
						if (selectedIndex === 0) {
							sFileName = sap.ui.getCore().byId("fileUploader").getValue();
							//+ INBHD02
							if (sFileName === "") {
								sMessage = "";
								sMessage = that.getModel("i18n").getResourceBundle().getText("SelectFile");
								MessageToast.show(sMessage);
								sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStopSpinner", {});
								that.getModel("PGI").setProperty("/AttachmentDialogBusy", false); // Stop Spinner
								return;
							}
							//- INBHD02
						} else {
							sUrl = sap.ui.getCore().byId("urlName").getValue();

							//+ INBHD02
							if (sUrl === "") {
								sMessage = "";
								sMessage = that.getModel("i18n").getResourceBundle().getText("SelectURL");
								MessageToast.show(sMessage);
								sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStopSpinner", {});
								that.getModel("PGI").setProperty("/AttachmentDialogBusy", false); // Stop Spinner
								return;
							}
							//- INBHD02
						}

						// var pgiData = this.getModel("PGI").getData();
						var ItemCreAttachment = {};
						ItemCreAttachment.RpmGuid = pgiData.AddAttachment.RpmGuid; //PK
						ItemCreAttachment.RpmGuidC = pgiData.AddAttachment.RpmGuidC; //PK
						ItemCreAttachment.ActFileId = pgiData.AddAttachment.ActFileId; //PK
						ItemCreAttachment.FolderId = pgiData.AddAttachment.FolderId; // ParentKey	PK
						ItemCreAttachment.SubfolderId = pgiData.AddAttachment.SubfolderId; // Key			PK
						//ItemCreAttachment.ActFileName = sFileName;							// Actual Name
						ItemCreAttachment.ActFileDescription = descr; // Description entered by user
						ItemCreAttachment.Url = sUrl; // url entered by user
						ItemCreAttachment.ItemType = pgiData.Project.ItemtypeKey;

						// /ItemAttachent2(RpmGUIDC='aasdjashj',DocumentGUIDC='')

						var ItemCreAttachment2 = {
							"RpmGuid-data": pgiData.AddAttachment.RpmGuid,
							"RpmGuidC-data": pgiData.AddAttachment.RpmGuidC,
							"ActFileId-data": pgiData.AddAttachment.ActFileId,
							"FolderId-data": pgiData.AddAttachment.FolderId,
							"SubfolderId-data": pgiData.AddAttachment.SubfolderId,
							"ActFileName-data": sFileName,
							"ActFileDescription-data": descr,
							"Url-data": sUrl,
							"ItemType-data": pgiData.Project.ItemtypeKey
						};

						var additionalParams = "RpmGuid=" + pgiData.AddAttachment.RpmGuid +
							"&RpmGuidC=" + pgiData.AddAttachment.RpmGuidC +
							"&ActFileId=" + pgiData.AddAttachment.ActFileId +
							"&FolderId=" + pgiData.AddAttachment.FolderId +
							"&SubfolderId=" + pgiData.AddAttachment.SubfolderId +
							"&ActFileName=" + sFileName +
							"&ActFileDescription=" + descr +
							"&Url=" + sUrl +
							"&ItemType=" + pgiData.AddAttachment.ItemType;
						additionalParams = "ItemType=" + pgiData.AddAttachment.ItemType;

						var oFileUploader = sap.ui.getCore().byId("fileUploader");
						// {"RpmGuid":"AFBWokc+HueQv38kjDerZw==","RpmGuidC":"005056A2473E1EE790BF7F248C37AB67","ActFileId":"IM000172","FolderId":"9999","SubfolderId":"01","ActFileName":"t2.xlsx","ActFileDescription":"test 1","Url":""}

						// oFileUploader.additionalData = additionalParams;

						oFileUploader.insertParameter(new sap.ui.unified.FileUploaderParameter({
							name: "RpmGuid",
							value: pgiData.AddAttachment.RpmGuid
						}));
						oFileUploader.insertParameter(new sap.ui.unified.FileUploaderParameter({
							name: "RpmGuidC",
							value: pgiData.AddAttachment.RpmGuidC
						}));
						oFileUploader.insertParameter(new sap.ui.unified.FileUploaderParameter({
							name: "ActFileId",
							value: pgiData.AddAttachment.ActFileId
						}));
						oFileUploader.insertParameter(new sap.ui.unified.FileUploaderParameter({
							name: "FolderId",
							value: pgiData.AddAttachment.FolderId
						}));
						oFileUploader.insertParameter(new sap.ui.unified.FileUploaderParameter({
							name: "SubfolderId",
							value: pgiData.AddAttachment.SubfolderId
						}));
						oFileUploader.insertParameter(new sap.ui.unified.FileUploaderParameter({
							name: "ActFileName",
							value: sFileName
						}));
						oFileUploader.insertParameter(new sap.ui.unified.FileUploaderParameter({
							name: "ActFileDescription",
							value: descr
						}));
						oFileUploader.insertParameter(new sap.ui.unified.FileUploaderParameter({
							name: "Url",
							value: sUrl
						}));
						// oFileUploader.insertParameter (new sap.ui.unified.FileUploaderParameter({name: "ItemType", value: pgiData.AddAttachment.ItemType }));

						oFileUploader.insertHeaderParameter(new sap.ui.unified.FileUploaderParameter({
							name: "slug",
							value: oFileUploader.getValue()
						}));
						// oFileUploader.insertHeaderParameter (new sap.ui.unified.FileUploaderParameter({name: "RpmGuid", value: pgiData.AddAttachment.RpmGuid }));
						//          		oFileUploader.insertHeaderParameter (new sap.ui.unified.FileUploaderParameter({name: "RpmGuidC", value: pgiData.AddAttachment.RpmGuidC }));

						oFileUploader.setModel(this.getModel("PPM"), "PPM");
						// oFileUploader.upload();
						that.createItemAttachment(ItemCreAttachment, oFileUploader);

					}
				}),
				endButton: new sap.m.Button({
					text: that.getModel("i18n").getResourceBundle().getText("PAttCancel"),
					press: function() {
						// that.getOwnerComponent().getModel("masterShared").setProperty("/oDetailBusy/busy", false); // Stop Spinner
						// that.getOwnerComponent().getModel("masterShared").refresh(false);
						dialog.close();
					}
				}),
				afterClose: function() {
					dialog.destroy();
				}
			});
			dialog.setModel(oBaseModel, "PPM");
			dialog.setModel(this.getModel("PGI"), "PGI");
			dialog.setModel(this.getModel("i18n"), "i18n");
			this.attachmentDialog = dialog;
			pgiModel.refresh(false);
			dialog.open();
		},
		createItemAttachment: function(oItemAttachment, oFileUploader) {
			// pgiData.CurrentMode === "Create"
			var that = this;
			var oBaseModel = sap.ui.getCore().getModel("PPM");

			console.log("data setup for createItemAttachment");
			oBaseModel.create("/CreUrlAttachSet", oItemAttachment, {
				success: function(oData, oResponse) {
					console.log("Success in creating ItemsList:" + oResponse.statusCode);
					if (oItemAttachment.Url === "") {
						console.log("New created Document GUID:" + oData.DocumentGuid);
						// DocumentGUID passed to backend instead of RpmGuidC to ensure unique row in ZIM_TEMP_ATTACH temp table is retrieved 
						var sPath = "/sap/opu/odata/sap/ZIM_MAIN_SRV/ItemsList(RpmGuid=binary\'" + oData.RpmGuidC + "\',RpmGuidC=\'" + oData.DocumentGuid +
							"\')/ItemCreAttachment";

						// addAttachment.uploadUrl = sPath;
						oFileUploader.setUploadUrl(sPath);
						oFileUploader.setModel(oBaseModel, "PPM");
						oFileUploader.upload();
					} else {
						// that.getItemAttachments();
						sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStopSpinner", {});
						that.getModel("PGI").setProperty("/AttachmentDialogBusy", false); // Stop Spinner
						that.getModel("PGI").refresh(false);

						sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.projectdetail", "refreshAttachments", {});
					}
					// var sPath  = "/ItemCreAttachments("
					// addAttachment.uploadUrl = "/sap/opu/odata/sap/ZIM_MAIN_SRV/ItemCreAttachment(RpmGuid=binary\'" + addAttachment.RpmGuidC +  "\',RpmGuidC=\'" + addAttachment.RpmGuidC +  
					// 						"\',ActFileId=\'" + addAttachment.ActFileId + "\',FolderId=\'" + addAttachment.FolderId + "\',SubfolderId=\'" + addAttachment.SubfolderId + "\')";

					// {"RpmGuid":"AFBWokc+HueQv38kjDerZw==","RpmGuidC":"005056A2473E1EE790BF7F248C37AB67","ActFileId":"IM000172","FolderId":"9999","SubfolderId":"01","ActFileName":"t2.xlsx","ActFileDescription":"test 1","Url":""}

					// var sPath = "/sap/opu/odata/sap/ZIM_MAIN_SRV/ItemsCreAttachment(RpmGuid=binary\'" + oItemAttachment.RpmGuidC +  "\',RpmGuidC=\'" + oItemAttachment.RpmGuidC +  
					// 				"\',DocumentGuid=\'" + oData.DocumentGuid + "\',ActFileId=\'" + oItemAttachment.ActFileId 
					// + "\',FolderId=\'" + oItemAttachment.FolderId + "\',oItemAttachment=\'" + oItemAttachment.SubfolderId + "\')";
					// var sPath = "/sap/opu/odata/sap/ZIM_MAIN_SRV/ItemsList(RpmGuid=binary\'" + oItemAttachment.RpmGuidC +  "\',RpmGuidC=\'" + oItemAttachment.RpmGuidC +  
					// 				"\')/ItemCreAttachment";
					// oFileUploader.insertHeaderParameter(new sap.ui.unified.FileUploaderParameter({name: "slug", 
					// 																	value: oFileUploader.getValue() }));
					//oFileUploader.uploadUrl = sPath;
					// oFileUploader.setModel(oBaseModel, "PPM");
					// oFileUploader.upload ();

				},
				error: function(oError) {
					var sMessage = that.getModel("i18n").getResourceBundle().getText("PGI_CreateprojectError", [oError]);
					MessageToast.show(sMessage);
					oError.ErrorOrigin = "CreateItemAttachment";
					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
				}
			});
		},
		handleUploadComplete: function(oEvent) {
			console.log("handleUploadComplete");
			var sMessage = this.getModel("i18n").getResourceBundle().getText("PGI_UploadComplete");
			MessageToast.show(sMessage);
			if (this.attachmentDialog) {
				this.attachmentDialog.close();
				this.attachmentDialog.destroy();
				this.attachmentDialog = null;

				this.getItemAttachments();
				this.getModel("PGI").setProperty("/AttachmentDialogBusy", false); // Stop Spinner
				this.getModel("PGI").refresh(false);

				sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStopSpinner", {});
			}
		},
		onDeleteAttachment: function(oEvent) {

			var params = oEvent.getParameters();
			var oBaseModel = this.getModel("PPM");
			var fragmentId = this.getView().createId("attchmnt");
			var oTreeTable = sap.ui.core.Fragment.byId(fragmentId, "TreeTableAttachment");
			var pgiModel = this.getModel("PGI");
			var pgiData = pgiModel.getData();
			var selectedIndex = oTreeTable.getSelectedIndex();
			var sPath = oTreeTable.getContextByIndex(selectedIndex).getPath();
			var selectedRow = pgiModel.getProperty(sPath);

			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStartSpinner", {});
			// var pgiModel = this.getModel("PGI");
			// var sPath = oEvent.getSource().getBindingContext("PGI").getPath();
			// var oRow = pgiModel.getProperty(sPath);

			// var fragmentId = this.getView().createId("attchmnt");
			var oUpload = sap.ui.core.Fragment.byId(fragmentId, "UploadCollection");

			var items = oUpload.getItems();
			// for (var i = 0; i < items.length; i++) {
			// 	var oUploadItem = items[i];
			// 	var sDeletePath = oUploadItem.getBindingContext("PGI").getPath();
			// 	var currentRow = pgiModel.getProperty(sDeletePath);
			// 	sDeletePath = currentRow.__metadata.uri.substring(currentRow.__metadata.uri.lastIndexOf("/"));
			// 	console.log("row:" + i + ":" + sDeletePath   );							
			// }
			for (var i = 0; i < items.length; i++) {
				var oUploadItem = items[i];
				var sDeletePath = oUploadItem.getBindingContext("PGI").getPath();
				var currentRow = pgiModel.getProperty(sDeletePath);
				if (selectedRow.DocumentGuid === currentRow.DocumentGuid) {
					var that = this;
					MessageBox.confirm(
						this._oResourceBundle.getText("PAttConfirmAttachmentDeleteMessage", [selectedRow.Text]), {
							// styleClass: oComponent.getContentDensityClass(),
							onClose: function(oAction) {
								if (oAction === sap.m.MessageBox.Action.OK) {
									// that.deleteAttachment(oEvent);
									// oUpload.downloadItem(oUploadItem, true);
									oBaseModel = sap.ui.getCore().getModel("PPM");
									sDeletePath = currentRow.__metadata.uri.substring(currentRow.__metadata.uri.lastIndexOf("/"));
									console.log("Deleting ItemAttachment row:" + sDeletePath);
									console.log("Deleting ItemAttachment:" + selectedRow.Text + "::" + currentRow.ActFileDescription);

									oBaseModel.remove(sDeletePath, {
										"success": function(oData, response) {
											console.log("Success in Batch: Deleting Item Attachment:");
											var sMessage = that.getModel("i18n").getResourceBundle().getText("PAttDeleteAttachmentSuccess", [selectedRow.Text]);
											MessageToast.show(sMessage);
											sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStopSpinner", {});
											sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.projectdetail", "refreshAttachments", {});
										},
										"error": function(params) {
											console.log("Error in Deleting Item Attachment");
											sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStopSpinner", {});
											var sMessage = that.getModel("i18n").getResourceBundle().getText("PAttDeleteAttachmentError", [params]);
											MessageToast.show(sMessage);

										}
									});

									// oBaseModel.submitChanges({
									// 	"success": function(oData, response) {
									// 		console.log("Success in Batch: Deleting Item Attachment:");
									// 		var sMessage = that.getModel("i18n").getResourceBundle().getText("PGI_DeleteAttachmentError", [oItem.ItemDesc]);
									// 		MessageToast.show(sMessage);
									// 		that._navBack();
									// 		sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.projectdetail", "refreshAttachments", {});
									// 	},
									// 	"error": function(params) {
									// 		console.log("Error in Deleting Item Attachment");
									// 	}
									// });

								}
							}
						}
					);
					// oUpload.downloadItem(oUploadItem, true);
					i = items.length;
				}
			}

		},
		deleteAttachment: function(oEvent) {
			// var fragmentId = this.getView().createId("attchmnt");
			// var oTreeTable = sap.ui.core.Fragment.byId(fragmentId, "TreeTableAttachment");
			// var pgiModel = this.getModel("PGI");
			// var pgiData = pgiModel.getData();
			// var selectedIndex = oTreeTable.getSelectedIndex();
			// var sPath = oTreeTable.getContextByIndex(selectedIndex).getPath();
			// var selectedRow = pgiModel.getProperty(sPath);

			// Todo: delete the row and in success execute getItemAttachments		
		},
		onPAttRowSelectionChange: function(oEvent) {
			var fragmentId = this.getView().createId("attchmnt");
			var oTreeTable = sap.ui.core.Fragment.byId(fragmentId, "TreeTableAttachment");
			var pgiModel = this.getModel("PGI");
			var pgiData = pgiModel.getData();
			var selectedIndex = oTreeTable.getSelectedIndex();
			var sPath = "";
			var selectedRow;
			if (selectedIndex >= 0) {
				sPath = oTreeTable.getContextByIndex(selectedIndex).getPath();
				if (sPath !== "") {
					selectedRow = pgiModel.getProperty(sPath);
				}
			}

			if (selectedIndex >= 0) {
				if (selectedRow && selectedRow.nodeType !== "Folder") {
					pgiData.Visible.PAttDelete = true;
					pgiData.Visible.PAttAdd = false;
				} else {
					pgiData.Visible.PAttDelete = false;
					pgiData.Visible.PAttAdd = true;
				}
				pgiModel.refresh(false);
			}
		},
		onCollapse: function() {
			var fragmentId = this.getView().createId("attchmnt");
			var oTreeTable = sap.ui.core.Fragment.byId(fragmentId, "TreeTableAttachment");
			oTreeTable.collapseAll();
			oTreeTable.expandToLevel(0);
			// this._setRowStyle();
		},

		onExpand: function() {
			var fragmentId = this.getView().createId("attchmnt");
			var oTreeTable = sap.ui.core.Fragment.byId(fragmentId, "TreeTableAttachment");
			oTreeTable.expandToLevel(2);
			// this._setRowStyle();
		},
		// Project Change Logs Methods
		configChangeLogsScreen: function() {
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();

			if (pgiData.ChangeLogTimeFrame) {
				pgiData.ChangeLogTimeFrame.SelectedKey = "";
				return;
			}

			pgiData.ChangeLogTimeFrame = {};
			pgiData.ChangeLogTimeFrame.All = [{
				"Key": "Today",
				"Description": "Today"
			}, {
				"Key": "1 Week",
				"Description": "1 Week"
			}, {
				"Key": "1 Month",
				"Description": "1 Month"
			}, {
				"Key": "1 Year",
				"Description": "1 Year"
			}, {
				"Key": "Manual",
				"Description": "Manual"
			}];
			pgiData.ChangeLogTimeFrame.SelectedKey = "";
			pgiData.ChangeLogTimeFrame.FromDt = new Date();
			pgiData.ChangeLogTimeFrame.ToDt = new Date();
			pgiData.ChangeLogTimeFrame.FromDtEditable = false;
			pgiData.ChangeLogTimeFrame.ToDtEditable = false;

			pgiModel.refresh(false);
		},
		onPLogsTimeFrameChange: function(oEvent) {
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();
			var ppmData = this.getView().getModel("PPMData").getData();
			var today = new Date();
			var selectedKey = pgiData.ChangeLogTimeFrame.SelectedKey;

			for (var i = 0; i < ppmData.VHDocsPeriod.length; i++) {
				if (ppmData.VHDocsPeriod[i].Key === selectedKey) {
					if (selectedKey !== "KY") {
						// new Date (DateUtils.getSystemAdjISODate_fromDate (oDataIn.LaunchDate))
						pgiData.ChangeLogTimeFrame.FromDt = new Date(DateUtils.getSystemAdjISODate_fromDate(ppmData.VHDocsPeriod[i].DateFrom));
						pgiData.ChangeLogTimeFrame.ToDt = new Date(DateUtils.getSystemAdjISODate_fromDate(ppmData.VHDocsPeriod[i].DateTo));
						pgiData.ChangeLogTimeFrame.FromDtEditable = false;
						pgiData.ChangeLogTimeFrame.ToDtEditable = false;
					} else {
						pgiData.ChangeLogTimeFrame.FromDtEditable = true;
						pgiData.ChangeLogTimeFrame.ToDtEditable = true;
					}
					i = ppmData.VHDocsPeriod.length;
				}
			}

			// if (pgiData.ChangeLogTimeFrame.SelectedKey === "Today")
			// {
			// 	pgiData.ChangeLogTimeFrame.FromDt = today	;
			// 	pgiData.ChangeLogTimeFrame.ToDt = today	;
			// 	pgiData.ChangeLogTimeFrame.FromDtEditable = false	;
			// 	pgiData.ChangeLogTimeFrame.ToDtEditable = false	;
			// }
			// else if (pgiData.ChangeLogTimeFrame.SelectedKey === "1 Week")
			// {

			// 	pgiData.ChangeLogTimeFrame.ToDt = today	;
			// 	pgiData.ChangeLogTimeFrame.FromDt = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);;
			// 	pgiData.ChangeLogTimeFrame.FromDtEditable = false	;
			// 	pgiData.ChangeLogTimeFrame.ToDtEditable = false	;
			// }
			// else if (pgiData.ChangeLogTimeFrame.SelectedKey === "1 Month")
			// {
			// 	pgiData.ChangeLogTimeFrame.ToDt = new Date ()	;
			// 	pgiData.ChangeLogTimeFrame.FromDt = new Date(today.setMonth(today.getMonth() - 1));
			// 	pgiData.ChangeLogTimeFrame.FromDtEditable = false	;
			// 	pgiData.ChangeLogTimeFrame.ToDtEditable = false	;
			// }
			// else if (pgiData.ChangeLogTimeFrame.SelectedKey === "1 Year")
			// {
			// 	pgiData.ChangeLogTimeFrame.ToDt = new Date ()	;
			// 	pgiData.ChangeLogTimeFrame.FromDt = new Date(today.setYear(today.getYear() - 1));
			// 	pgiData.ChangeLogTimeFrame.FromDtEditable = false	;
			// 	pgiData.ChangeLogTimeFrame.ToDtEditable = false	;
			// }
			// else if (pgiData.ChangeLogTimeFrame.SelectedKey === "Manual")
			// {
			// 	pgiData.ChangeLogTimeFrame.FromDt = new Date ()	;
			// 	pgiData.ChangeLogTimeFrame.ToDt = new Date ()	;
			// 	pgiData.ChangeLogTimeFrame.FromDtEditable = true;
			// 	pgiData.ChangeLogTimeFrame.ToDtEditable = true;
			// 	pgiModel.refresh(false);
			// 	return;
			// }
			pgiModel.refresh(false);
			if (selectedKey !== "KY") {
				this.getItemChangeLogs(false);
			}
		},
		onPLogsSearch: function(oEvent) {
			this.getItemChangeLogs(false);
		},
		onClearPCLogsSettings: function(oEvent) {
			var fragmentId = this.getView().createId("logs");
			var oTable = sap.ui.core.Fragment.byId(fragmentId, "changeLogsList");
			var aColumns = oTable.getColumns();

			for (var i = 0; i < aColumns.length; i++) {
				oTable.filter(aColumns[i], null);
			}
		},
		formatDate: function(dDate) {
			if (dDate) {
				var d = new Date(dDate),
					month = '' + (dDate.getMonth() + 1),
					day = '' + dDate.getDate(),
					year = dDate.getFullYear();

				if (month.length < 2) month = '0' + month;
				if (day.length < 2) day = '0' + day;

				return [year, month, day].join('-');
			}
			return null;
		},
		getItemChangeLogs: function(bInitial) {
			var oBaseModel = sap.ui.getCore().getModel("PPM");
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();

			var oFilters = [];
			// Todo: fix the rpmGuid to current Guid
			var rpmGuidC = pgiData.Project.RpmGuidC;
			var additionalFilters = "";
			var urlParams = [];
			var sPath = "/ItemsList(RpmGuid=binary\'" + rpmGuidC + "\',RpmGuidC=\'" + rpmGuidC + "\')/ItemChangeLogSet";

			if (bInitial) {
				// additionalFilters = "?$top=5&$orderby=Udate%20desc";
				urlParams = {
					"$top": "10"
				};
			} else {
				// var sFromDt = this.formatDate(pgiData.ChangeLogTimeFrame.FromDt);
				// var sToDt = this.formatDate(pgiData.ChangeLogTimeFrame.ToDt);
				// additionalFilters = "?$filter=Udate ge datetime'" + sFromDt + "' and Udate le datetime'" + sToDt + "'&$orderby=Udate%20desc";
				var selectedKey = pgiData.ChangeLogTimeFrame.SelectedKey;
				sPath = "/ItemsList(RpmGuid=binary\'" + rpmGuidC + "\',RpmGuidC=\'" + rpmGuidC + "\')/ItemChangeLogSet";

				// var fromDt = new Date (DateUtils.getSystemAdjISODate_fromDate (pgiData.ChangeLogTimeFrame.FromDt));						 =  
				// var endDt		 = new Date (DateUtils.getSystemAdjISODate_fromDate (pgiData.ChangeLogTimeFrame.ToDt)) ;
				var fromDt = new Date(DateUtils.getSystemAdjISODate_fromDate(pgiData.ChangeLogTimeFrame.FromDt));
				var toDt = new Date(DateUtils.getSystemAdjISODate_fromDate(pgiData.ChangeLogTimeFrame.ToDt));

				oFilters.push(new sap.ui.model.Filter({
					path: "Udate",
					operator: sap.ui.model.FilterOperator.BT,
					// value1: "date'" + sFromDt + "'"
					value1: fromDt,
					value2: toDt
				}));
				oFilters.push(new sap.ui.model.Filter({
					path: "DocsPeriodKey",
					operator: sap.ui.model.FilterOperator.EQ,
					// value1: "date'" + sFromDt + "'"
					value1: pgiData.ChangeLogTimeFrame.SelectedKey
				}));
			}

			// console.log("Change Logs Path:" + sPath);
			var that = this;
			oBaseModel.read(sPath, {
				async: true,
				urlParameters: urlParams,
				filters: oFilters,
				success: function(oDataIn, oResponse) {
					that.setItemChangeLogs(that, oDataIn);
				},
				error: function(oError) {
					oError.ErrorOrigin = "ItemAttachmentsSet";
					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.detail", "Errors", oError);
				}
			});
		},
		setItemChangeLogs: function(oContext, oDataIn) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();
			var pgiModel = this.getView().getModel("PGI");
			var pgiData = pgiModel.getData();
			pgiData.ProjectChangeLogs = oDataIn.results;
			pgiModel.refresh(false);
		},
		displayQuestionaireDialog: function(oEvent) {

		}
	});

});