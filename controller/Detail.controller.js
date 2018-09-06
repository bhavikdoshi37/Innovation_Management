/*global location */
sap.ui.define([
	"colpal/ppm/projectmgmt/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"colpal/ppm/projectmgmt/model/formatter",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"colpal/ppm/projectmgmt/util/IPMUtils",
	"colpal/ppm/projectmgmt/util/ColumnCatalog",
	"colpal/ppm/projectmgmt/util/PersonalizationUtils",
	"colpal/ppm/projectmgmt/util/DateUtils",
	'sap/ui/model/Filter',
	'sap/ui/model/Sorter',
	'sap/ui/core/util/Export',
	'sap/ui/core/util/ExportTypeCSV'
], function(BaseController, JSONModel, formatter, MessageBox, MessageToast, IPMUtils, ColumnCatalog,
	PersonalizationUtils, DateUtils, Filter, Sorter, Export, ExportTypeCSV) {
	"use strict";

	return BaseController.extend("colpal.ppm.projectmgmt.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function() {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0,
				lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading"),
				createProjectVisible: false
			});

			var ppmModel = IPMUtils.getPPMModel(this);

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			// this.getRouter().getTargets().getTarget("object").attachDisplay(null, this._onObjectMatched, this);
			oViewModel.setSizeLimit(5000);
			this.setModel(oViewModel, "detailView");

			// this.setModel(oViewModel, "projectView");
			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
			this._oODataModel = this.getOwnerComponent().getModel();
			this._oResourceBundle = this.getResourceBundle();
			this.clearFilterEvent = false;
			var oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.subscribe("colgate.ppm.projectmgmt.detail", "initCompleted",
				function(sChannelId, sEventId, oData) {
					console.log("Event initCompleted");
					this.initPersonalize();
				}, this);

			oEventBus.subscribe("colgate.ppm.projectmgmt.detail", "getStaticData",
				function(sChannelId, sEventId, oData) {
					console.log("Event getStaticData");
					this.getStaticData(this);
				}, this);

			oEventBus.subscribe("colgate.ppm.projectmgmt.detail", "refresh",
				function(sChannelId, sEventId, oData) {
					console.log("Event refresh");
					this.getProjects();
				}, this);

			// 
			oEventBus.subscribe("colgate.ppm.projectmgmt.detail", "VariantChanged",
				function(sChannelId, sEventId, oData) {
					this.__setVariantChangedIndicator();
				}, this);

			oEventBus.subscribe("colgate.ppm.projectmgmt.detail", "setFooterText",
				function(sChannelId, sEventId, oData) {
					this.setFooterText();
				}, this);

			// oEventBus.subscribe("colgate.ppm.projectmgmt.detail", "AppNotBusy",
			// 	function(sChannelId, sEventId, oData) {
			// 		this.getOwnerComponent().getModel("masterShared").setProperty("/busy", false); // Stop Spinner
			// 		this.getOwnerComponent().getModel("masterShared").refresh(false);

			// 	}, this);

			// oEventBus.subscribe("colgate.ppm.projectmgmt.detail", "AppBusy",
			// 	function(sChannelId, sEventId, oData) {
			// 		this.getOwnerComponent().getModel("masterShared").setProperty("/busy", true); // Stop Spinner
			// 		this.getOwnerComponent().getModel("masterShared").refresh(true);

			// 	}, this);

			// this.getStaticData(this);

			// this.getProjects();
			// this.initPersonalize();

			// sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.detail", "initCompleted", {});

			oEventBus.subscribe("colgate.ppm.projectmgmt.detail", "InitializationComplete", function(sChannelId, sEventId, oData) {
				// Update table personalization
				if (this.getOwnerComponent().getModel("masterShared") && this.getOwnerComponent().getModel("masterShared").getData()) {
					if (!this.getOwnerComponent().getModel("masterShared").getProperty("/oInternalEvents/activityPersonalizedInitialized")) {
						this.getOwnerComponent().getModel("masterShared").setProperty("/oInternalEvents/activityPersonalizationInitialized", true);
						this.initPersonalize();
						this._setUpInitialVariant();
						this.getProjects();
						IPMUtils.getStaticData(this);
						// this._onRefresh();
					}
				}
				// this._confirmHeaderVisibilitySettings();
			}, this);

			var dateType = new sap.ui.model.type.Date({
				source: {
					pattern: "MMM dd, yyyy"
				},
				pattern: "MMM dd, yyyy"
			});
			this._dateType = dateType;

			/*
				var fragmentId = this.getView().createId("general");
				var oTable = sap.ui.core.Fragment.byId(fragmentId, "lineItemsList");
				var aColumns = oTable.getColumns();
			
				// console.log("Number of Columns:" + aColumns.length);
				for (var i = 0; i < aColumns.length; i++)
				{
					if (aColumns[i].getSortProperty().includes("Date"))
					{
						aColumns[i].setFilterType(dateType);
					}
				}
				*/
			this.addDateFilters();
			// required for accessing elements in a fragment
			// var prefix = this.getView().createId("").replace("--", "");
			// var fragment = sap.ui.xmlfragment(prefix, "colpal.ppm.projectmgmt.fragment.ProjectList", this);
		},

		addDateFilters: function() {
			var dateType = new sap.ui.model.type.Date({
				source: {
					pattern: "MMM dd, yyyy"
				},
				pattern: "MMM dd, yyyy"
			});

			var fragmentId = this.getView().createId("general");
			var oTable = sap.ui.core.Fragment.byId(fragmentId, "lineItemsList");
			var aColumns = oTable.getColumns();

			// console.log("Number of Columns:" + aColumns.length);
			for (var i = 0; i < aColumns.length; i++) {
				if (aColumns[i].getSortProperty().includes("Date")) {
					aColumns[i].setFilterType(dateType);
				}
			}
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onShareEmailPress: function() {
			var oViewModel = this.getModel("detailView");

			sap.m.URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},
		getBaseModel: function(oContext) {
			var oBaseModel = sap.ui.getCore().getModel("PPM");
			if (!oBaseModel) {
				var sServiceUrl = this.getOwnerComponent().getModel("masterShared").getProperty("/oServiceUrls/mainService");
				oBaseModel = new sap.ui.model.odata.v2.ODataModel(sServiceUrl);
				oBaseModel.setSizeLimit(5000);
				oBaseModel.setDefaultCountMode(sap.ui.model.odata.CountMode.None);
				sap.ui.getCore().setModel(oBaseModel, "PPM");
			}
			return oBaseModel;
		},
		onShareInJamPress: function() {
			var oViewModel = this.getModel("detailView"),
				oShareDialog = sap.ui.getCore().createComponent({
					name: "sap.collaboration.components.fiori.sharing.dialog",
					settings: {
						object: {
							id: location.href,
							share: oViewModel.getProperty("/shareOnJamTitle")
						}
					}
				});

			oShareDialog.open();
		},

		/**
		 * Updates the item count within the line item table's header
		 * @param {object} oEvent an event containing the total number of items in the list
		 * @private
		 */
		onListUpdateFinished: function(oEvent) {
			var sTitle,
				iTotalItems = oEvent.getParameter("total"),
				oViewModel = this.getModel("detailView");

			// only update the counter if the length is final
			if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
				if (iTotalItems) {
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
				} else {
					//Display 'Line Items' instead of 'Line items (0)'
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
				}
				oViewModel.setProperty("/lineItemListTitle", sTitle);
			}
		},

		/**
		 * Event handler (attached declaratively) for the view delete button. Deletes the selected item. 
		 * @function
		 * @public
		 */
		onDelete: function() {
			var that = this;
			var oViewModel = this.getModel("detailView"),
				sPath = oViewModel.getProperty("/sObjectPath"),
				sObjectHeader = this._oODataModel.getProperty(sPath + "/InitiativeName"),
				sQuestion = this._oResourceBundle.getText("deleteText", sObjectHeader),
				sSuccessMessage = this._oResourceBundle.getText("deleteSuccess", sObjectHeader);

			var fnMyAfterDeleted = function() {
				MessageToast.show(sSuccessMessage);
				oViewModel.setProperty("/busy", false);
				var oNextItemToSelect = that.getOwnerComponent().oListSelector.findNextItem(sPath);
				that.getModel("appView").setProperty("/itemToSelect", oNextItemToSelect.getBindingContext().getPath()); //save last deleted
			};
			this._confirmDeletionByUser({
				question: sQuestion
			}, [sPath], fnMyAfterDeleted);
		},

		onRowSelectionChange: function(oEvent) {
			// this.onEdit();
			var params = oEvent.getParameters();
			var sObjectPath;
			var selectedRow = params.rowIndex;
			if (selectedRow > -1) {
				sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStartSpinner", {});
				// sObjectPath = projectTable.getSelectedItem().getBindingContextPath();
				sObjectPath = params.rowContext.sPath;
				this.getRouter().getTargets().display("create", {
					mode: "Display",
					objectPath: sObjectPath
				});
			}

		},

		onEdit: function() {
			// psutram: ToDo modify to include selected row and call the router to open edit screen
			this.getModel("appView").setProperty("/addEnabled", false);
			var sObjectPath;
			var projectTable = this.byId("lineItemsList");
			// var selectedRow = projectTable.indexOfItem(projectTable.getSelectedItem())
			var selectedRow = projectTable.getSelectedIndex();
			if (selectedRow > -1) {
				// sObjectPath = projectTable.getSelectedItem().getBindingContextPath();
				sObjectPath = projectTable.getContextByIndex(4).sPath;
				this.getRouter().getTargets().display("create", {
					mode: "update",
					objectPath: sObjectPath
				});
			}

		},

		onAdd: function(oEvent) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var oData = oModel.getData();
			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStartSpinner", {});
			this.getRouter().getTargets().display("create", {
				mode: "Create",
				objectPath: oData.MasterContext
			});

		},

		_onObjectMatched: function(oEvent) {
			var oParameter = oEvent.getParameters();
			// for (var value in oParameter) {
			// 	oParameter[value] = decodeURIComponent(oParameter[value]);
			// }
			// this.getModel().metadataLoaded().then(function() {
			// 	var sObjectPath = this.getModel().createKey("Initiatives", "4FC608791B7E3650E1008000A7E414BB");

			// 	this._bindView("/" + sObjectPath);
			// }.bind(this));

			var sPath = decodeURIComponent(oParameter.arguments.contextPath);
			var oModel = sap.ui.getCore().getModel("PPMData");

			if (oModel) {
				var oData = oModel.getData();
				oData.MasterContext = sPath;
				var oObject = oModel.getObject(sPath);

				var rpmGuid = oObject.RpmGuidC;
				var iniGuid = oObject.IniGuidC;
				console.log("Object Selected:" + oObject.Id);
				// this.getProjectsByInitiative (rpmGuid,iniGuid);	
				this.getProjects();
			}

		},
		getProjects: function() {
			// var oBaseModel = sap.ui.getCore().getModel("PPM");
			var oBaseModel = this.getBaseModel();
			var ppmData = IPMUtils.getPPMModel().getData();

			// var sPath = "/Initiatives(binary'" + iniGuid + "')/ItemSet";
			var sPath = "/ItemsList";
			console.log("getProjectsByInitiaitive:URL:" + sPath);

			var oExclude = {};
			var oFilters = [];

			if (ppmData.GlobalFilter) {
				if (ppmData.GlobalFilter.DivisionKey !== "") {
					oFilters.push(new sap.ui.model.Filter({
						path: "DivisionKey",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: ppmData.GlobalFilter.DivisionKey
					}));
				}

				if (ppmData.GlobalFilter.HubKey !== "") {
					oFilters.push(new sap.ui.model.Filter({
						path: "HubKey",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: ppmData.GlobalFilter.HubKey
					}));
				}

				if (ppmData.GlobalFilter.CategoryKey !== "") {
					oFilters.push(new sap.ui.model.Filter({
						path: "CategoryKey",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: ppmData.GlobalFilter.CategoryKey
					}));
				}

				if (ppmData.GlobalFilter.SubcategoryKey !== "") {
					oFilters.push(new sap.ui.model.Filter({
						path: "SubcategoryKey",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: ppmData.GlobalFilter.SubcategoryKey
					}));
				}

				if (ppmData.GlobalFilter.InnovationKey !== "") {
					oFilters.push(new sap.ui.model.Filter({
						path: "InnovationKey",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: ppmData.GlobalFilter.InnovationKey
					}));
				}

				if (ppmData.GlobalFilter.PhaseKey !== "") {
					oFilters.push(new sap.ui.model.Filter({
						path: "PhaseKey",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: ppmData.GlobalFilter.PhaseKey
					}));
				}

			}
			// for now only Innovation Management projects are being displayed
			oFilters.push(new sap.ui.model.Filter({
				path: "ItemtypeKey",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: "9109"
			}));

			// this.getOwnerComponent().getModel("masterShared").setProperty("/busy", true); // Stop Spinner
			// this.getOwnerComponent().getModel("masterShared").refresh(false);
			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStartSpinner", {});
			var that = this;
			oBaseModel.read(sPath, {
				async: true,
				filters: oFilters,
				success: function(oDataIn, oResponse) {
					console.log("Success in reading ItemListSet:" + oDataIn.results.length);
					// that.setProjectsByInitiatives(that, oDataIn, iniGuid);
					that.setProjects(that, oDataIn);
				},
				error: function(oError) {
					console.error("Error in geting Initiaitives:" + oError);
					//oError.ErrorOrigin = "MasterDataLoad";
					//sap.ui.getCore().getEventBus().publish("colgate.asm.planning.project", "Errors", oError);
				}
			});
		},
		getProjectsByInitiative: function(rpmGuid, iniGuid) {
			// var oBaseModel = sap.ui.getCore().getModel("PPM");
			var oBaseModel = this.getBaseModel();
			var sPath = "/Initiatives(binary'" + iniGuid + "')/ItemSet";
			// sPath = "/Initiatives(RpmGuid=binary\'5314016ACE3A2EB0E1008000A7E414BB\',IniGuid=binary\'5314015DCE3A2EB0E1008000A7E414BB\')/ItemSet";
			// Initiatives(RpmGuid=binary'5314016ACE3A2EB0E1008000A7E414BB',IniGuid=binary'5314015DCE3A2EB0E1008000A7E414BB')/ItemListSet
			sPath = "/Initiatives(RpmGuid=binary\'" + rpmGuid + "\',IniGuid=binary\'" + iniGuid + "\')/ItemListSet";
			console.log("getProjectsByInitiaitive:URL:" + sPath);

			var oExclude = {};
			var filters = [];

			var that = this;
			oBaseModel.read(sPath, {
				async: true,
				filters: filters,
				success: function(oDataIn, oResponse) {
					console.log("Success in reading ItemListSet:" + oDataIn.results.length);
					that.setProjectsByInitiatives(that, oDataIn, iniGuid);
				},
				error: function(oError) {
					console.error("Error in geting Initiaitives:" + oError);
					//oError.ErrorOrigin = "MasterDataLoad";
					//sap.ui.getCore().getEventBus().publish("colgate.asm.planning.project", "Errors", oError);
				}
			});
		},
		setProjects: function(oContext, oData) {
			var oModel = IPMUtils.getPPMModel(oContext);
			var ppmData = oModel.getData();

			if (!ppmData.Items) {
				ppmData.Items = {};
			}
			ppmData.Items.Current = oData.results;
			for (var i = 0; i < ppmData.Items.Current.length; i++) {
				ppmData.Items.Current[i].LaunchDate = new Date(DateUtils.getSystemAdjISODate_fromDate(ppmData.Items.Current[i].LaunchDate));

				// psutram: temp code remove
				// if (ppmData.Items.Current[i].ZimGrid !== "")
				// {
				// 		console.log("+++++ZimGrid not empty:" + ppmData.Items.Current[i].ItemId + ":" + ppmData.Items.Current[i].ZimGrid);
				// }
				if (ppmData.Items.Current[i].ItemId.includes("289")) {
					console.log("Marketing Objective:" + ppmData.Items.Current[i].MarkobjeKey + ":" + ppmData.Items.Current[i].MarkobjeDesc);
				}

			}
			// ppmData.Items[iniGuid] = oData.results;

			oContext.getView().setModel(oModel, "PPMData");
			oModel.refresh(false);
			// this.setFooterText();

			this._applySort();
			this._applyFilter();
			// this.getOwnerComponent().getModel("masterShared").setProperty("/busy", false); // Stop Spinner
			// this.getOwnerComponent().getModel("masterShared").refresh(false);
			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.app.spinner", "AppStopSpinner", {});
		},
		setProjectsByInitiatives: function(oContext, oData, iniGuid) {
			var oModel = sap.ui.getCore().getModel("PPMData");
			var ppmData = oModel.getData();

			if (!ppmData.Items) {
				ppmData.Items = {};
			}
			ppmData.Items.Current = oData.results;
			ppmData.Items[iniGuid] = oData.results;

			oContext.getView().setModel(oModel, "PPMData");
			oModel.refresh(false);
		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: function(sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function() {
						oViewModel.setProperty("/busy", false); // originally true
					},
					dataReceived: function() {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		/**
		 * Event handler for binding change event
		 * @function
		 * @private
		 */

		_onBindingChange: function() {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding(),
				oViewModel = this.getModel("detailView"),
				oAppViewModel = this.getModel("appView");

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				// this.getRouter().getTargets().display("detailObjectNotFound");
				// // if object could not be found, the selection in the master list
				// // does not make sense anymore.
				// this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}

			var sPath = oElementBinding.getBoundContext().getPath(),
				oResourceBundle = this.getResourceBundle(),
				oObject = oView.getModel().getObject(sPath),
				sObjectId = oObject.ID,
				sObjectName = oObject.InitiativeName;

			oViewModel.setProperty("/sObjectId", sObjectId);
			oViewModel.setProperty("/sObjectPath", sPath);
			oAppViewModel.setProperty("/itemToSelect", sPath);
			this.getOwnerComponent().oListSelector.selectAListItem(sPath);

			oViewModel.setProperty("/saveAsTileTitle", oResourceBundle.getText("shareSaveTileAppTitle", [sObjectName]));
			oViewModel.setProperty("/shareOnJamTitle", sObjectName);
			oViewModel.setProperty("/shareSendEmailSubject",
				oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
			oViewModel.setProperty("/shareSendEmailMessage",
				oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
		},

		/**
		 * Event handler for metadata loaded event
		 * @function
		 * @private
		 */

		_onMetadataLoaded: function() {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay();
			var oViewModel = this.getModel("detailView");
			var oLineItemTable = this.byId("lineItemsList");
			// ToDo: check this code
			// var iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			// oViewModel.setProperty("/delay", 0);
			// oViewModel.setProperty("/lineItemTableDelay", 0);

			// oLineItemTable.attachEventOnce("updateFinished", function() {
			// 	// Restore original busy indicator delay for line item table
			// 	oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
			// });
			// end of changes psutram

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", false); // originally true
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},

		/**
		 * Opens a dialog letting the user either confirm or cancel the deletion of a list of entities
		 * @param {object} oConfirmation - Possesses up to two attributes: question (obligatory) is a string providing the statement presented to the user.
		 * title (optional) may be a string defining the title of the popup.
		 * @param {object} oConfirmation - Possesses up to two attributes: question (obligatory) is a string providing the statement presented to the user.
		 * @param {array} aPaths -  Array of strings representing the context paths to the entities to be deleted. Currently only one is supported.
		 * @param {callback} fnAfterDeleted (optional) - called after deletion is done. 
		 * @param {callback} fnDeleteCanceled (optional) - called when the user decides not to perform the deletion
		 * @param {callback} fnDeleteConfirmed (optional) - called when the user decides to perform the deletion. A Promise will be passed
		 * @function
		 * @private
		 */
		/* eslint-disable */ // using more then 4 parameters for a function is justified here
		_confirmDeletionByUser: function(oConfirmation, aPaths, fnAfterDeleted, fnDeleteCanceled, fnDeleteConfirmed) {
			/* eslint-enable */
			// Callback function for when the user decides to perform the deletion
			var fnDelete = function() {
				// Calls the oData Delete service
				this._callDelete(aPaths, fnAfterDeleted);
			}.bind(this);

			// Opens the confirmation dialog
			MessageBox.show(oConfirmation.question, {
				icon: oConfirmation.icon || MessageBox.Icon.WARNING,
				title: oConfirmation.title || this._oResourceBundle.getText("delete"),
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				onClose: function(oAction) {
					if (oAction === MessageBox.Action.OK) {
						fnDelete();
					} else if (fnDeleteCanceled) {
						fnDeleteCanceled();
					}
				}
			});
		},

		/**
		 * Performs the deletion of a list of entities.
		 * @param {array} aPaths -  Array of strings representing the context paths to the entities to be deleted. Currently only one is supported.
		 * @param {callback} fnAfterDeleted (optional) - called after deletion is done. 
		 * @return a Promise that will be resolved as soon as the deletion process ended successfully.
		 * @function
		 * @private
		 */
		_callDelete: function(aPaths, fnAfterDeleted) {
			var oViewModel = this.getModel("detailView");
			oViewModel.setProperty("/busy", true);
			var fnFailed = function() {
				this._oODataModel.setUseBatch(true);
			}.bind(this);
			var fnSuccess = function() {
				if (fnAfterDeleted) {
					fnAfterDeleted();
					this._oODataModel.setUseBatch(true);
				}
				oViewModel.setProperty("/busy", false);
			}.bind(this);
			return this._deleteOneEntity(aPaths[0], fnSuccess, fnFailed);
		},

		/**
		 * Deletes the entity from the odata model
		 * @param {array} aPaths -  Array of strings representing the context paths to the entities to be deleted. Currently only one is supported.
		 * @param {callback} fnSuccess - Event handler for success operation.
		 * @param {callback} fnFailed - Event handler for failure operation.
		 * @function
		 * @private
		 */
		_deleteOneEntity: function(sPath, fnSuccess, fnFailed) {
			var oPromise = new Promise(function(fnResolve, fnReject) {
				this._oODataModel.setUseBatch(false);
				this._oODataModel.remove(sPath, {
					success: fnResolve,
					error: fnReject,
					async: true
				});
			}.bind(this));
			oPromise.then(fnSuccess, fnFailed);
			return oPromise;
		},
		onListAll: function(oEvent) {
			//psutram: TODO: ensure this navigation is to a full page
			this.getRouter().navTo("projectList");

		},
		getStaticData: function() {
			var oBaseModel = this.getBaseModel();
			var sPath = "/VHCategories";
			var oExclude = {};
			var filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHCategories");

			sPath = "/VHDivisions";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHDivisions");

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
			sPath = "/VHConsumerDiffs";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHConsumerDiffs");

			sPath = "/VHStrategicFocus";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHStrategicFocus");

			sPath = "/VHCurrencies";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHCurrencies");

			sPath = "/VHProjectTypes";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "VHProjectTypes");

			sPath = "/UserInfoSet";
			oExclude = {};
			filters = [];
			this.readStaticData(oBaseModel, sPath, oExclude, filters, "UserInfoSet");

		},
		readStaticData: function(oModel, sPath, oExclude, oFilters, entityName) {
			var that = this;
			oModel.read(sPath, {
				async: true,
				filters: oFilters,
				success: function(oDataIn, oResponse) {
					console.log("Success in reading" + entityName);
					that.setData(that, oDataIn, entityName);
				},
				error: function(oError) {
					console.error("Error in reading:" + entityName + ": + oError");
					//oError.ErrorOrigin = "MasterDataLoad";
					//sap.ui.getCore().getEventBus().publish("colgate.asm.planning.project", "Errors", oError);
				}
			});

		},
		setData: function(oContext, oDataIn, entityName) {
			var oModel = IPMUtils.getPPMModel(oContext);
			var oData = oModel.getData();
			if (entityName === "VHHubs") {
				oData.VHHubs = oDataIn.results;
			} else if (entityName === "VHBrands") {
				oData.VHBrands = oDataIn.results;
			} else if (entityName === "VHSubBrands") {
				oData.VHSubBrands = oDataIn.results;
			} else if (entityName === "VHPhases") {
				oData.VHPhases = oDataIn.results;
			} else if (entityName === "VHStatus") {
				oData.VHStatus = oDataIn.results;
			} else if (entityName === "VHICategories") {
				oData.VHICategories = oDataIn.results;
			} else if (entityName === "VHIRegions") {
				oData.VHIRegions = oDataIn.results;
			} else if (entityName === "VHISubCategories") {
				oData.VHISubCategories = oDataIn.results;
			} else if (entityName === "VHInnovationTypes") {
				oData.VHInnovationTypes = oDataIn.results;
			} else if (entityName === "VHConsumerDiffs") {
				oData.VHConsumerDiffs = oDataIn.results;
			} else if (entityName === "VHStrategicFocus") {
				oData.VHStrategicFocus = oDataIn.results;
			} else if (entityName === "VHCurrencies") {
				oData.VHCurrency = oDataIn.results;
			} else if (entityName === "VHProjectTypes") {
				oData.VHProjectTypes = oDataIn.results;
			} else if (entityName === "UserInfoSet") {
				oData.UserInfoSet = oDataIn.results;
				if (oDataIn.results[0].Config === '{"Access":{"Create":"X"}}') {
					this.getModel("detailView").getData().createProjectVisible = true;
					this.getModel("detailView").refresh(false);
				} else {
					this.getModel("detailView").getData().createProjectVisible = false;
					this.getModel("detailView").refresh(false);
				}
			}

			oContext.getView().setModel(oModel, "PPMData");
			oModel.refresh(false);
		},
		onClearAllSettings: function(oEvent) {
			var fragmentId = this.getView().createId("general");
			var oTable = sap.ui.core.Fragment.byId(fragmentId, "lineItemsList");
			var aColumns = oTable.getColumns();
			this.clearFilterEvent = true;

			for (var i = 0; i < aColumns.length; i++) {
				oTable.filter(aColumns[i], null);
			}
			var p13nData = this.getModel("P13n").getData();
			var count = p13nData.FilterItems.length;
			for (var i = p13nData.FilterItems.length; i > 0; i--) {
				p13nData.FilterItems.pop(p13nData.FilterItems[i - 1]);
			}
			// psutram24

			var oItemData = {
				columnKey: "PPMData>ItemtypeDesc",
				operation: "Contains",
				value1: "Innovation Management",
				value2: "",
				exclude: false
			};
			p13nData.FilterItems.push(oItemData);

			this.getModel("P13n").refresh(false);
			this.clearFilterEvent = false;

			var oModel = IPMUtils.getPPMModel(this);
			var oData = oModel.getData();
			oData.GlobalFilter = IPMUtils.getGlobalFilter();
			oModel.refresh(false);

			this.__setVariantChangedIndicator();
			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.detail", "setFooterText", {});
			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.detail", "refresh", {});
		},
		onExport: function(oEvent) {
			var fragmentId = this.getView().createId("general");
			var oTable = sap.ui.core.Fragment.byId(fragmentId, "lineItemsList");

			oTable.exportData({
					exportType: new sap.ui.core.util.ExportTypeCSV()
				})
				.saveFile()
				.always(function() {
					this.destroy();
				});

			/*
			The following code exports all the columns in the table
		
			var oColumns = ColumnCatalog.getColumnCatalog(this);
			var includeColumns = [];
			for (var i = 0; i < oColumns.ColumnCollection.length; i++)
			{
				if (oColumns.ColumnCollection[i].visible)
				{
					var addColumn = {
					name : oColumns.ColumnCollection[i].text,
					template : {
						content : oColumns.ColumnCollection[i].path
					}};
					includeColumns.push(addColumn);
				}
			}
			
			var oExport = new Export({
 				// Type that will be used to generate the content. Own ExportType's can be created to support other formats
				exportType : new ExportTypeCSV({
					separatorChar : ";"
				}),
 				models : this.getModel("PPMData"),
				rows : { path : "PPMData>/Items/Current"},
 				columns : includeColumns
			});
			
			oExport.saveFile().catch(function(oError) {
				MessageToast.show("Error when downloading data. Browser might not be supported!\n\n" + oError);
			}).then(function() {
				oExport.destroy();
			});
				*/
		},
		onPressRefresh: function(oEvent) {
			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.detail", "refresh", {});
		},
		onPersonalizeSettings: function(oEvent) {
			if (this.oPersonalizationDialog) {
				this.oPersonalizationDialog.close();
				this.oPersonalizationDialog.destroy();
				this.oPersonalizationDialog = null;
			}
			this.openPersonalizationDialog();
		},
		openPersonalizationDialog: function() {
			// associate controller with the fragment
			if (!this.oPersonalizationDialog) {
				//colpal.ppm.projectmgmt.fragment.ProjectFinInfo
				this.oPersonalizationDialog = sap.ui.xmlfragment("colpal.ppm.projectmgmt.fragment.ProjectListPersonalization", this);
				this.getView().addDependent(this.oPersonalizationDialog);
				var oP13nFilterPanel = sap.ui.getCore().byId("oP13nProjectFilterPanel");
				oP13nFilterPanel.setIncludeOperations([
					sap.m.P13nConditionOperation.EQ,
					sap.m.P13nConditionOperation.Contains,
					sap.m.P13nConditionOperation.StartsWith,
					sap.m.P13nConditionOperation.EndsWith
				]);
				oP13nFilterPanel.setExcludeOperations([
					sap.m.P13nConditionOperation.EQ
				]);
			}
			this.getModel("P13n").refresh(false);
			// toggle compact style
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this.oPersonalizationDialog);
			this.oPersonalizationDialog.open();
		},
		initPersonalize: function() {
			var oColumns = ColumnCatalog.getColumnCatalog(this);
			var oActivitiesConfig = {
				MaxTableRows: 10
			};
			var iMaxTableRows = this.getOwnerComponent().getModel("P13n_Configuration").getProperty("/ActivitiesConfig/MaxTableRows");

			if (iMaxTableRows > 0) {
				oActivitiesConfig.MaxTableRows = iMaxTableRows;
			}

			var oDefaultModel = new sap.ui.model.json.JSONModel(oColumns);
			oDefaultModel.setSizeLimit(5000);
			this.getOwnerComponent().setModel(oDefaultModel, "P13n_default");
			oDefaultModel = new sap.ui.model.json.JSONModel(oActivitiesConfig);
			oDefaultModel.setSizeLimit(5000);
			this.getOwnerComponent().setModel(oDefaultModel, "P13n_ActivitiesConfig");

			var fragmentId = this.getView().createId("general");
			var oVariants = sap.ui.core.Fragment.byId(fragmentId, "Variant");
			var sSelectionKey = oVariants.getSelectionKey();
			if (sSelectionKey && sSelectionKey.substring(0, 7) === "Variant") {
				var aVariants = this.getOwnerComponent().getModel("P13n_Variants").getData().Variants;
				var iIndex = sSelectionKey.replace("Variant", "");
				this.getOwnerComponent().getModel("P13n").setData(JSON.parse(JSON.stringify(aVariants[iIndex])));
				this._syncConfigAndTable();
			} else {
				var oModel = new sap.ui.model.json.JSONModel(JSON.parse(JSON.stringify(oColumns)));
				this.getOwnerComponent().setModel(oModel, "P13n");
			}
			var oModel = new sap.ui.model.json.JSONModel(JSON.parse(JSON.stringify(oColumns)));
			this.getOwnerComponent().setModel(oModel, "P13n");

			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.detail", "getStaticData", {});

		},
		onP13nAddColumnsItem: function(oEvent) {
			var sColumn = oEvent.getParameter("newItem").getProperty("columnKey");
			if (sColumn === "PPMData>Name") {
				oEvent.getParameter("newItem").setProperty("index", 0);
				oEvent.getParameter("newItem").setProperty("visible", true);
			} else if (oEvent.getParameter("newItem").getProperty("index") === 0) {
				oEvent.getParameter("newItem").setProperty("index", 1);
			}
			var sColumn = oEvent.getParameter("newItem").getProperty("columnKey");
			if (oEvent.getParameter("newItem").mProperties.hasOwnProperty("visible")) {
				var bVisible = oEvent.getParameters().newItem.mProperties.visible;
				var oData = this.getOwnerComponent().getModel("P13n").getData();
				for (var i = 0; i < oData.ColumnCollection.length; i++) {
					var oColumn = oData.ColumnCollection[i];
					var oFixedColumn = oData.FixedColumnConfig[oColumn.columnIndex];
					if (oColumn.path === sColumn) {
						oColumn.visible = bVisible;
						oFixedColumn.visible = bVisible;
						i = oData.ColumnCollection.length;
					}
				}
				this.getOwnerComponent().getModel("P13n").refresh(false);
			}
			this.addDateFilters();
			this.__setVariantChangedIndicator();
		},

		onP13nChangeColumnsItem: function(oEvent) {
			var aItems = oEvent.getParameter("items");
			var oModel = this.getModel("P13n");
			var oData = oModel.getData();
			var flag = "";

			for (var j = 0; j < aItems.length; j++) {
				for (var i = 0; i < oData.FixedColumnConfig.length; i++) {
					if (aItems[j].columnKey === oData.FixedColumnConfig[i].path) {
						oData.FixedColumnConfig[i].visible = aItems[j].visible;
						oData.FixedColumnConfig[i].columnIndex = aItems[j].index;

						oData.ColumnCollection[i].visible = aItems[j].visible;
						if (aItems[j].visible === true) {
							flag = "X";
						}
						break;
					}
				}
			}

			if (flag !== "X") {
				oData.FixedColumnConfig[0].visible = true;
				oData.FixedColumnConfig[0].columnIndex = 0;

				oData.ColumnCollection[0].visible = true;
			}

			oModel.refresh(false);
			this.__setVariantChangedIndicator();
		},
		onP13nHandleCancel: function(oEvent) {
			// Go back to the values that were showing
			// var oVariants = this.byId("Variant");
			// var sSelectionKey = oVariants.getSelectionKey();
			// if (sSelectionKey && sSelectionKey.substring(0, 7) === "Variant") {
			// 	var aVariants = this.getOwnerComponent().getModel("P13n_Variants").getData().Variants;
			// 	var iIndex = sSelectionKey.replace("Variant", "");
			// 	this.getOwnerComponent().getModel("P13n").setData(JSON.parse(aVariants[iIndex].PersData));
			// } else {
			// 	// This is the default variant.
			// 	this.getOwnerComponent().getModel("P13n").setData(JSON.parse(JSON.stringify(this.getOwnerComponent().getModel("P13n_default").getData(
			// 		""))));
			// }
			console.log("onP13nHandleCancel event");
			this.getOwnerComponent().getModel("P13n").refresh(false);
			this.oPersonalizationDialog.close();
			if (this.oPersonalizationDialog) {
				this.oPersonalizationDialog.destroy();
				this.oPersonalizationDialog = null;
			}
			this.__removeVariantChangedIndicator();
		},
		onP13nHandleClose: function(oEvent) {
			// Check if MaxTableRows has changed.
			//ToDo: psutram
			if (this.getOwnerComponent().getModel("P13n_ActivitiesConfig").getProperty("/MaxTableRows") !== this.getOwnerComponent().getModel(
					"P13n_default").getProperty(
					"/OtherConfig/MaxTableRows") &&
				this.getOwnerComponent().getModel("P13n_ActivitiesConfig").getProperty("/MaxTableRows") !== this.getOwnerComponent().getModel(
					"P13n_Configuration").getProperty(
					"/ActivitiesConfig/MaxTableRows")) {
				//TODO:psutram
				PersonalizationUtils.p13nSave2(this, this.getOwnerComponent().getModel("P13n_ActivitiesConfig").getData(),
					"InnovationConfig",
					this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("CP_rowsSaved"));
				this.getOwnerComponent().getModel("P13n_Configuration").setProperty("/InnovationConfig",
					this.getOwnerComponent().getModel("P13n_ActivitiesConfig").getData());
				// Set the Visible Row Count
				var iTableRowCount = this.byId("lineItemsList").getBinding("rows").getLength();
				if (this.getOwnerComponent().getModel("P13n")) {
					var iMaxTableRows = parseInt(this.getOwnerComponent().getModel("P13n_ActivitiesConfig").getData().MaxTableRows);
					if (iTableRowCount > iMaxTableRows) {
						iTableRowCount = iMaxTableRows;
					}
					// this.getModel("PPMData").getData().oTableControl.visibleRowCount = iTableRowCount;
				}
				this.getModel("PPMData").refresh(false);
			}
			// Now we must sort the columns in the table based on configuration
			this._syncConfigAndTable();
			this.getOwnerComponent().getModel("P13n").refresh(false);
			this.oPersonalizationDialog.close();
			this.oPersonalizationDialog.destroy();
			this.oPersonalizationDialog = null;
		},
		onP13nHandleReset: function(oEvent) {
			var oDefaultModel = this.getOwnerComponent().getModel("P13n_default");
			this.getOwnerComponent().getModel("P13n").setData(JSON.parse(JSON.stringify(oDefaultModel.getData())));
			this._syncConfigAndTable();
			this.getOwnerComponent().getModel("P13n").refresh(false);
			this.oPersonalizationDialog.close();
			// this.__removeVariantChangedIndicator();
		},
		onP13nAddSortItem: function(oEvent) {
			var fragmentId = this.getView().createId("general");
			var oTable = sap.ui.core.Fragment.byId(fragmentId, "lineItemsList");
			var oBinding = oTable.getBinding("rows");
			PersonalizationUtils.p13nAddSortItem(oEvent.getParameter("sortItemData"),
				this.getOwnerComponent().getModel("P13n").getData().SortItems, oBinding);
			this.getOwnerComponent().getModel("P13n").refresh(false);
			this.__setVariantChangedIndicator();

		},
		oP13nProjectSortPanel: function(oEvent) {
			console.log("oP13nProjectSortPanel????");
		},
		onP13nRemoveSortItem: function(oEvent) {
			var fragmentId = this.getView().createId("general");
			var oTable = sap.ui.core.Fragment.byId(fragmentId, "lineItemsList");
			var oBinding = oTable.getBinding("rows");
			PersonalizationUtils.p13nRemoveSortItem(oEvent.getParameter("sortItemData"),
				this.getOwnerComponent().getModel("P13n").getData().SortItems,
				oEvent.getParameter("index"), oBinding);
			this.getOwnerComponent().getModel("P13n").refresh(false);
			this.__setVariantChangedIndicator();
		},
		onP13nUpdateSortItem: function(oEvent) {
			var fragmentId = this.getView().createId("general");
			var oTable = sap.ui.core.Fragment.byId(fragmentId, "lineItemsList");
			var oBinding = oTable.getBinding("rows");
			PersonalizationUtils.p13nUpdateSortItem(oEvent.getParameter("sortItemData"),
				this.getOwnerComponent().getModel("P13n").getData().SortItems,
				oEvent.getParameter("index"), oBinding);
			this.getOwnerComponent().getModel("P13n").refresh(false);
			this.__setVariantChangedIndicator();
		},
		onP13nAddFilterItem: function(oEvent) {
			PersonalizationUtils.p13nAddFilterItem(oEvent.getParameter("filterItemData"), this.getOwnerComponent().getModel("P13n").getData().FilterItems);
			this.getOwnerComponent().getModel("P13n").refresh(false);
			this.__setVariantChangedIndicator();
		},
		oP13nProjectFilterPanel: function(oEvent) {
			console.log("oP13nProjectFilterPanel????");
		},
		onP13nRemoveFilterItem: function(oEvent) {
			PersonalizationUtils.p13nRemoveFilterItem(oEvent.getParameter("filterItemData"), this.getOwnerComponent().getModel("P13n").getData()
				.FilterItems,
				oEvent.getParameter(
					"index"));
			this.getOwnerComponent().getModel("P13n").refresh(false);
			this.__setVariantChangedIndicator();
		},
		onP13nUpdateFilterItem: function(oEvent) {
			PersonalizationUtils.p13nUpdateFilterItem(oEvent.getParameter("filterItemData"), this.getOwnerComponent().getModel("P13n").getData()
				.FilterItems,
				oEvent.getParameter(
					"index"));
			this.getOwnerComponent().getModel("P13n").refresh(false);
			this.__setVariantChangedIndicator();
		},
		onColumnSort: function(oEvent) {
			if (!this.clearFilterEvent) {
				var params = oEvent.getParameters();
				var columnName = params.column.getProperty("sortProperty");
				var sortOrder = params.sortOrder;
				var oItemData = {
					columnKey: "PPMData>" + columnName,
					operation: sortOrder
				};

				var p13nData = this.getModel("P13n").getData();
				p13nData.SortItems.splice(0, p13nData.SortItems.length);
				p13nData.SortItems.push(oItemData);
				// var bSortExists = false;
				// for (var i = 0; i < p13nData.SortItems.length; i++)
				// {
				// 	if (p13nData.SortItems[i].columnKey === oItemData.columnKey)
				// 	{
				// 		bSortExists = true;
				// 		p13nData.SortItems[i].operation = oItemData.operation;
				// 		i = p13nData.SortItems.length;
				// 	}
				// }
				// if (!bSortExists)
				// {
				// 	p13nData.SortItems.push(oItemData);
				// }
				this.getModel("P13n").refresh(false);
				this.__setVariantChangedIndicator();
			}
		},
		customDateFilter: function(oEvent) {
			// psutram7
			// if (!this.clearFilterEvent)
			// {	
			// 	var params = oEvent.getParameters();
			// 	var columnName = params.column.getProperty("filterProperty");
			// 	var filterValue = params.value;
			// 	var oDate = (oDate instanceof Date) ? oDate : new Date(oDate);

			// 	return oDate;
			// }	
		},
		onColumnFilter: function(oEvent) {
			if (!this.clearFilterEvent) {
				var params = oEvent.getParameters();
				var columnName = params.column.getProperty("filterProperty");
				var filterValue = params.value;
				var operation = "Contains";
				if (columnName.includes("Date")) {
					console.log("column name includes Date");
					operation = "GT";
				}
				var oItemData = {
					columnKey: "PPMData>" + columnName,
					operation: operation,
					value1: filterValue,
					value2: "",
					exclude: false
				};

				var p13nData = this.getModel("P13n").getData();
				var bfilterExists = false;
				for (var i = 0; i < p13nData.FilterItems.length; i++) {
					if (p13nData.FilterItems[i].columnKey === oItemData.columnKey) {
						if (oItemData.value1 === "") {
							p13nData.FilterItems.splice(i, 1);
						} else {
							p13nData.FilterItems[i].value1 = oItemData.value1;
						}
						bfilterExists = true;
						i = p13nData.FilterItems.length;
					}
				}
				if (!bfilterExists) {
					p13nData.FilterItems.push(oItemData);
				}

				if (columnName.includes("Date")) {
					var valueModified = filterValue;
					//Todo: Apply modifications to filter value. valueModified = <<modifications>>;
					var oFilter1 = new sap.ui.model.Filter(columnName,
						sap.ui.model.FilterOperator.GT, valueModified);
					oEvent.getSource().getBinding("rows").filter([oFilter1], sap.ui.model.FilterType.Application);

					this.getModel("P13n").refresh(false);
					this.__setVariantChangedIndicator();
					sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.detail", "setFooterText", {});

					return false;

				}

				this.getModel("P13n").refresh(false);
				this.__setVariantChangedIndicator();
				sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.detail", "setFooterText", {});
			}
		},
		onColumnMove: function(oEvent) {
			var oConfig = this.getOwnerComponent().getModel("P13n").getData();
			var aColumnData = oConfig.ColumnCollection;
			var sMovedColumn = oEvent.getParameter("column").getLabel().getText();
			var iNewIndex = oEvent.getParameter("newPos");
			// Figure out where the column was before
			for (var i = 0; i < aColumnData.length; i++) {
				if (aColumnData[i].text === sMovedColumn) {
					var oHoldEntry = aColumnData[i];
					if (iNewIndex > i) {
						// Moving Down
						for (var j = i; j < iNewIndex; j++) {
							aColumnData[j] = aColumnData[j + 1];
						}

					} else {
						// Moving Up
						for (var j = i; j > iNewIndex; j--) {
							aColumnData[j] = aColumnData[j - 1];
						}
					}
					aColumnData[iNewIndex] = oHoldEntry;
					i = aColumnData.length;
				}
			}
			this.getOwnerComponent().getModel("P13n").refresh(false);
			this.__setVariantChangedIndicator();

		},
		_syncConfigAndTable: function() {
			//TODO:psutram
			var oConfig = this.getOwnerComponent().getModel("P13n").getData();
			var oProjectView = this.getModel("detailView").getData();
			var fragmentId = this.getView().createId("general");
			var oTable = sap.ui.core.Fragment.byId(fragmentId, "lineItemsList");

			// var oTable = this.byId("lineItemsList");
			var aColumns = oTable.removeAllColumns();
			if (!oProjectView.aRenderedColumnSet && aColumns.length > 0) {
				oProjectView.aRenderedColumnSet = aColumns;
			}
			if (oProjectView.aRenderedColumnSet) {
				aColumns = oProjectView.aRenderedColumnSet;
			}
			var aColumnData = oConfig.ColumnCollection;
			for (var i = 0; i < aColumnData.length; i++) {
				for (var j = 0; j < aColumns.length; j++) {
					if (aColumnData[i].text === aColumns[j].getLabel().getText()) {
						// if (aColumn[j].S)
						if (aColumns[j].getFilterProperty().includes("Date")) {
							console.log("setting filter type for column:" + aColumns[j].getFilterProperty());
							aColumns[j].setFilterType(this._dateType);
						}
						oTable.addColumn(aColumns[j]);
						j = aColumns.length;
					}
				}
			}
			//TODO: psutram
			this._applySort();
			this._applyFilter();
		},
		_applySort: function() {
			var aConfig = this.getOwnerComponent().getModel("P13n").getData().SortItems;
			var fragmentId = this.getView().createId("general");
			var oTable = sap.ui.core.Fragment.byId(fragmentId, "lineItemsList");
			var oTableBinding = oTable.getBinding("rows");
			var aColumns = oTable.getColumns();
			var sorters = [];
			for (var i = 0; i < aConfig.length; i++) {
				var bDescending = (aConfig[i].operation === "Descending") ? true : false;
				var sorter = new Sorter(aConfig[i].columnKey, bDescending);
				sorters.push(sorter);
			}
			// if (sorters.l)
			if (oTableBinding) {
				oTableBinding.sort(sorters);
			}
			// Turn off the sort indicator
			for (var i = 0; i < aColumns.length; i++) {
				aColumns[i].setSorted(false);
			}

			var aColumns = oTable.getColumns();
			for (var i = 0; i < aColumns.length; i++) {
				var bSorted = false;
				var sortOperator = "";
				for (var j = 0; j < aConfig.length; j++) {
					if (aConfig[j].columnKey.substring(aConfig[j].columnKey.lastIndexOf(">") + 1) === aColumns[i].mProperties.sortProperty) {
						bSorted = true;
						sortOperator = aConfig[j].operation;
						j = aConfig.length;
					}
				}
				aColumns[i].setSorted(bSorted);
				if (bSorted) {
					aColumns[i].setSortOrder(sortOperator);
				}
			}
		},
		_applyFilter: function() {
			console.log("_applyFilter: msg");
			var aConfig = this.getOwnerComponent().getModel("P13n").getData().FilterItems;
			var fragmentId = this.getView().createId("general");
			var oTable = sap.ui.core.Fragment.byId(fragmentId, "lineItemsList");
			var oTableBinding = oTable.getBinding("rows");
			// var oTableBinding = this.byId("Table").getBinding("rows");
			var aColumns = oTable.getColumns();
			var filters = [];
			for (var i = 0; i < aConfig.length; i++) {
				var filterType = aConfig[i].operation;
				if (aConfig[i].hasOwnProperty("exclude") && aConfig[i].exclude) {
					filterType = "NE";
				}
				var value1 = "";
				var value2 = "";
				if (aConfig[i].hasOwnProperty("value1")) {
					value1 = aConfig[i].value1;
				}
				if (aConfig[i].hasOwnProperty("value2")) {
					value2 = aConfig[i].value2;
				}
				var filter = new Filter(aConfig[i].columnKey.substring(aConfig[i].columnKey.lastIndexOf(">") + 1), filterType, value1,
					value2);
				filters.push(filter);
			}
			if (oTableBinding) {
				oTableBinding.filter(filters);
			}
			// Turn adjust filter indicator
			for (var i = 0; i < aColumns.length; i++) {
				var bFiltered = false;
				var filterValue = "";
				var filterOperator = "";
				for (var j = 0; j < aConfig.length; j++) {
					if (aConfig[j].columnKey.substring(aConfig[j].columnKey.lastIndexOf(">") + 1) === aColumns[i].mProperties.filterProperty) {
						bFiltered = true;
						filterValue = aConfig[j].value1;
						filterOperator = aConfig[j].operation;
						j = aConfig.length;
					}
				}
				aColumns[i].setFiltered(bFiltered);
				aColumns[i].setFilterValue(filterValue);
				// aColumns[i].setFiltered(bFiltered);
			}
			// this.setFooterText();
			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.detail", "setFooterText", {});
			// PSW Start change to Page Title to add filters from personalisation
			// this._setStyleMode(this.getOwnerComponent().getModel("masterShared").getData().oInternalEvents.currentMode);
			// PSW End change to Page Title to add filters from personalisation
		},
		onVariantSelect: function(oEvent) {
			var sKey = oEvent.getParameters().key;
			var iIndex = sKey.replace("Variant", "");
			this._variantSwap(iIndex);
			this.__removeVariantChangedIndicator();
			if (this.oPersonalizationDialog) {
				this.oPersonalizationDialog.destroy();
				this.oPersonalizationDialog = null;
			}
			this.getOwnerComponent().getModel("masterShared").getData().oInternalEvents.lastVariant = iIndex;
		},
		onVariantManage: function(oEvent) {
			var aRenamed = oEvent.getParameters().renamed;
			var aDeleted = oEvent.getParameters().deleted;
			var aVariants = this.getOwnerComponent().getModel("P13n_Variants").getData().Variants;
			var aDeletedIndicies = [];
			for (var i = 0; i < aDeleted.length; i++) {
				var iIndex = aDeleted[i].replace("Variant", "");
				aDeletedIndicies.push(iIndex);
				PersonalizationUtils.p13nVariantDelete(this, aVariants[iIndex].PersData, "InnovationVariants", aVariants[iIndex].Guid, aVariants[
					iIndex].Description, aVariants[iIndex].__metadata.uri.substring(aVariants[iIndex].__metadata.uri.indexOf("/Variants")));
			}
			aDeletedIndicies.sort(function(a, b) {
				return b - a;
			});
			for (var k = 0; k < aDeletedIndicies.length; k++) {
				aVariants.splice(aDeletedIndicies[k], 1);
			}
			for (var j = 0; j < aRenamed.length; j++) {
				var iIndex = aRenamed[j].key.replace("Variant", "");
				aVariants[iIndex].Description = aRenamed[j].name;
				PersonalizationUtils.p13nVariantSave(this, JSON.parse(aVariants[iIndex].PersData), "InnovationVariants", aVariants[iIndex].Guid,
					aVariants[iIndex]
					.DefaultVar, aRenamed[j].name, true);
			}
			if (oEvent.getParameters().def !== this.getOwnerComponent().getModel("P13n_Variants").getData().DefaultVariant) {
				this.getOwnerComponent().getModel("P13n_Variants").getData().DefaultVariant = oEvent.getParameters().def;
				if (oEvent.getParameters().def !== "*standard*") {
					var iIndex = oEvent.getParameters().def.replace("Variant", "");
					aVariants[iIndex].DefaultVar = 'X';
					PersonalizationUtils.p13nVariantSave(this, JSON.parse(aVariants[iIndex].PersData), "InnovationVariants", aVariants[iIndex].Guid,
						aVariants[iIndex]
						.DefaultVar, aVariants[iIndex].Description, true);
				}
			}
		},
		onP13nSave: function(oEvent) {
			this._updateP13nConfigForColumnWidth();
			var oData = this.getOwnerComponent().getModel("P13n").getData();
			var sGuid = "";
			if (oEvent.getParameters().overwrite) {
				var aVariants = this.getOwnerComponent().getModel("P13n_Variants").getData().Variants;
				var iIndex = oEvent.getParameters().key.replace("Variant", "");
				sGuid = aVariants[iIndex].Guid;
			}
			var sDefaultVar = " ";
			if (oEvent.getParameters().def) {
				sDefaultVar = "X";
			} else {
				console.log("+++++++++++++++Not the default Variant");
			}
			var sDescription = oEvent.getParameters().name;
			PersonalizationUtils.p13nVariantSave(this, oData, "InnovationVariants", sGuid, sDefaultVar, sDescription, oEvent.getParameters().overwrite);
			this.__removeVariantChangedIndicator();
		},
		_updateP13nConfigForColumnWidth: function() {
			var oConfig = this.getOwnerComponent().getModel("P13n").getData();
			var fragmentId = this.getView().createId("general");
			var oTable = sap.ui.core.Fragment.byId(fragmentId, "lineItemsList");
			var aColumns = oTable.getColumns();
			var aColumnData = oConfig.FixedColumnConfig;
			for (var i = 0; i < aColumns.length; i++) {
				for (var j = 0; j < aColumnData.length; j++) {
					if (aColumnData[j].text === aColumns[i].getLabel().getText()) {
						var sWidth = aColumns[i].getWidth();
						if (sWidth && sWidth !== "") {
							aColumnData[j].width = sWidth;
						}
						j = aColumnData.length;
					}
				}
			}
		},
		_variantSwap: function(iIndex) {
			var ppmModel = IPMUtils.getPPMModel(this);
			var ppmData = ppmModel.getData();
			if (iIndex === "*standard*") {
				var o = JSON.parse(JSON.stringify(this.getOwnerComponent().getModel("P13n_default").getData()));
				this.getOwnerComponent().getModel("P13n").setData(JSON.parse(JSON.stringify(this.getOwnerComponent().getModel("P13n_default").getData())));
				ppmData.GlobalFilter = IPMUtils.getGlobalFilter();

			} else {
				var aVariants = this.getOwnerComponent().getModel("P13n_Variants").getData().Variants;

				this.getOwnerComponent().getModel("P13n").setData(JSON.parse(aVariants[iIndex].PersData));
				var persData = JSON.parse(aVariants[iIndex].PersData);
				ppmData.GlobalFilter = persData.GlobalFilter;
				// this.getOwnerComponent().getModel("PPMData").setData("GlobalFilter", 
				// 					this.getOwnerComponent().getModel("P13n").getData() );

			}
			ppmModel.refresh(false);
			this._syncConfigAndTable();
			sap.ui.getCore().getEventBus().publish("colgate.ppm.projectmgmt.detail", "refresh", {});
			// this._applyFilter();
			// this._applySort();
		},

		_setUpInitialVariant: function() {
			var fragmentId = this.getView().createId("general");
			var oVariants = sap.ui.core.Fragment.byId(fragmentId, "Variant");
			// var oVariants = this.byId("Variant");
			// this.byId("Variant-popover-popover").attachBeforeOpen({}, function(oEvent) {
			/*			sap.ui.core.Fragment.byId(fragmentId, "Variant-popover-popover").attachBeforeOpen({}, function(oEvent) {
							var fragmentId = this.getView().createId("general");
							var oVariants = sap.ui.core.Fragment.byId(fragmentId, "Variant");
							var oSelectionKey = oVariants.getSelectionKey();
							if (!oSelectionKey || oSelectionKey === "*standard*") {
								// this.byId("Variant-mainsave").setEnabled(false);
								sap.ui.core.Fragment.byId(fragmentId, "Variant-mainsave").setEnabled(false);
							} else {
								var iIndex = oSelectionKey.replace("Variant", "");
								var aVariants = this.getOwnerComponent().getModel("P13n_Variants").getData().Variants;
								if (aVariants[iIndex].AccessOptions === "R") {
									// this.byId("Variant-mainsave").setEnabled(false);
									sap.ui.core.Fragment.byId(fragmentId, "Variant-mainsave").setEnabled(false);
								} else {
									// this.byId("Variant-mainsave").setEnabled(true);
									sap.ui.core.Fragment.byId(fragmentId, "Variant-mainsave").setEnabled(true);
								}
							}
						}, this);*/
			this.getOwnerComponent().getModel("P13n").setData(JSON.parse(JSON.stringify(this.getOwnerComponent().getModel("P13n_default").getData())));
			oVariants.setStandardItemText(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("A_default"));
			var sLabelId = oVariants.getIdForLabel();
			var oLabel = this.byId(sLabelId);
			oLabel.oVariantText.setText(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("A_default"));
			var aVariants = this.getOwnerComponent().getModel("P13n_Variants").getData().Variants;
			for (var i = 0; i < aVariants.length; i++) {
				var bReadOnly = false;
				if (aVariants[i].AccessOptions === "R") {
					bReadOnly = true;
				}
				var oVariant = new sap.ui.comp.variants.VariantItem("Variant" + i, {
					global: false,
					labelReadOnly: bReadOnly,
					readOnly: bReadOnly,
					text: aVariants[i].Description,
					key: "Variant" + i
				});
				oVariants.addVariantItem(oVariant);
				if (aVariants[i].DefaultVar === "X") {
					oVariants.setInitialSelectionKey("Variant" + i);
					this.getOwnerComponent().getModel("P13n").setData(JSON.parse(aVariants[i].PersData));
					var ppmModel = IPMUtils.getPPMModel(this);
					var ppmData = ppmModel.getData();
					var persData = JSON.parse(aVariants[i].PersData);
					if (persData.GlobalFilter) {
						ppmData.GlobalFilter = persData.GlobalFilter;
					}
					// this.byId("Variant-mainsave").setEnabled(!bReadOnly);
					// sap.ui.core.Fragment.byId(fragmentId, "Variant-mainsave").setEnabled(!bReadOnly);
				}
			}
			this._syncConfigAndTable();

		},
		__setVariantChangedIndicator: function() {
			var fragmentId = this.getView().createId("general");

			var oLabel = this.byId(sap.ui.core.Fragment.byId(fragmentId, "Variant").getIdForLabel());
			//			var oLabel = this.byId(this.byId("Variant").getIdForLabel());
			var sText = oLabel.oVariantText.getText();
			if (sText.substring(sText.length - 1) !== "*") {
				oLabel.oVariantText.setText(oLabel.oVariantText.getText() + "*");
			} else {
				oLabel.oVariantText.setText(oLabel.oVariantText.getText());
			}
		},
		__removeVariantChangedIndicator: function() {
			var fragmentId = this.getView().createId("general");
			var oLabel = this.byId(sap.ui.core.Fragment.byId(fragmentId, "Variant").getIdForLabel());
			// var oLabel = this.byId(this.byId("Variant").getIdForLabel());
			var sText = oLabel.oVariantText.getText();
			if (sText.substring(sText.length - 1) === "*") {
				oLabel.oVariantText.setText(oLabel.oVariantText.getText().substring(0, sText.length - 1));
			} else {
				oLabel.oVariantText.setText(oLabel.oVariantText.getText());
			}
			// PSW End Change to Text on View Label May 16th
		},
		setFooterText: function() {
			var ppmModel = this.getModel("PPMData");
			if (ppmModel) {
				var ppmData = ppmModel.getData();
				var currentFilter = "Current Filter: ";
				// var fragmentId = this.getView().createId("general");
				// var oTable = sap.ui.core.Fragment.byId(fragmentId, "lineItemsList");
				// var oTableBinding = oTable.getBinding("rows");
				// var aColumns = oTable.getColumns();
				var firstValue = "";
				var excludeList = "Exclude: ";
				var firstExcludeValue = "";

				var p13nData = this.getModel("P13n").getData();
				var filterList = p13nData.FilterItems;

				// if (filterItem.columnKey.includes("Division"))
				// 	{
				if (ppmData.GlobalFilter.DivisionKey !== "") {
					currentFilter += firstValue + ppmData.GlobalFilter.DivisionKeyText;
					firstValue = ", ";
				}
				// }
				// else if (filterItem.columnKey.includes("Hub"))
				// {
				if (ppmData.GlobalFilter.HubKey !== "") {
					currentFilter += firstValue + ppmData.GlobalFilter.HubKeyText;
					firstValue = ", ";
				}
				// }
				// else if (filterItem.columnKey.includes("Category"))
				// {
				if (ppmData.GlobalFilter.CategoryKey !== "") {
					currentFilter += firstValue + ppmData.GlobalFilter.CategoryKeyText;
					firstValue = ", ";
				}
				// }
				// else if (filterItem.columnKey.includes("Subcategory"))
				// {
				// if (ppmData.GlobalFilter.SubcategoryKey !== "")
				// {
				// 	currentFilter += firstValue + ppmData.GlobalFilter.SubcategoryKeyText;
				// 	firstValue = ", ";
				// }
				// }
				// else if (filterItem.columnKey.includes("Subcategory"))
				// {
				if (ppmData.GlobalFilter.SubcategoryKey !== "") {
					currentFilter += firstValue + ppmData.GlobalFilter.SubcategoryKeyText;
					firstValue = ", ";
				}
				// }
				// else if (filterItem.columnKey.includes("Innovation"))
				// {
				if (ppmData.GlobalFilter.InnovationKey !== "") {
					currentFilter += firstValue + ppmData.GlobalFilter.InnovationKeyText;
					firstValue = ", ";
				}
				// }
				// else if (filterItem.columnKey.includes("Phase"))
				// {
				if (ppmData.GlobalFilter.PhaseKey !== "") {
					currentFilter += firstValue + ppmData.GlobalFilter.PhaseKeyText;
					firstValue = ", ";
				}
				// }

				for (var i = 0; i < filterList.length; i++) {
					var filterItem = filterList[i];

					if (!filterItem.exclude) {

						if (!currentFilter.includes(filterItem.value1)) {
							currentFilter += firstValue + filterItem.value1;
							firstValue = ", ";
						}
					} else {
						excludeList += firstExcludeValue + filterItem.value1;
						firstExcludeValue = ", ";
					}
				}
				ppmData.ProjectListFooterText = currentFilter;
				if (excludeList !== "Exclude: ") {
					ppmData.ProjectListFooterText2 = excludeList;
				} else {
					ppmData.ProjectListFooterText2 = "";
				}
				ppmModel.refresh(false);
			}
		}
	});
});