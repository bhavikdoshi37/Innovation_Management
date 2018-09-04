/*global history */
sap.ui.define([
	"colpal/ppm/projectmgmt/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/GroupHeaderListItem",
	"sap/ui/Device",
	"colpal/ppm/projectmgmt/model/formatter",
	"sap/m/MessageBox",
	"colpal/ppm/projectmgmt/model/GroupSortState",
	"colpal/ppm/projectmgmt/util/IPMUtils"
], function(BaseController, JSONModel, Filter, FilterOperator, GroupHeaderListItem, Device, formatter, MessageBox, GroupSortState, IPMUtils) {
	"use strict";

	return BaseController.extend("colpal.ppm.projectmgmt.controller.Master", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
		 * @public
		 */
		onInit: function() {
			// Control state model
			// var oList = this.byId("list");
			var oViewModel = this._createViewModel();
			
			// Put down master list's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the master list is
			// taken care of by the master list itself.
			// iOriginalBusyDelay = oList.getBusyIndicatorDelay();
			// this._oListSelector = this.getOwnerComponent().oListSelector;
			// this._oGroupSortState = new GroupSortState(oViewModel);
			
			// this._oList = oList;
			// keeps the filter and search state
			// this._oListFilterState = {
			// 	aFilter: [],
			// 	aSearch: []
			// };

			this.setModel(oViewModel, "masterView");
			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			// oList.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for the list
				// oViewModel.setProperty("/delay", iOriginalBusyDelay);
			// });

			this.getView().addEventDelegate({
				onBeforeFirstShow: function() {
					// this._oListSelector.setBoundMasterList(oList);
				}.bind(this)
			});
			
			var oModel = IPMUtils.getPPMModel(this);
			var oData = oModel.getData();
			oData.GlobalFilter = IPMUtils.getGlobalFilter();
			
			this.getView().setModel (oModel, "PPMData");
			// IPMUtils.getStaticData(this);   

			// this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
			// this.getRouter().attachBypassed(this.onBypassed, this);
			// this._oODataModel = this.getOwnerComponent().getModel();
			
			// this.getStaticData();
			// this.getInitiatives();
			
			// this.getModel("appView").getData().settings.mode = "HideMode";
			// this.getModel("appView").refresh(false);
		},
		onFilterChange: function(oEvent){
			var sSource = oEvent.getSource().getId();
			var oBaseModel = IPMUtils.getBaseModel(this);
			var ppmData = IPMUtils.getPPMModel(this).getData();
			
			if (sSource.includes("SubCategory"))
			{
				ppmData.GlobalFilter.SubcategoryKeyText = oEvent.getSource().getValue();
			}
			else if (sSource.includes("Category"))
			{
				// get SubCategories
				ppmData.GlobalFilter.CategoryKeyText = oEvent.getSource().getValue();
				// if (ppmData.GlobalFilter.CategoryKey === "")
				// {
					ppmData.GlobalFilter.SubcategoryKey = "";
					ppmData.GlobalFilter.SubcategoryKeyText = "";
					// ppmData.GlobalFilter.CategoryKeyText = "";
					if (ppmData.VHSubCategories && ppmData.VHSubCategories.CurrentGF)
					{
						ppmData.VHSubCategories.CurrentGF = [];
					}
				// }
				// else
				// {
					var oFilters = [];
					oFilters.push(new sap.ui.model.Filter({
						path: "Category",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: ppmData.GlobalFilter.CategoryKey
					}));
					var sPath = "/VHSubcategories";
					var oExclude = {};
					IPMUtils.readStaticData(oBaseModel, sPath, oExclude, oFilters, "VHSubcategoriesGF");
				// }
			}
			else if (sSource.includes("Division"))
			{
				if (ppmData.GlobalFilter.DivisionKey === "")
				{
					ppmData.GlobalFilter.HubKey = "";
					ppmData.GlobalFilter.HubKeyText = "";
					ppmData.GlobalFilter.DivisionKeyText = "";
					if (ppmData.VHHubs && ppmData.VHHubs.CurrentGF)
						ppmData.VHHubs.CurrentGF = [];
				}
				else
				{
					ppmData.GlobalFilter.DivisionKeyText = oEvent.getSource().getValue();
					ppmData.GlobalFilter.HubKey = "";
					// get Hubs
					var oFilters = [];
	
					oFilters.push(new sap.ui.model.Filter({
						path: "DivisionKey",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: ppmData.GlobalFilter.DivisionKey
					}));
					var sPath = "/VHHubs";
					IPMUtils.readStaticData(oBaseModel, sPath, oExclude, oFilters, "VHHubsGF");
				}
			}
			else if (sSource.includes("Hub"))
			{
				ppmData.GlobalFilter.HubKeyText = oEvent.getSource().getValue();
			}
			else if (sSource.includes("ProjectType"))
			{
				ppmData.GlobalFilter.InnovationKeyText = oEvent.getSource().getValue();
			}
			else if (sSource.includes("Phase"))
			{
				ppmData.GlobalFilter.PhaseKeyText = oEvent.getSource().getValue();
			}
			
			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.detail", "refresh", {});
			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.detail", "VariantChanged", {});
			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.detail", "setFooterText", {});
			
		},
		getBaseModel: function(){
			var oBaseModel = sap.ui.getCore().getModel("PPM");
			if (!oBaseModel)
			{
				var sServiceUrl = this.getOwnerComponent().getModel("masterShared").getProperty("/oServiceUrls/mainService");
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

		// move to util class
		getStaticData: function (){
			var oBaseModel = this.getBaseModel();
			var sPath = "/VHCategories";
			var oExclude = {};
			var filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHCategories");
			
			sPath = "/VHDivisions";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHDivisions");
			
			sPath = "/VHISubCategories";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHISubCategories");
			
			sPath = "/VHIRegions";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHIRegions");
			
			sPath = "/VHICategories";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHICategories");
			
			// Todo: once VHConsumerDiffs fixed uncomment this code
			// sPath = "/VHConsumerDiffs";
			// oExclude = {};
			// filters = [];
			// this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHConsumerDiffs");
			
			sPath = "/VHInnovationTypes";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHInnovationTypes");
				
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
			var oModel = oContext.getPPMModel (oContext);
			var oData = oModel.getData();
			if (entityName === "VHHubs")
			{
				oData.VHHubs = oDataIn.results;
			}
			else if (entityName === "VHBrands")
			{
				oData.VHBrands = oDataIn.results;
			} 
			else if (entityName === "VHSubBrands")
			{
				oData.VHSubBrands = oDataIn.results;
			}
			else if (entityName === "VHPhases")
			{
				oData.VHPhases = oDataIn.results;
			}
			else if (entityName === "VHStatus")
			{
				oData.VHStatus = oDataIn.results;
			}
			else if (entityName === "VHICategories")
			{
				oData.VHICategories = oDataIn.results;
			}
			else if (entityName === "VHIRegions")
			{
				oData.VHIRegions = oDataIn.results;
			}
			else if (entityName === "VHISubCategories")
			{
				oData.VHISubCategories = oDataIn.results;
			}
			else if (entityName === "VHInnovationTypes")
			{
				oData.VHInnovationTypes = oDataIn.results;
			}
			else if (entityName === "VHConsumerDiffs")
			{
				oData.VHConsumerDiffs = oDataIn.results;
			}
			oContext.getView().setModel (oModel, "PPMData");
			oModel.refresh(false);
		},
		
		setCategories: function(oContext, oDataIn){
			var oModel = oContext.getPPMModel (oContext);
			var oData = oModel.getData();
			oData.VHCategories = oDataIn.results;
			oContext.getView().setModel (oModel, "PPMData");
			oModel.refresh(false);
		},
		setSubCategories: function(oContext, oDataIn){
			var oModel = oContext.getPPMModel (oContext);
			var oData = oModel.getData();
			oData.VHSubCategories = oDataIn.results;
			console.log ("Number of SubCategories:" + oData.VHSubCategories.length);
			oContext.getView().setModel (oModel, "PPMData");
			oModel.refresh(false);
		},
		setDivisions: function(oContext, oDataIn){
			var oModel = this.getPPMModel (oContext);
			var oData = oModel.getData();
			oData.VHDivisions = oDataIn.results;
			oContext.getView().setModel (oModel, "PPMData");
			oModel.refresh(false);
		},
		getInitiatives: function (){
			var oBaseModel = this.getBaseModel();
			var sPath = "/Initiatives";
			var oExclude = {};
			var filters = [];
			// if (oData.PlanningYear && oData.PlanningYear !== "") {
			// 	filters.push(new sap.ui.model.Filter("PlanningYear", sap.ui.model.FilterOperator.EQ,
			// 		oData.PlanningYear));
			// } else {
			// 	filters.push(new sap.ui.model.Filter("PlanningYear", sap.ui.model.FilterOperator.EQ,
			// 		this.getOwnerComponent().getModel(
			// 			"ASMConfig").getData().Properties.PlanningYear));
			// 	}
			
			var that = this;
			oBaseModel.read(sPath, {
					async: true,
					filters: filters,
					success: function(oDataIn, oResponse) {
						console.log("Success in reading Initiaitives");
						// that.getModel ()
						that.setInitiatives(that, oDataIn);
					},
					error: function(oError) {
						console.error("Error in geting Initiaitives:" + oError);
						//oError.ErrorOrigin = "MasterDataLoad";
						//sap.ui.getCore().getEventBus().publish("colgate.asm.planning.project", "Errors", oError);
					}
				});
			
		},

		setInitiatives: function (oContext, oDataIn)
		{
			var oModel = this.getPPMModel (oContext);
			var oData = oModel.getData();
			oData.Initiatives = oDataIn.results;
			console.log ("Number of Initiatives:" + oData.Initiatives.length);
			oContext.getView().setModel (oModel, "PPMData");
			oModel.refresh(false);
		},
		
		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		onListAll: function (oEvent) {
			//psutram: TODO: ensure this navigation is to a full page
			this.getRouter().navTo("initiativeList");
			
		},

		/**
		 * After list data is available, this handler method updates the
		 * master list counter and hides the pull to refresh control, if
		 * necessary.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function(oEvent) {
			// update the master list object counter after new data is loaded
			this._updateListItemCount(oEvent.getParameter("total"));
			// hide pull to refresh if necessary
			this.byId("pullToRefresh").hide();
			this._findItem();
			this.getModel("appView").setProperty("/addEnabled", true);
		},

		/**
		 * Event handler for the master search field. Applies current
		 * filter value and triggers a new search. If the search field's
		 * 'refresh' button has been pressed, no new search is triggered
		 * and the list binding is refresh instead.
		 * @param {sap.ui.base.Event} oEvent the search event
		 * @public
		 */
		onSearch: function(oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
				return;
			}

			var sQuery = oEvent.getParameter("query");

			if (sQuery) {
				this._oListFilterState.aSearch = [new Filter("InitiativeName", FilterOperator.Contains, sQuery)];
			} else {
				this._oListFilterState.aSearch = [];
			}
			this._applyFilterSearch();

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function() {
			this._oList.getBinding("items").refresh();
		},

		/**
		 * Event handler for the sorter selection.
		 * @param {sap.ui.base.Event} oEvent the select event
		 * @public
		 */
		onSort: function(oEvent) {
			var sKey = oEvent.getSource().getSelectedItem().getKey();
			// aSorters = this._oGroupSortState.sort(sKey);
			// this._applyGroupSort(aSorters);
			var aSorter = [];
			var oBinding = this._oList.getBinding("items");
			var currentSorter ;
			var sortKey = sKey;
	        var bDescending = true;
	        var bGroup = false;
	        var aSorter = [];
			if (oBinding && oBinding.aSorters)
			{
				currentSorter = oBinding.aSorters;
				if (currentSorter[0].sPath === sKey)
				{
					bDescending = !currentSorter[0].bDescending;		
				}
			}
			
	        aSorter.push(new sap.ui.model.Sorter(sortKey, bDescending, bGroup));
	        oBinding.sort(aSorter);

		},

		onOpenViewSettings: function() {
			if (!this._oViewSettingsDialog) {
				
				this._oViewSettingsDialog = sap.ui.xmlfragment("colpal.ppm.projectmgmt.view.ViewSettingsDialog", this);
				var oModel = this.getPPMModel (this);
				var filterData = oModel.getData();
				if (!filterData.MasterFilter)
				{
					filterData.MasterFilter = {"Division": ""};
				}
				this._oViewSettingsDialog.setModel (oModel, "PPMData");
				// this.setModel (oModel, "PPMData");
				this.getView().addDependent(this._oViewSettingsDialog);
				// forward compact/cozy style into Dialog
				this._oViewSettingsDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
			}
			this._oViewSettingsDialog.open();
		},
		onConfirmViewSettingsDialog: function(oEvent){
			var aFilterItems = oEvent.getParameters().filterItems,
				aFilters = [],
				aCaptions = [];

			var oModel = this.getPPMModel(this);
			var filterData = oModel.getData().MasterFilter;
			
			// var oFilter = new sap.ui.model.Filter("Name",sap.ui.model.FilterOperator.EQ, "CCCC");
			// var oFilter1 = new sap.ui.model.Filter("Id",sap.ui.model.FilterOperator.Contains, "CCCC");
			// var comFil = new sap.ui.model.Filter([oFilter,oFilter1]);
			
			if (filterData.Division !== "")
			{
				var oFilter = new sap.ui.model.Filter("RegionKey",sap.ui.model.FilterOperator.EQ, filterData.Division);
				aFilters.push(oFilter);
			}

			// // update filter state:
			// // combine the filter array and the filter string
			// aFilterItems.forEach(function(oItem) {
			// 	switch (oItem.getKey()) {
			// 		case "Filter1":
			// 			aFilters.push(new Filter("GrossAmount", FilterOperator.LE, 100));
			// 			break;
			// 		case "Filter2":
			// 			aFilters.push(new Filter("GrossAmount", FilterOperator.GT, 100));
			// 			break;
			// 		default:
			// 			break;
			// 	}
			// 	aCaptions.push(oItem.getText());
			// });

			this._oListFilterState.aFilter = aFilters;
			this._updateFilterBar(aCaptions.join(", "));
			this._applyFilterSearch();
			
		},
		/**
		 * Event handler for the list selection event
		 * @param {sap.ui.base.Event} oEvent the list selectionChange event
		 * @public
		 */
		onSelectionChange: function(oEvent) {
			var that = this;
			var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var fnLeave = function() {
				that._oODataModel.resetChanges();
				that._showDetail(oItem);
			};
			if (this._oODataModel.hasPendingChanges()) {
				this._leaveEditPage(fnLeave);
			} else {
				this._showDetail(oItem);
			}
			// that.getModel("appView").setProperty("/addEnabled", true);
		},

		/**
		 * Event handler for the bypassed event, which is fired when no routing pattern matched.
		 * If there was an object selected in the master list, that selection is removed.
		 * @public
		 */
		onBypassed: function() {
			this._oList.removeSelections(true);
		},

		/**
		 * Used to create GroupHeaders with non-capitalized caption.
		 * These headers are inserted into the master list to
		 * group the master list's items.
		 * @param {Object} oGroup group whose text is to be displayed
		 * @public
		 * @returns {sap.m.GroupHeaderListItem} group header with non-capitalized caption.
		 */
		createGroupHeader: function(oGroup) {
			return new GroupHeaderListItem({
				title: oGroup.text,
				upperCase: false
			});
		},

		/**
		 * Navigates back in the browser history, if the entry was created by this app.
		 * If not, it navigates to the Fiori Launchpad home page
		 * @override
		 * @public
		 */
		onNavBack: function() {
			var oHistory = sap.ui.core.routing.History.getInstance(),
				sPreviousHash = oHistory.getPreviousHash(),
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

			if (sPreviousHash !== undefined) {
				// The history contains a previous entry
				history.go(-1);
			} else {
				// Navigate back to FLP home
				oCrossAppNavigator.toExternal({
					target: {
						shellHash: "#Shell-home"
					}
				});
			}
		},

		/**
		 * Event handler  (attached declaratively) called when the add button in the master view is pressed. it opens the create view.
		 * @public
		 */
		onAdd: function() {
			this.getModel("appView").setProperty("/addEnabled", false);
			this.getRouter().getTargets().display("create");

		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Creates the model for the view
		 * @private
		 */
		_createViewModel: function() {
			return new JSONModel({
				isFilterBarVisible: false,
				filterBarLabel: "",
				delay: 0,
				title: this.getResourceBundle().getText("masterTitle"),
				noDataText: this.getResourceBundle().getText("masterListNoDataText"),
				sortBy: "InitiativeName",
				groupBy: "None"
			});
		},

		/**
		 * Ask for user confirmation to leave the edit page and discard all changes
		 * @param {object} fnLeave - handles discard changes
		 * @param {object} fnLeaveCancelled - handles cancel
		 * @private
		 */
		_leaveEditPage: function(fnLeave, fnLeaveCancelled) {
			var sQuestion = this.getResourceBundle().getText("warningConfirm");
			var sTitle = this.getResourceBundle().getText("warning");

			MessageBox.show(sQuestion, {
				icon: MessageBox.Icon.WARNING,
				title: sTitle,
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				onClose: function(oAction) {
					if (oAction === MessageBox.Action.OK) {
						fnLeave();
					} else if (fnLeaveCancelled) {
						fnLeaveCancelled();
					}
				}
			});
		},

		/**
		 * If the master route was hit (empty hash) we have to set
		 * the hash to to the first item in the list as soon as the
		 * listLoading is done and the first item in the list is known
		 * @private
		 */
		_onMasterMatched: function() {
			this._oListSelector.oWhenListLoadingIsDone.then(
				function(mParams) {
					if (mParams.list.getMode() === "None") {
						return;
					}
					this.getModel("appView").setProperty("/addEnabled", true);
					if (!mParams.list.getSelectedItem()) {
						this.getRouter().navTo("object", {
							ID: encodeURIComponent(mParams.firstListitem.getBindingContext().getProperty("ID"))
						}, true);
					}
				}.bind(this),
				function(mParams) {
					if (mParams.error) {
						return;
					}
					this.getRouter().getTargets().display("detailNoObjectsAvailable");
				}.bind(this)
			);
		},

		/**
		 * Shows the selected item on the detail page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showDetail: function(oItem) {
			var bReplace = !Device.system.phone;
			console.log("Master Controller: Show Detail: RPMGuid:" + oItem.getBindingContext("PPMData").getProperty("RpmGuid"));
			var sPath = oItem.getBindingContext("PPMData").sPath;
			this.getRouter().navTo("object", {
				// ID: encodeURIComponent(oItem.getBindingContext().getProperty("IID"))
				contextPath : encodeURIComponent(sPath)
				// RpmGuid : oItem.getBindingContext("PPMData").getProperty("RpmGuid"),
				// IniGuid : oItem.getBindingContext("PPMData").getProperty("IniGuid")
			}, bReplace);
		},

		/**
		 * Sets the item count on the master list header
		 * @param {integer} iTotalItems the total number of items in the list
		 * @private
		 */
		_updateListItemCount: function(iTotalItems) {
			var sTitle;
			// only update the counter if the length is final
			if (this._oList.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
				this.getModel("masterView").setProperty("/title", sTitle);
			}
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @private
		 */
		_applyFilterSearch: function() {
			// var aFilters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter);
			// var oViewModel = this.getModel("masterView");
			// var oModel = this.getPPMModel(this);
			// var ppmData = oModel.getData();
			
			// this._oList.getBinding("items").filter(aFilters, sap.ui.model.FilterType.Application);
			
			
			var oFilter = new sap.ui.model.Filter("RegionKey",sap.ui.model.FilterOperator.EQ, "2");
			// var oFilter1 = new sap.ui.model.Filter("Id",sap.ui.model.FilterOperator.Contains, "CCCC");
			var comFil = new sap.ui.model.Filter(this._oListFilterState.aFilter);
			// var oList = sap.ui.getCore().byId("dealerList");
			this._oList.getBinding("items").filter(oFilter, sap.ui.model.FilterType.Application);

			
			// changes the noDataText of the list in case there are no filter results
			// if (aFilters.length !== 0) {
			// 	oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataWithFilterOrSearchText"));
			// } else if (this._oListFilterState.aSearch.length > 0) {
			// 	// only reset the no data text to default when no new search was triggered
			// 	oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataText"));
			// }
		},

		/**
		 * Internal helper method to apply both group and sort state together on the list binding
		 * @private
		 */
		_applyGroupSort: function(aSorters) {
			this._oList.getBinding("items").sort(aSorters);
		},

		/**
		 * Internal helper method that sets the filter bar visibility property and the label's caption to be shown
		 * @param {string} sFilterBarText the selected filter value
		 * @private
		 */
		_updateFilterBar: function(sFilterBarText) {
			var oViewModel = this.getModel("masterView");
			oViewModel.setProperty("/isFilterBarVisible", (this._oListFilterState.aFilter.length > 0));
			oViewModel.setProperty("/filterBarLabel", this.getResourceBundle().getText("masterFilterBarText", [sFilterBarText]));
		},

		/**
		 * Internal helper method that adds "/" to the item's path 
		 * @private
		 */
		_fnGetPathWithSlash: function(sPath) {
			return (sPath.indexOf("/") === 0 ? "" : "/") + sPath;
		},

		/**
		 * It navigates to the saved itemToSelect item. After delete it navigate to the next item. 
		 * After add it navigates to the new added item if it is displayed in the tree. If not it navigates to the first item.
		 * @private
		 */
		_findItem: function() {
			var itemToSelect = this.getModel("appView").getProperty("/itemToSelect");
			if (itemToSelect) {
				var sPath = this._fnGetPathWithSlash(itemToSelect);
				var oItem = this._oListSelector.findListItem(sPath);
				if (!oItem) { //item is not viewable in the tree. not in the current tree page.
					oItem = this._oListSelector.findFirstItem();
					if (oItem) {
						sPath = oItem.getBindingContext().getPath();
					} else {
						this.getRouter().getTargets().display("detailNoObjectsAvailable");
						return;
					}
				}
				this._oListSelector.selectAListItem(sPath);
				this._showDetail(oItem);
			}
		}

	});
});