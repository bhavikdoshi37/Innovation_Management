sap.ui.define([
	"sap/m/MessageToast"
], function(MessageToast) {
	"use strict";
	return {
		p13nSave: function(oContext, oConfig, sKey) {
			this.p13nSave2(oContext,oConfig,sKey,oContext.getOwnerComponent().getModel("i18n").getResourceBundle().getText("CP_savedMess"));
		},
		p13nSave2: function(oContext, oConfig, sKey, sMessage) {
			oContext.getOwnerComponent().getModel("masterShared").setProperty("/oDetailBusy/busy", true); // Start Spinner
			oContext.getOwnerComponent().getModel("masterShared").refresh(false);
			
			// Store Global Filter along with rest of personalizations
			var ppmData = oContext.getOwnerComponent().getModel("PPMData").refresh(false);
			oConfig.GlobalFilter = ppmData.GlobalFilter;
			
			var oPostData = {};
			oPostData.PersKey = sKey;
			oPostData.PersData = JSON.stringify(oConfig);
			var oModel = oContext.getOwnerComponent().getModel("User");
			var sPath = "/Personalizations";
			var that = oContext;
			var sShowMessage = sMessage;
			
			oModel.create(sPath, oPostData, {
				async: true,
				success: function(oDataIn, oResponse) {
					var oData = {};
					oData[oDataIn.PersKey] = JSON.parse(oDataIn.PersData);
					that.getOwnerComponent().getModel("P13n_Configuration").setData(oData, true);
					that.getOwnerComponent().getModel("masterShared").setProperty("/oDetailBusy/busy", false); // Stop Spinner
					MessageToast.show(sShowMessage);
				},
				error: function(oError) {
					oError.ErrorOrigin = "SavePersonalization";
					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.project", "Errors", oError);
					that.getOwnerComponent().getModel("masterShared").setProperty("/oDetailBusy/busy", false); // Stop Spinner
				}
			});
			
		},
		p13nVariantSave: function(oContext, oConfig, sKey, sGuid, sDefaultVar, sDescription, bOld) {
			oContext.getOwnerComponent().getModel("masterShared").setProperty("/oDetailBusy/busy", true); // Start Spinner
			oContext.getOwnerComponent().getModel("masterShared").refresh(false);
			var oPostData = {};
			if (bOld) {
				oPostData.Guid = sGuid;
			}
			
			// Store Global Filter along with rest of personalizations
			var ppmData = oContext.getModel("PPMData").getData();
			oConfig.GlobalFilter = ppmData.GlobalFilter;
			
			oPostData.PersKey = sKey;
			oPostData.DefaultVar = sDefaultVar;
			oPostData.Description = sDescription;
			oPostData.PersData = JSON.stringify(oConfig);
			var oModel = oContext.getOwnerComponent().getModel("User");
			var sPath = "/Variants";
			var that = oContext;
			
			oModel.create(sPath, oPostData, {
				async: true,
				success: function(oDataIn, oResponse) {
					var aVariants = that.getOwnerComponent().getModel("P13n_Variants").getData().Variants;
					var fragmentId = that.getView().createId("general");
					var oVariants = sap.ui.core.Fragment.byId(fragmentId, "Variant");
					// var oVariants = that.byId("Variant");
					var bUpdated = false;
					var sMessage = "";
					for (var i = 0; i < aVariants.length; i++) {
						if (aVariants[i].Guid === oDataIn.Guid) {
							// Update the entry
							aVariants[i] = oDataIn;
							sMessage = that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("CP_variantUpdated", [aVariants[i].Description]);
							bUpdated = true;
							i = aVariants.length;
						}
					}
					if (!bUpdated) {
						// Must be new record
						aVariants.push(oDataIn);
						var iIndex = aVariants.length - 1;
						var oVariant = oVariants.getVariantItems()[iIndex];
						if (!oVariant) {
							oVariant = new sap.ui.comp.variants.VariantItem("Variant" + iIndex, {
								global: false,
								labelReadOnly: false,
								readOnly: false,
								text: aVariants[i].Description,
								key: "Variant" + iIndex
							});
							oVariants.addVariantItem(oVariant);
							oVariants.setSelectionKey("Variant" + iIndex);
						} else {
							oVariant.setGlobal(false);
							oVariant.setReadOnly(false);
							oVariant.setLabelReadOnly(false);
							oVariant.setText(oDataIn.Description);
							oVariant.setKey("Variant" + iIndex);
							oVariants.setSelectionKey("Variant" + iIndex);
						}
						sMessage = that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("CP_variantCreated", [oDataIn.Description]);
					}
					that.getOwnerComponent().getModel("masterShared").setProperty("/oDetailBusy/busy", false); // Stop Spinner
					MessageToast.show(sMessage);
				},
				error: function(oError) {
					oError.ErrorOrigin = "SaveVariant";
					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.project", "Errors", oError);
					that.getOwnerComponent().getModel("masterShared").setProperty("/oDetailBusy/busy", false); // Stop Spinner
				}
			});
			
		},
		p13nVariantDelete: function(oContext, oConfig, sKey, sGuid, sDescription, sPath) {
			oContext.getOwnerComponent().getModel("masterShared").setProperty("/oDetailBusy/busy", true); // Start Spinner
			oContext.getOwnerComponent().getModel("masterShared").refresh(false);
			var oModel = oContext.getOwnerComponent().getModel("User");
			var that = oContext;
			var sName = sDescription;
			
			oModel.remove(sPath, {
				success: function(oDataIn, oResponse) {
					var sMessage = "";
					sMessage = that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("CP_variantDeleted", [sName]);
					that.getOwnerComponent().getModel("masterShared").setProperty("/oDetailBusy/busy", false); // Stop Spinner
					that.getOwnerComponent().getModel("masterShared").refresh(false);
					MessageToast.show(sMessage);
				},
				error: function(oError) {
					oError.ErrorOrigin = "DeleteVariant";
					sap.ui.getCore().getEventBus().publish("colgate.asm.planning.project", "Errors", oError);
					that.getOwnerComponent().getModel("masterShared").setProperty("/oDetailBusy/busy", false); // Stop Spinner
					that.getOwnerComponent().getModel("masterShared").refresh(false);
				}
			});
		},
		p13nAddSortItem: function(oItemData, aSortItems) {
			var oItem = {};
			oItem.columnKey = oItemData.getProperty("columnKey");
			oItem.operation = oItemData.getProperty("operation");
			aSortItems.push(oItem);
		},
		p13nUpdateSortItem: function(oItemData, aSortItems, iIndex) {
			aSortItems[iIndex].columnKey = oItemData.getProperty("columnKey");
			aSortItems[iIndex].operation = oItemData.getProperty("operation");
		},
		p13nRemoveSortItem: function(oItemData, aSortItems, iIndex) {
			for (var i = iIndex; i < aSortItems.length; i++) {
				aSortItems[i] = aSortItems[i + 1];
			}
			aSortItems.pop();
		},
		p13nAddFilterItem: function(oItemData, aFilterItems) {
			var oItem = {};
			oItem.columnKey = oItemData.getProperty("columnKey");
			oItem.operation = oItemData.getProperty("operation");
			oItem.value1 = oItemData.getProperty("value1");
			oItem.value2 = oItemData.getProperty("value2");
			oItem.exclude = oItemData.getProperty("exclude");
			aFilterItems.push(oItem);
		},
		p13nUpdateFilterItem: function(oItemData, aFilterItems, iIndex) {
			aFilterItems[iIndex].columnKey = oItemData.getProperty("columnKey");
			aFilterItems[iIndex].operation = oItemData.getProperty("operation");
			aFilterItems[iIndex].value1 = oItemData.getProperty("value1");
			aFilterItems[iIndex].value2 = oItemData.getProperty("value2");
			aFilterItems[iIndex].exclude = oItemData.getProperty("exclude");
		},
		p13nRemoveFilterItem: function(oItemData, aFilterItems, iIndex) {
			for (var i = iIndex; i < aFilterItems.length; i++) {
				aFilterItems[i] = aFilterItems[i + 1];
			}
			aFilterItems.pop();
		}
	};
});