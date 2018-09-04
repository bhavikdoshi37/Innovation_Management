sap.ui.define([
	"colpal/ppm/projectmgmt/util/DateUtils",
	"colpal/ppm/projectmgmt/util/IPMUtils",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/m/Dialog"
], function(DateUtils, IPMUtils, MessageToast, MessageBox, Dialog) {
	"use strict";
	return {
		testFunction: function ()
		{
			console.log("Test message");
		},
		displayQuestionnaire: function(oContext){
			// var questionnaire = this.getMockData();
			var that = this;
			var ppmModel = IPMUtils.getPPMModel(null);
			var ppmData = ppmModel.getData();
			var pgiModel = oContext.getModel("PGI");
			var pgiData = pgiModel.getData();
			
			if (! pgiData.Questionnaire || pgiData.Questionnaire === null)
			{
				// var questionnaire = this.conifgQuestionnaire();
				pgiData.Questionnaire = this.conifgQuestionnaire(oContext);
			}
			
			pgiData.EditQuestionnaire = JSON.parse(JSON.stringify(pgiData.Questionnaire));
			
			var dialog = new Dialog("NewAttachment", {
				title: oContext.getModel("i18n").getResourceBundle().getText("Questionnaire"),
				type: 'Message',
				// busy: "{path: 'PGI>/AttachmentDialogBusy'}",
				content: [
					new sap.m.VBox({
						fitContainer: true,
						alignItems: sap.m.FlexAlignItems.Start,
						justifyContent: sap.m.FlexJustifyContent.SpaceBetween,
						items: [
							new sap.m.Text({
								text: oContext.getModel("i18n").getResourceBundle().getText("Please answer the questionnaire to determine the Project Type")
							}),
							//psutram: add Table
							new sap.m.Table("idQTable",{
								columns : [ new sap.m.Column({
						            width : "4em"
						            // header : new sap.m.Label({text : 
						            // 			oContext.getModel("i18n").getResourceBundle().getText("Question")})
						        }), new sap.m.Column({
						            width : "2em"
						            // header : new sap.m.Label({text : 
						            // 			oContext.getModel("i18n").getResourceBundle().getText("Choice")})
						        })],
						        items: {
						        	path: "PGI>/EditQuestionnaire",
						        	template: new sap.m.ColumnListItem({
								        cells:[
								        	   new sap.m.Text({text:"{PGI>QuestionDesc}", maxLength: 240}),
								               //new sap.m.Input({value:"{parts:[{path:'PGI>Answer'}]"}),
								               //path: '{PGI>OptionId}', descending: false 
								               new sap.m.ComboBox({
													items: {
														path: "PGI>Options",
														sorter: "path: 'PGI>Valuation', descending: false",
														templateShareable: true,
														template: new sap.ui.core.ListItem({
															key: "{PGI>Valuation}",
															text: "{PGI>OptionDesc}"
														})
													},
													editable: "{PGI>/Editable/Innovation}",
													selectedKey: "{PGI>AnswerValuation}"
													
												})
						               ]
						           })
						        }
							} )
						]
					})
					],
					beginButton: new sap.m.Button({
					text: oContext.getModel("i18n").getResourceBundle().getText("OK"),
					press: function() {
						if (pgiData.Editable.Innovation)
						{
							for (var i = 0; i < pgiData.EditQuestionnaire.length; i++)
							{
								if (pgiData.EditQuestionnaire[i].AnswerValuation === "")
								{
									var sMessage = oContext.getModel("i18n").getResourceBundle().getText("PGI_Questionnaire_QuestionsAnswered");
									MessageToast.show(sMessage);
									//"Please answer all questions in the Questionnaire"
									return ;
								}
								// var iAnswer = parseInt(pgiData.Questionnaire[i].AnswerValuation);
								// answers [pgiData.Questionnaire[i].QuestionId] = iAnswer;
							}
			
							that.evauateAnswers(pgiData, ppmData);
							pgiData.Questionnaire = pgiData.EditQuestionnaire;
							/*
							var maxCol =0 ;
							var maxRow = 0;
							for (var i = 0; i < pgiData.Questionnaire.length; i++)
							{
								var iAnswer = parseInt(pgiData.Questionnaire[i].AnswerValuation);
								if (iAnswer === -1)
								{
									return;
								}
								if (iAnswer >= 19 && iAnswer > maxCol)
								{
									maxCol = iAnswer;
								}
								if (iAnswer < 19 && iAnswer > maxRow)
								{
									maxRow = iAnswer;
								}
								
							}
							var result = maxCol * maxRow;
							// console.log("MaxCol:" + maxCol + " MaxRow:" + maxRow + " Result:" + result);
							for (var i = 0; i < ppmData.VHInnovTypes.length; i++)
							{
								var iLow = parseInt(ppmData.VHInnovTypes[i].Low);
								var iHigh = parseInt(ppmData.VHInnovTypes[i].High);
								if (result > iLow & result < iHigh)
								{
									pgiData.Project.InnovationKey = ppmData.VHInnovTypes[i].Key;  
									i = ppmData.VHInnovTypes.length;
								}
							}
							*/
							// if (result < 250)
							// {
							// 	pgiData.Project.InnovationKey = "0001";                         
							// }
							// else if (result > 250 && result < 290)
							// {
							// 	pgiData.Project.InnovationKey = "0002";
							// }
							// else if (result > 290 && result < 350)
							// {
							// 	pgiData.Project.InnovationKey = "0003";
							// }
							// else
							// {
							// 	pgiData.Project.InnovationKey = "0004";
							// }
							pgiModel.refresh(false);
						}
						dialog.close();
					}
					}),
					endButton: new sap.m.Button({
					text: oContext.getModel("i18n").getResourceBundle().getText("Cancel"),
					press: function() {
						dialog.close();
					}
				}),
				afterClose: function() {
					dialog.destroy();
				}
			});
			dialog.setModel(pgiModel, "PGI");
			dialog.setModel(oContext.getModel("i18n"), "i18n");
			// this.attachmentDialog = dialog;
			pgiModel.refresh(false);
			dialog.open();
		},
		evauateAnswers: function(pgiData, ppmData){
			var colValue = 0 ;
			var rowValue = 0;
			var answers = {
				CQ1: 0,
				CQ2: 0,
				RQ1: 0,
				RQ2: 0,
				CQ3: 0};
			
			for (var i = 0; i < pgiData.EditQuestionnaire.length; i++)
			{
				var iAnswer = parseInt(pgiData.EditQuestionnaire[i].AnswerValuation);
				answers [pgiData.EditQuestionnaire[i].QuestionId] = iAnswer;
			}
			// =IF(E2="yes",3,0)
			// =IF(C2=3,3,IF(E3="yes",2,1))
			// =IF(C2=3,3,IF(C3=2,2,IF(E6="Yes",2,1)))
			
			// =IF(D5=3,3,IF(E4="yes",2,1))
			// =IF(E5="yes",3,0)
			
			colValue = answers.CQ1;
			if (colValue !== 3)
			{
				colValue = answers.CQ2	;			
			}
			if (colValue === 1)
			{
				colValue = answers.CQ3;
			}
			
			rowValue = answers.RQ1;
			if (rowValue !== 3)
			{
				rowValue = answers.RQ2;	
				// next two lines is temp
				// if (rowValue === 0)
				// 	rowValue = 1;
			}
			
			console.log("evauateAnswers: ColValue:" + colValue + " RowValue:" + rowValue);
			
			for (var i = 0; i < ppmData.ScoringModels.length; i++)
			{
				if (colValue === parseInt(ppmData.ScoringModels[i].ImColumn) && rowValue === parseInt(ppmData.ScoringModels[i].ImRow))
				{
					pgiData.Project.InnovationKey = ppmData.ScoringModels[i].ZimInnovatype;
					console.log("Found Matching Innovation Key:" + pgiData.Project.InnovationKey);
					i = ppmData.ScoringModels.length;
				}
			}
		},
		conifgQuestionnaire: function(oContext){
			var ppmModel = IPMUtils.getPPMModel(null);
			var ppmData = ppmModel.getData();
			var pgiData = oContext.getModel("PGI").getData();
			var questionnaire = [];
			var questionList = [];
			var rpmGuid = "";
			var rpmGuidC = "";
			
			if (pgiData.CurrentMode === "Create")
				questionList = ppmData.VHQuestionnaires;
			else
			{
				
				if (! ppmData.ItemQuesAnswer || ppmData.ItemQuesAnswer === null || ppmData.ItemQuesAnswer.length === 0)
				{
					console.log("Using VHQuestionnaire to display QuestionList");
					questionList = ppmData.VHQuestionnaires;
				}
				else
				{
					console.log("Using ItemQuesAnswer to display QuestionList");
					questionList = ppmData.ItemQuesAnswer;
				}
				
				rpmGuid = pgiData.Project.RpmGuid;
				rpmGuidC = pgiData.Project.RpmGuidC;
			}	
			for (var i = 0; i < questionList.length; i++)
			{
				var matchedRow = this.questionExists(questionnaire, questionList[i]);
				console.log("conifgQuestionnaire:Id:" + questionList[i].QuestionId + ":" + matchedRow);
				if (matchedRow === -1)
				{
					// add row to questionnaire
					
					var newQuestion = {
						RpmGuid: rpmGuid,
						RpmGuidC: rpmGuidC,
						// AttributeId: questionList[i].AttributeId,
						QnnrId: questionList[i].QnnrId,
						QstgrpId: questionList[i].QstgrpId,
						QuestionId: questionList[i].QuestionId,
						QuestionDesc: questionList[i].QuestionDesc,
						Qtype: questionList[i].Qtype,
						QtypeDesc: questionList[i].QtypeDesc,
						DisplayAs: questionList[i].DisplayAs,
						DisplayAsDesc: questionList[i].DisplayAsDesc,
						Weighting: questionList[i].Weighting,
						Options: [{OptionId: questionList[i].OptionId,
								 OptionDesc: questionList[i].OptionDesc,
								 Valuation: questionList[i].Valuation,
								 Answered: questionList[i].Answered
						}],
						AnswerValuation: -1
					};
					if (questionList[i].Answered === "X")
					{
						newQuestion.AnswerValuation = questionList[i].Valuation;
					}
					questionnaire.push(newQuestion);
				}
				else
				{
					// add Option to questionnaire[i]
					var newOptions = {OptionId: questionList[i].OptionId,
								 OptionDesc: questionList[i].OptionDesc,
								 Valuation: questionList[i].Valuation,
								 Answered: questionList[i].Answered
						};
					if (questionList[i].Answered === "X")
					{
						questionnaire[matchedRow].AnswerValuation = questionList[i].Valuation;
					}	
					if (questionList[i].OptionDesc === "Yes")
					{
						questionnaire[matchedRow].Options.splice(0, 0, newOptions);
					}
					else
					{
						questionnaire[matchedRow].Options.push(newOptions);	
					}
				}

			}
			
			return questionnaire;
			
		},
		questionExists: function(questionnaire, question){
			var matchedRow = -1;
			for (var i = 0; i < questionnaire.length; i++)
			{
				if (questionnaire[i].QuestionId === question.QuestionId)
				{
					matchedRow = i;
					return matchedRow; 
				}
			}
			return matchedRow;
		},
		getMockData: function()
		{
			var questionnaire = [
				{
					"questionId": "Q1",
					"Name": "Is the core benefit of the innovation entirely new to consumers & the market? (ie the primary benefit of toothpaste is to clean teeth & freshen teeth)",
					"QType": "DropDown",
					"Options": [{"Text":"Yes", "Key": 29},{"Text":"No", "Key": 0}],
					"Answer": -1
				},
				{
					"questionId": "Q2",
					"Name": "Is the sub-benefit of the innovation new to consumers & the market, beyond fragrances & aesthetics (ie toothpaste that still cleans teeth but also now regrows enamel)",
					"QType": "DropDown",
					"Options": [{"Text":"Yes", "Key": 23},{"Text":"No", "Key": 19}],
					// "Options": [{"Yes": 23},{"No": 19}],
					"Answer": -1
				},
				{
					"questionId": "Q3",
					"Name": "Does this innovation have technology that delivers the benefit in a new way that ordinary consumers will notice as being different vs what's in market? (beyond fragrance & aesthetic changes)",
					"QType": "DropDown",
					"Options": [{"Text":"Yes", "Key": 13},{"Text":"No", "Key": 11}],
					// "Options": [{"Yes": 13},{"No": 11}],
					"Answer": -1
				},
				{
					"questionId": "Q4",
					"Name": "Will the innovation use a new business model for CP in it’s category? (ie online sales)",
					"QType": "DropDown",
					"Options": [{"Text":"Yes", "Key": 17},{"Text":"No", "Key": 0}],
					// "Options": [{"Yes": 17},{"No": 0}],
					"Answer": -1
				},
				{
					"questionId": "Q5",
					"Name": "Does this innovation create or enter into a new segment where CP currently does not compete? (ie Protex for Men)",
					"QType": "DropDown",
					"Options": [{"Text":"Yes", "Key": 23},{"Text":"No", "Key": 19}],
					// "Options": [{"Yes": 23},{"No": 19}],
					"Answer": -1
				}];
				
			return questionnaire;	
		}
	};
});