//---------------------------------------------------------------------
// <copyright file="TemplateServices.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
// </summary>
//---------------------------------------------------------------------
import SampleDataContracts = require("../scripts/SampleDataContract");


export class TemplateService {

    public TemplateList = null;
    public dataService: IExtensionDataService;

    public init(): IPromise<any> {
        var deferred = $.Deferred<any>();
        var service = this;

        VSS.ready(function () {
            // Get the data service
            VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(dataService=> {
                service.dataService = dataService;
                deferred.resolve(service);
            });
        });

        return deferred.promise();
    };

    public getTemplateSettings(): IPromise<any> {
        var deferred = $.Deferred<any>();
        var svc = this;
        this.init().then(
            a=> {
                svc.dataService.getValue("TemplateSource", { scopeType: "Account", defaultValue: "Extension" }).then(
                    settings=> {
                        deferred.resolve(settings);
                    });
            });

        return deferred.promise();
    }

    public setTemplateSettings(value: string): IPromise<any> {
        var deferred = $.Deferred<any>();
        var svc = this;
        this.init().then(
            a=> {
                svc.dataService.setValue("TemplateSource", value, { scopeType: "Account", defaultValue: "Extension" }).then(
                    settings=> {
                        deferred.resolve(settings);
                    });
            });

        return deferred.promise();
    }


    public LoadCustomTemplates(): IPromise<SampleDataContracts.ISampleDataTemplate[]> {
        var deferred = $.Deferred<SampleDataContracts.ISampleDataTemplate[]>();
        var service = this;
        console.log("LoadTempaltes called");


        var vsoContext = VSS.getWebContext();

        var initPromise: IPromise<any>;
        if (service.dataService == null) {
            initPromise = this.init();
        }
        else {
            var initDeferred = $.Deferred<any>();
            initPromise = initDeferred.promise();
            initDeferred.resolve(this);
        }

        initPromise.then(data => {
            // Get an account-scoped document in a collection
            console.log("Before getDocuments"),
                service.dataService.getDocument("CustomTemplates", "CustomTemplates").then(
                    doc=> {
                        if (doc.CustomTemplates != null && doc.CustomTemplates.length) {
                            //doc.forEach(function (i) { i.serviceName = serviceName; i.unSaved = ''; });
                            //service.TemplateList = list;
                            deferred.resolve(doc.CustomTemplates);
                        }
                        else {
                            deferred.resolve([]);
                        }
                    },
                    err=> {
                        if (err.status == 404) {
                            // assume nothing is stored, fetch default 
                            deferred.resolve([]);
                        }
                        else {
                            deferred.reject("No default template");
                        }
                    });
        });
        return deferred.promise();
    };

    public SaveCustomTemplates(templates: SampleDataContracts.ISampleDataTemplate[]): IPromise<SampleDataContracts.ISampleDataTemplate[]> {
        var deferred = $.Deferred<SampleDataContracts.ISampleDataTemplate[]>();
        var service = this;
        console.log("SaveCustomTemplate called");

        try {
            var templateNames = "";
            templates.forEach(template => { templateNames = templateNames + ";" + template.Name; });
            TelemetryClient.getClient().trackEvent("TemplateServices.SaveCustomTemplate", { Name: templateNames });
        } catch (err) { }

        var vsoContext = VSS.getWebContext();

        var initPromise: IPromise<any>;
        if (service.dataService == null) {
            initPromise = this.init();
        }
        else {
            var initDeferred = $.Deferred<any>();
            initPromise = initDeferred.promise();
            initDeferred.resolve(this);
        }

        initPromise.then(data => {
            // Get an account-scoped document in a collection
            console.log("Before getDocuments");
            var obj = {
                id: "CustomTemplates",
                CustomTemplates: templates,
                __etag: -1
            };
            service.dataService.setDocument("CustomTemplates", obj).then(
                doc=> {
                    if (doc.CustomTemplates != null && doc.CustomTemplates.length > 0) {
                        deferred.resolve(doc.CustomTemplates);
                    }
                    else {
                        deferred.resolve([]);
                    }
                },
                err=> {
                    if (err.status == 404) {
                        // assume nothing is stored, fetch default 
                        deferred.resolve([]);
                    }
                    else {
                        deferred.reject("No default template");
                    }
                });
        });
        return deferred.promise();
    };

    public savePopulatedTemplates(templates: SampleDataContracts.ISampleDataTemplate[]): IPromise<any> {
        var deferred = $.Deferred<any>();
        var service = this;
        var vsoContext = VSS.getWebContext();
            
        // Get the data service
        var doc2Save = {
            id: "PopulatedTmp",
            populatedTemplates: templates,
            __etag: -1
        }

        this.init().then(dataService => {   
            // set an account-scoped document in a collection
            service.dataService.setDocument(service.getDocumentCollectionUrl(vsoContext, ""), doc2Save).then(
                function (doc) {
                    deferred.resolve(doc);
                },
                function (err) {
                    deferred.reject(err);
                });
        });

        return deferred.promise();
    }

    public getPopulatedTemplates(): IPromise<SampleDataContracts.ISampleDataTemplate[]> {
        var deferred = $.Deferred<SampleDataContracts.ISampleDataTemplate[]>();
        var service = this;
        var vsoContext = VSS.getWebContext();

        this.init().then(dataService => {   
            
            // set an account-scoped document in a collection
            service.dataService.getDocument(service.getDocumentCollectionUrl(vsoContext, ""), "PopulatedTmp").then(
                function (doc) {
                    deferred.resolve(doc.populatedTemplates);
                },
                function (err) {
                    deferred.reject(err);
                });
        });

        return deferred.promise();
    }


    public getDocumentCollectionUrl(vsoContext: WebContext, serviceName) {
        // Limitied to 50 characters :(
        return vsoContext.project.id + '-' + serviceName;
    }

    public getDefaultTemplates(): IPromise<SampleDataContracts.ISampleDataTemplate[]> {
        console.log("getDefaultTemplates Called");
        var extContext = VSS.getExtensionContext();
        var defaultTemplateUrl = extContext.baseUri + "/DefaultTemplates/SampleDataTemplate.json";

        var deferred = $.Deferred<SampleDataContracts.ISampleDataTemplate[]>()

        $.getJSON(defaultTemplateUrl)
            .then(function (data, status) {
                console.log("getDefaultTemplates success");
                console.log(data);
                deferred.resolve(data);
            }, function (data, status) {

                var def = [{
                    "Name": "Getting started",
                    "Description": "Getting started with cards and boards",
                    "IconUrl": "/img/Kanban.png",
                    "Message": "Learn how to use backlogs and boards.",
                    "TryItLink": "_backlogs/board",

                    "Parameters": [{
                        "Field": "@TaskInProgressState",
                        "Value": "='@RequirementType'=='Product backlog item' ? 'In Progress':'Active'"
                    }],

                    "DataServices": [{
                        "Service": "AreaSampleDataService",
                        "Name": "Areas",
                        "TemplateData": {
                            "nodes": [{
                                "Path": "",
                                "Name": "Team 1"
                            }, {
                                    "Path": "",
                                    "Name": "Team 2"
                                }, {
                                    "Path": "",
                                    "Name": "Team 3"
                                }]
                        }
                    }, {
                            "Service": "IterationSampleDataService",
                            "Name": "Iterations",
                            "DependentOn": "AreaSampleDataService",
                            "TemplateData": {
                                "nodes": [{
                                    "Path": "",
                                    "Name": "Iteration 1",
                                    "Attributes": {
                                        "startDate": "@Today",
                                        "finishDate": "@Today + 21"
                                    }
                                }, {
                                        "Path": "",
                                        "Name": "Iteration 3"
                                    }]
                            }
                        },

                        {
                            "Service": "TeamSampleDataService",
                            "DependentOn": "AreaSampleDataService",
                            "Name": "Teams",
                            "TemplateData": {
                                "teams": [

                                    {
                                        "Name": "@CurrentTeam",
                                        "BugsBehavior": "asRequirements"
                                    }, {
                                        "Name": "Team 1",
                                        "Description": "Example team 1",
                                        "DefaultTeamValue": "Team 1",
                                        "TeamValues": [{
                                            "includeChildren": true,
                                            "value": "Team 1"
                                        }],
                                        "Iterations": {
                                            "RootIteration": "Iteration 1",
                                            "Iterations": ["Iteration 1"]
                                        }
                                    }, {
                                        "Name": "Team 2",
                                        "Description": "Example team 2",
                                        "DefaultTeamValue": "Team 2",
                                        "TeamValues": [{
                                            "includeChildren": true,
                                            "value": "Team 2"
                                        }],
                                        "Iterations": {
                                            "RootIteration": "Iteration 1",
                                            "Iterations": ["Iteration 1"]
                                        }
                                    }, {
                                        "Name": "Team 3",
                                        "Description": "Example team 3",
                                        "DefaultTeamValue": "Team 3",
                                        "TeamValues": [{
                                            "includeChildren": true,
                                            "value": "Team 3"
                                        }],
                                        "Iterations": {
                                            "RootIteration": "Iteration 3",
                                            "Iterations": ["Iteration 3"]
                                        }
                                    }
                                ]
                            }
                        },

                        {
                            "Service": "WorkItemSampleDataService",
                            "Name": "Work items",
                            "DependentOn": "IterationSampleDataService",
                            "TemplateData": {
                                "templatedWorkItems": [{
                                    "templateWorkItemId": "48",
                                    "CreateExpr": "",
                                    "Type": "@EpicType",
                                    "Fields": [{
                                        "Field": "System.State",
                                        "Value": "@FeatureState_1"
                                    }, {
                                            "Field": "System.AssignedTo",
                                            "Value": "@Me"
                                        }, {
                                            "Field": "System.Title",
                                            "Value": "Set-up"
                                        }, {
                                            "Field": "System.Description",
                                            "Value": "<p>Setup</p>"
                                        }, {
                                            "Field": "Microsoft.VSTS.Common.AcceptanceCriteria",
                                            "Value": "<div tabindex=0 title=Maximize class=\"richeditor-toolbar-button workitem-group-maximize\" unselectable=on><div class=\"icon icon-enter-full-screen\"></div></div><span class=tfs-collapsible-text><p title=\"Acceptance Criteria\">Acceptance Criteria</p></span>"
                                        }, {
                                            "Field": "System.Tags",
                                            "Value": "For your information"
                                        }]
                                }, {
                                        "templateWorkItemId": "49",
                                        "CreateExpr": "",
                                        "Type": "@FeatureType",
                                        "Fields": [{
                                            "Field": "System.IterationPath",
                                            "Value": "Iteration 1"
                                        }, {
                                                "Field": "System.State",
                                                "Value": "@FeatureState_1"
                                            }, {
                                                "Field": "System.AssignedTo",
                                                "Value": "@Me"
                                            }, {
                                                "Field": "System.Title",
                                                "Value": "Set-up VSTS"
                                            }],
                                        "Parent": "48",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "50",
                                        "CreateExpr": "",
                                        "Type": "@RequirementType",
                                        "Fields": [{
                                            "Field": "System.State",
                                            "Value": "@KanbanStateDone"
                                        }, {
                                                "Field": "System.AssignedTo",
                                                "Value": "@Me"
                                            }, {
                                                "Field": "System.Title",
                                                "Value": "Create VSTS account"
                                            }, {
                                                "Field": "System.Description",
                                                "Value": "For more information on how you created your Visual Studio Team Services account, check out: <a href=\"https://www.visualstudio.com/en-us/get-started/setup/sign-up-for-visual-studio-online\">https://www.visualstudio.com/en-us/get-started/setup/sign-up-for-visual-studio-online</a>"
                                            }],
                                        "Parent": "49",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "51",
                                        "CreateExpr": "",
                                        "Type": "@RequirementType",
                                        "Fields": [{
                                            "Field": "System.State",
                                            "Value": "@KanbanState_2"
                                        }, {
                                                "Field": "System.AssignedTo",
                                                "Value": "@Me"
                                            }, {
                                                "Field": "System.Title",
                                                "Value": "Getting started"
                                            }, {
                                                "Field": "System.Description",
                                                "Value": "<p>Check out this great overview to Visual Studio Team Services: <a href=\"https://youtu.be/P2hzWJF7e5k\">https://youtu.be/P2hzWJF7e5k</a> .</p><p><br></p><p>Get started by creating a <a aria-label=\"CTRL+Click or CTRL+Enter to follow link https://www.visualstudio.com/get-started/work/create-your-backlog-vs\" href=\"https://www.visualstudio.com/get-started/work/create-your-backlog-vs\">new card</a> or <a aria-label=\"CTRL+Click or CTRL+Enter to follow link https://msdn.microsoft.com/Library/vs/alm/work/customize/customize-cards\" href=\"https://msdn.microsoft.com/Library/vs/alm/work/customize/customize-cards\">customizing your cards</a>.</p><br><p><img style=\"width:491px;\" src=\"https://i3-vso.sec.s-msft.com/dynimg/IC791021.png\"></p>"
                                            }, {
                                                "Field": "System.Tags",
                                                "Value": "For your information"
                                            }],
                                        "Parent": "49",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "52",
                                        "CreateExpr": "",
                                        "Type": "@RequirementType",
                                        "Fields": [{
                                            "Field": "System.State",
                                            "Value": "@KanbanStateDone"
                                        }, {
                                                "Field": "System.AssignedTo",
                                                "Value": "@Me"
                                            }, {
                                                "Field": "System.Title",
                                                "Value": "Create example project"
                                            }, {
                                                "Field": "System.Description",
                                                "Value": "<p>For more information on how to create a new team project in Visual Studio Team Services, check out: <a href=\"https://www.visualstudio.com/get-started/setup/connect-to-visual-studio-online\">https://www.visualstudio.com/get-started/setup/connect-to-visual-studio-online</a></p><p><br></p><p><img style=\"width:491px;\" src=\"https://i3-vso.sec.s-msft.com/get-started/setup/_img/_shared/CreateTeamProject.png\"><br></p>"
                                            }],
                                        "Parent": "49",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "53",
                                        "CreateExpr": "",
                                        "Type": "@RequirementType",
                                        "Fields": [{
                                            "Field": "System.State",
                                            "Value": "@KanbanStateNew"
                                        }, {
                                                "Field": "System.Title",
                                                "Value": "Add team members"
                                            }, {
                                                "Field": "System.Description",
                                                "Value": "<p>Now you have a team project, you can use Visual Studio Team Services to share your work.  You can all work on the same code, create backlog items and bugs, track the team  status, and more.</p><p><br></p><p>For more information on adding team members, check out: <a href=\"https://www.visualstudio.com/en-us/get-started/setup/add-team-members-vs\">https://www.visualstudio.com/en-us/get-started/setup/add-team-members-vs</a></p><br><p><img style=\"width:491px;\" src=\"https://i3-vso.sec.s-msft.com/get-started/setup/_img/add-team-members/invite6.png\"></p>"
                                            }],
                                        "Parent": "49",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "54",
                                        "CreateExpr": "",
                                        "Type": "@RequirementType",
                                        "Fields": [{
                                            "Field": "System.State",
                                            "Value": "@KanbanStateNew"
                                        }, {
                                                "Field": "System.Title",
                                                "Value": "Set team capacity"
                                            }, {
                                                "Field": "System.Description",
                                                "Value": "<p>How much work can your team accomplish in a sprint? Using the capacity planning tools, your team can estimate both the amount of work and types of work required to complete their sprint plan. Then, during the sprint, you can <a href=\"https://msdn.microsoft.com/Library/vs/alm/work/scrum/sprint-planning#adjust-work\"><font color=\"#0066cc\">monitor the capacity bars</font></a> to determine when an individual team member or a team area of activity is on target to finish, or needs help from other team members to finish.</p><p><br></p><p>For more information on setting team capacities, check out: <a href=\"https://msdn.microsoft.com/en-us/Library/vs/alm/Work/scale/capacity-planning\">https://msdn.microsoft.com/en-us/Library/vs/alm/Work/scale/capacity-planning</a></p><p><br></p><p><img style=\"width:491px;\" src=\"https://i-msdn.sec.s-msft.com/Library/vs/alm/Work/scale/_img/set-sprint1-capacity.png\"><br></p>"
                                            }],
                                        "Parent": "49",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "55",
                                        "CreateExpr": "",
                                        "Type": "@EpicType",
                                        "Fields": [{
                                            "Field": "System.State",
                                            "Value": "@FeatureState_1"
                                        }, {
                                                "Field": "System.AssignedTo",
                                                "Value": "@Me"
                                            }, {
                                                "Field": "System.Title",
                                                "Value": "Add items"
                                            }]
                                    }, {
                                        "templateWorkItemId": "56",
                                        "CreateExpr": "",
                                        "Type": "@FeatureType",
                                        "Fields": [{
                                            "Field": "System.IterationPath",
                                            "Value": "Iteration 1"
                                        }, {
                                                "Field": "System.State",
                                                "Value": "@FeatureState_1"
                                            }, {
                                                "Field": "System.AssignedTo",
                                                "Value": "@Me"
                                            }, {
                                                "Field": "System.Title",
                                                "Value": "Add and edit work items"
                                            }],
                                        "Parent": "55",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "57",
                                        "CreateExpr": "",
                                        "Type": "@RequirementType",
                                        "Fields": [{
                                            "Field": "System.State",
                                            "Value": "@KanbanState_2"
                                        }, {
                                                "Field": "System.AssignedTo",
                                                "Value": "@Me"
                                            }, {
                                                "Field": "System.Title",
                                                "Value": "Create new card"
                                            }, {
                                                "Field": "System.Description",
                                                "Value": "For more information on creating work items in Visual Studio Team Services, check out: <a href=\"https://www.visualstudio.com/get-started/work/create-your-backlog-vs\">https://www.visualstudio.com/get-started/work/create-your-backlog-vs</a><p><br></p><p><img style=\"width:491px;\" src=\"https://i3-vso.sec.s-msft.com/dynimg/IC790666.jpg\"><br></p>"
                                            }, {
                                                "Field": "System.Tags",
                                                "Value": "Follow up"
                                            }],
                                        "Parent": "56",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "58",
                                        "CreateExpr": "",
                                        "Type": "@RequirementType",
                                        "Fields": [{
                                            "Field": "System.State",
                                            "Value": "@KanbanState_1"
                                        }, {
                                                "Field": "System.Title",
                                                "Value": "Customize cards"
                                            }, {
                                                "Field": "System.Description",
                                                "Value": "<p>Information rich cards not only provide at-a-glance info of interest to you and your team, they also provide a way for you to update a field without opening the work item. And, with style rules, you can highlight those work items with select colors based on the criteria you set. </p><p>&nbsp;<br></p><p>For more information, check out: <a href=\"https://msdn.microsoft.com/Library/vs/alm/work/customize/customize-cards\"><font color=\"#0066cc\">https://msdn.microsoft.com/Library/vs/alm/work/customize/customize-cards</font></a></p><p><br></p><p><img src=\"https://i-msdn.sec.s-msft.com/Library/vs/alm/Work/customize/_img/kanban-board-card-style-rule-example.png\"><br></p>"
                                            }, {
                                                "Field": "System.Tags",
                                                "Value": "Follow up; For your information; Needs review"
                                            }],
                                        "Parent": "63",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "61",
                                        "CreateExpr": "",
                                        "Type": "@TaskType",
                                        "Fields": [{
                                            "Field": "System.Title",
                                            "Value": "Create a new task"
                                        }, {
                                                "Field": "System.Description",
                                                "Value": "<p>With task checklists, you continue to enjoy lightweight tracking, while gaining visibility into which tasks are still to be completed and those that are done. Task checklists provide a quick and easy way to track elements of work which are important to support completing a backlog item.</p><p><br></p><p>For more information on adding task checklists, check out: <a href=\"https://msdn.microsoft.com/en-us/Library/vs/alm/Work/kanban/add-task-checklists\">https://msdn.microsoft.com/en-us/Library/vs/alm/Work/kanban/add-task-checklists</a></p>"
                                            }],
                                        "Parent": "57",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "62",
                                        "CreateExpr": "",
                                        "Type": "@EpicType",
                                        "Fields": [{
                                            "Field": "System.State",
                                            "Value": "@FeatureStateNew"
                                        }, {
                                                "Field": "System.Title",
                                                "Value": "Customize"
                                            }]
                                    }, {
                                        "templateWorkItemId": "63",
                                        "CreateExpr": "",
                                        "Type": "@FeatureType",
                                        "Fields": [{
                                            "Field": "System.IterationPath",
                                            "Value": "Iteration 1"
                                        }, {
                                                "Field": "System.State",
                                                "Value": "@FeatureStateNew"
                                            }, {
                                                "Field": "System.Title",
                                                "Value": "Customize cards"
                                            }],
                                        "Parent": "62",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "64",
                                        "CreateExpr": "",
                                        "Type": "@RequirementType",
                                        "Fields": [{
                                            "Field": "System.State",
                                            "Value": "@KanbanStateNew"
                                        }, {
                                                "Field": "System.Title",
                                                "Value": "Add fields and update them from your board"
                                            }, {
                                                "Field": "System.Description",
                                                "Value": "<p>For more information, check out: <a href=\"https://msdn.microsoft.com/Library/vs/alm/work/customize/customize-cards#Addfieldsandupdatethemfromtheboard\">https://msdn.microsoft.com/Library/vs/alm/work/customize/customize-cards#Addfieldsandupdatethemfromtheboard</a></p><br><p><img style=\"width:491px;\" src=\"https://i-msdn.sec.s-msft.com/Library/vs/alm/Work/customize/_img/ALM_CC_UpdateFieldOnCard.png\"></p>"
                                            }],
                                        "Parent": "63",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "65",
                                        "CreateExpr": "",
                                        "Type": "@RequirementType",
                                        "Fields": [{
                                            "Field": "System.State",
                                            "Value": "@KanbanStateNew"
                                        }, {
                                                "Field": "System.Title",
                                                "Value": "Add style rules to highlight cards with color"
                                            }, {
                                                "Field": "System.Description",
                                                "Value": "<p>For more information in adding style rules to highlight cards with color, check out: <a href=\"https://msdn.microsoft.com/Library/vs/alm/work/customize/customize-cards#Addstylerulestohighlightworkitemswithcolor\">https://msdn.microsoft.com/Library/vs/alm/work/customize/customize-cards#Addstylerulestohighlightworkitemswithcolor</a></p><p><br></p><br><p><img alt=\"Styling rule applied to bugs with Severity=1\" src=\"https://i-msdn.sec.s-msft.com/Library/vs/alm/Work/customize/_img/kanban-board-card-style-rule-example.png\"></p>"
                                            }, {
                                                "Field": "System.Tags",
                                                "Value": "Needs review"
                                            }],
                                        "Parent": "63",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "66",
                                        "CreateExpr": "",
                                        "Type": "@RequirementType",
                                        "Fields": [{
                                            "Field": "System.State",
                                            "Value": "@KanbanStateNew"
                                        }, {
                                                "Field": "System.Title",
                                                "Value": "Add tags to your cards"
                                            }, {
                                                "Field": "System.Description",
                                                "Value": "<p>Tagging work items helps you quickly filter the backlog or a work item query by categories that you define.</p><p><br></p><p>For more information on adding tags to your work items, check out: <a href=\"https://msdn.microsoft.com/en-us/Library/vs/alm/Work/track/add-tags-to-work-items\">https://msdn.microsoft.com/en-us/Library/vs/alm/Work/track/add-tags-to-work-items</a></p>"
                                            }, {
                                                "Field": "System.Tags",
                                                "Value": "Needs review"
                                            }],
                                        "Parent": "63",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "67",
                                        "CreateExpr": "",
                                        "Type": "@FeatureType",
                                        "Fields": [{
                                            "Field": "System.IterationPath",
                                            "Value": "Iteration 1"
                                        }, {
                                                "Field": "System.State",
                                                "Value": "@FeatureStateNew"
                                            }, {
                                                "Field": "System.Title",
                                                "Value": "Configure board"
                                            }],
                                        "Parent": "62",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "68",
                                        "CreateExpr": "",
                                        "Type": "@RequirementType",
                                        "Fields": [{
                                            "Field": "System.State",
                                            "Value": "@KanbanStateNew"
                                        }, {
                                                "Field": "System.Title",
                                                "Value": "Add new columns to board"
                                            }, {
                                                "Field": "System.Description",
                                                "Value": "For more information on how you can add new columns to your board, check out: <a href=\"https://msdn.microsoft.com/en-us/Library/vs/alm/Work/kanban/add-columns\">https://msdn.microsoft.com/en-us/Library/vs/alm/Work/kanban/add-columns</a><br><p><img style=\"width:491px;\" src=\"https://i-msdn.sec.s-msft.com/Library/vs/alm/Work/kanban/_img/ALM_AC_KanbanIntro.png\"></p>"
                                            }, {
                                                "Field": "System.Tags",
                                                "Value": "Needs review"
                                            }],
                                        "Parent": "67",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "69",
                                        "CreateExpr": "",
                                        "Type": "@RequirementType",
                                        "Fields": [{
                                            "Field": "System.State",
                                            "Value": "@KanbanStateNew"
                                        }, {
                                                "Field": "System.Title",
                                                "Value": "Expedite work"
                                            }, {
                                                "Field": "System.Description",
                                                "Value": "<p>Your Kanban board supports your ability to visualize the flow of work as it moves from new to done. When you add swimlanes, you can also visualize the status of work that supports different service-level classes. You can create a swimlane to represent any other dimension that supports your tracking needs.</p><p><br></p><p>For more information in how you can expedite work on your board, check out: <a href=\"https://msdn.microsoft.com/Library/vs/alm/work/kanban/expedite-work\">https://msdn.microsoft.com/Library/vs/alm/work/kanban/expedite-work</a></p><br><p><img style=\"width:491px;\" src=\"https://i-msdn.sec.s-msft.com/Library/vs/alm/Work/kanban/_img/ALM_EW_IntroChart_3C.png\"></p>"
                                            }],
                                        "Parent": "67",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "70",
                                        "CreateExpr": "",
                                        "Type": "@EpicType",
                                        "Fields": [{
                                            "Field": "System.IterationPath",
                                            "Value": "Iteration 3"
                                        }, {
                                                "Field": "System.State",
                                                "Value": "@FeatureStateNew"
                                            }, {
                                                "Field": "System.Title",
                                                "Value": "Areas and iterations"
                                            }]
                                    }, {
                                        "templateWorkItemId": "71",
                                        "CreateExpr": "",
                                        "Type": "@FeatureType",
                                        "Fields": [{
                                            "Field": "System.IterationPath",
                                            "Value": "Iteration 1"
                                        }, {
                                                "Field": "System.State",
                                                "Value": "@FeatureStateNew"
                                            }, {
                                                "Field": "System.Title",
                                                "Value": "Areas"
                                            }],
                                        "Parent": "70",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "72",
                                        "CreateExpr": "",
                                        "Type": "@RequirementType",
                                        "Fields": [{
                                            "Field": "System.State",
                                            "Value": "@KanbanStateNew"
                                        }, {
                                                "Field": "System.Title",
                                                "Value": "Add an area path"
                                            }, {
                                                "Field": "System.Description",
                                                "Value": "For more information on adding area paths, check out: <a href=\"https://msdn.microsoft.com/Library/vs/alm/Work/customize/modify-areas-iterations#Addanarea\">https://msdn.microsoft.com/Library/vs/alm/Work/customize/modify-areas-iterations#Addanarea</a><br><p><img style=\"width:491px;\" src=\"https://i-msdn.sec.s-msft.com/Library/vs/alm/Work/customize/_img/ALM_CW_OpenAreas.png\"></p>"
                                            }],
                                        "Parent": "71",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "73",
                                        "CreateExpr": "",
                                        "Type": "@RequirementType",
                                        "Fields": [{
                                            "Field": "System.IterationPath",
                                            "Value": "Iteration 1"
                                        }, {
                                                "Field": "System.State",
                                                "Value": "@KanbanStateNew"
                                            }, {
                                                "Field": "System.Title",
                                                "Value": "Modify an area path"
                                            }, {
                                                "Field": "System.Description",
                                                "Value": "For more information on modifying an area path, check out: <a href=\"https://msdn.microsoft.com/Library/vs/alm/Work/customize/modify-areas-iterations\">https://msdn.microsoft.com/Library/vs/alm/Work/customize/modify-areas-iterations</a>"
                                            }, {
                                                "Field": "System.Tags",
                                                "Value": "For your information"
                                            }],
                                        "Parent": "71",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "74",
                                        "CreateExpr": "",
                                        "Type": "@FeatureType",
                                        "Fields": [{
                                            "Field": "System.IterationPath",
                                            "Value": "Iteration 1"
                                        }, {
                                                "Field": "System.State",
                                                "Value": "@FeatureStateNew"
                                            }, {
                                                "Field": "System.Title",
                                                "Value": "Iterations"
                                            }],
                                        "Parent": "70",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "75",
                                        "CreateExpr": "",
                                        "Type": "@RequirementType",
                                        "Fields": [{
                                            "Field": "System.State",
                                            "Value": "@KanbanStateNew"
                                        }, {
                                                "Field": "System.Title",
                                                "Value": "Add an iteration"
                                            }, {
                                                "Field": "System.Description",
                                                "Value": "For more information on adding iterations, check out: <a href=\"https://msdn.microsoft.com/Library/vs/alm/Work/customize/modify-areas-iterations#Addaniterationandsetiterationdates\">https://msdn.microsoft.com/Library/vs/alm/Work/customize/modify-areas-iterations#Addaniterationandsetiterationdates</a><br><p><img style=\"width:491px;\" src=\"https://i-msdn.sec.s-msft.com/Library/vs/alm/Work/customize/_img/ALM_CW_OpenIterations.png\"></p>"
                                            }],
                                        "Parent": "74",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "76",
                                        "CreateExpr": "",
                                        "Type": "@RequirementType",
                                        "Fields": [{
                                            "Field": "System.IterationPath",
                                            "Value": "Iteration 1"
                                        }, {
                                                "Field": "System.State",
                                                "Value": "@KanbanStateNew"
                                            }, {
                                                "Field": "System.Title",
                                                "Value": "Modify an iteration"
                                            }, {
                                                "Field": "System.Description",
                                                "Value": "For more information on modifying an iteration, check out: <a href=\"https://msdn.microsoft.com/Library/vs/alm/Work/customize/modify-areas-iterations\"><font color=\"#0066cc\">https://msdn.microsoft.com/Library/vs/alm/Work/customize/modify-areas-iterations</font></a>"
                                            }, {
                                                "Field": "System.Tags",
                                                "Value": "For your information"
                                            }],
                                        "Parent": "74",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "77",
                                        "CreateExpr": "",
                                        "Type": "@RequirementType",
                                        "Fields": [{
                                            "Field": "System.State",
                                            "Value": "@KanbanStateNew"
                                        }, {
                                                "Field": "System.Title",
                                                "Value": "Organize your backlog"
                                            }, {
                                                "Field": "System.Description",
                                                "Value": "<p>While many teams can work with a flat list of items, sometimes it helps to group related items into a hierarchical structure.  Perhaps you like to start with a big picture and break it down into smaller deliverables.  Or, you've got an existing backlog and now need to organize it.</p><p><br></p><p>For more information on how to organize your backlog, check out: <a href=\"https://msdn.microsoft.com/en-us/Library/vs/alm/Work/backlogs/organize-backlog\">https://msdn.microsoft.com/en-us/Library/vs/alm/Work/backlogs/organize-backlog</a></p>"
                                            }, {
                                                "Field": "System.Tags",
                                                "Value": "Needs review"
                                            }],
                                        "Parent": "56",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "272",
                                        "Type": "@BugType",
                                        "CreateExpr": "",
                                        "Fields": [{
                                            "Field": "System.Title",
                                            "Value": "Create bugs"
                                        }, {
                                                "Field": "System.State",
                                                "Value": "@KanbanState_1"
                                            }, {
                                                "Field": "System.AssignedTo",
                                                "Value": "@Me"
                                            },

                                            {
                                                "Field": "Microsoft.VSTS.TCM.ReproSteps",
                                                "Value": "<p>You can track bugs in much the same way that you track product backlog items (PBIs) or user stories. Using the bug work item form, you capture the code defect in the Title, Steps to Reproduce, and other fields.</p><p><br></p><p>For more information, check out: <a href=\"https://msdn.microsoft.com/en-us/library/vs/alm/work/backlogs/manage-bugs#Capturebugs\">https://msdn.microsoft.com/en-us/library/vs/alm/work/backlogs/manage-bugs#Capturebugs</a></p>"
                                            }
                                        ],
                                        "Parent": "56",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }, {
                                        "templateWorkItemId": "273",
                                        "CreateExpr": "",
                                        "Type": "@BugType",
                                        "Fields": [{
                                            "Field": "System.Title",
                                            "Value": "Show bugs on backlogs and boards"
                                        }, {
                                                "Field": "Microsoft.VSTS.TCM.ReproSteps",
                                                "Value": "<p>As your team identifies code defects or bugs, they can add them to the backlog and track them similar to requirements. Or, they can schedule them to be fixed within a sprint along with other tasks.</p><p><br></p><p>When you track bugs as requirements, they'll show up on the product backlog and Kanban board. When you track bugs similar to tasks, they’ll show up on the sprint backlogs and task boards.</p><p><br></p><p>For more information, check out: <a href=\"https://msdn.microsoft.com/en-us/Library/vs/alm/Work/customize/show-bugs-on-backlog\">https://msdn.microsoft.com/en-us/Library/vs/alm/Work/customize/show-bugs-on-backlog</a></p><br><p><img style=\"width:491px;\" src=\"https://i-msdn.sec.s-msft.com/Library/vs/alm/Work/customize/_img/team-settings.png\"><br></p>"
                                            }],
                                        "Parent": "67",
                                        "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                    }

                                ]


                            }
                        }, {
                            "Service": "BoardSettingSampleDataService",
                            "Name": "Board settings",
                            "DependentOn": "AreaSampleDataService",
                            "TemplateData": {
                                "TeamName": "@CurrentTeam",
                                "BoardName": "@KanbanBoardName",
                                "CardSettings": {
                                    "cards": {
                                        "@RequirementType": [{
                                            "fieldIdentifier": "System.Title"
                                        }, {
                                                "fieldIdentifier": "Microsoft.VSTS.Common.Priority"
                                            }, {
                                                "fieldIdentifier": "System.Id",
                                                "displayType": "CORE"
                                            }, {
                                                "fieldIdentifier": "System.AssignedTo",
                                                "displayType": "CORE",
                                                "displayFormat": "AvatarAndFullName"
                                            }, {
                                                "fieldIdentifier": "System.Tags",
                                                "displayType": "CORE"
                                            }, {
                                                "showEmptyFields": "false"
                                            }]

                                    }
                                },
                                "CardRules": {
                                    "rules": {
                                        "fill": [

                                            {
                                                "filter": " [System.Title] = 'Customize cards'",
                                                "name": "Customize cards",
                                                "isEnabled": "true",
                                                "settings": {
                                                    "background-color": "#CCABDE",
                                                    "title-color": "#602F70"
                                                }
                                            }, {
                                                "filter": " [System.State] = '@KanbanState_2'",
                                                "name": "In Progress",
                                                "isEnabled": "true",
                                                "settings": {
                                                    "background-color": "#DCEEC6",
                                                    "title-color": "#000000"
                                                }
                                            }, {
                                                "filter": " [System.State] = '@KanbanStateDone'",
                                                "name": "Completed Work",
                                                "isEnabled": "true",
                                                "settings": {
                                                    "background-color": "#E7E7E7",
                                                    "title-color": "#000000"
                                                }
                                            }
                                        ],

                                        "tagStyle": [{
                                            "filter": null,
                                            "name": "For your information",
                                            "isEnabled": "true",
                                            "settings": {
                                                "background-color": "#2CBDD9",
                                                "color": "#000000"
                                            }
                                        }, {
                                                "filter": null,
                                                "name": "Needs review",
                                                "isEnabled": "true",
                                                "settings": {
                                                    "background-color": "#FBBC3D",
                                                    "color": "#000000"
                                                }
                                            }, {
                                                "filter": null,
                                                "name": "Follow up",
                                                "isEnabled": "true",
                                                "settings": {
                                                    "background-color": "#FBFD52",
                                                    "color": "#000000"
                                                }
                                            }]
                                    }
                                }
                            }
                        }
                    ]
                }, {
                        "Name": "SAFe with VSTS",
                        "Description": "Getting started with SAFe in VSTS",
                        "IconUrl": "/img/Safe.png",
                        "Message": "<a href='https://www.visualstudio.com/en-us/docs/work/scale/scaled-agile-framework' target='_blank'>Read how VSTS suppports SAFe</a>",
                        "TryItLink": "_backlogs?level=Epics&_a=backlog",
                        "TryItLinkText": "Try out the sample data",
                        "Parameters": [{
                            "Field": "@TaskInProgressState",
                            "Value": "='@RequirementType'=='Product Backlog Item' ? 'In Progress':'Active'"
                        }, {
                                "Field": "@IssueType",
                                "Value": "='@RequirementType'=='Product Backlog Item' ? 'Impediment':'Issue'"
                            }


                        ],

                        "DataServices": [{
                            "Service": "AreaSampleDataService",
                            "Name": "Areas",
                            "TemplateData": {
                                "nodes": [

                                    {
                                        "Path": "",
                                        "Name": "Fiber Suite",
                                        "Children": [{
                                            "Path": "Fiber Suite",
                                            "Name": "App"
                                        }, {
                                                "Path": "Fiber Suite",
                                                "Name": "Migrate"
                                            }, {
                                                "Path": "Fiber Suite",
                                                "Name": "Report"
                                            }, {
                                                "Path": "Fiber Suite",
                                                "Name": "System"
                                            }]

                                    }, {
                                        "Path": "",
                                        "Name": "Service Suite",
                                        "Children": [{
                                            "Path": "Service Suite",
                                            "Name": "Performance"
                                        }, {
                                                "Path": "Service Suite",
                                                "Name": "Web App"
                                            }, {
                                                "Path": "Service Suite",
                                                "Name": "Web Service"
                                            }]

                                    }
                                ]
                            }
                        }, {
                                "Service": "IterationSampleDataService",
                                "Name": "Iterations",
                                "DependentOn": "AreaSampleDataService",
                                "TemplateData": {
                                    "nodes": [{
                                        "Path": "",
                                        "Name": "PI 1",
                                        "Children": [{
                                            "Path": "PI 1",
                                            "Name": "Sprint 1"
                                        }, {
                                                "Path": "PI 1",
                                                "Name": "Sprint 2"
                                            }, {
                                                "Path": "PI 1",
                                                "Name": "Sprint 3"
                                            }, {
                                                "Path": "PI 1",
                                                "Name": "Sprint 4"
                                            }]
                                    }, {
                                            "Path": "",
                                            "Name": "PI 2"
                                        }, {
                                            "Path": "",
                                            "Name": "PI 3"
                                        }]
                                }
                            },

                            {
                                "Service": "TeamSampleDataService",
                                "DependentOn": "IterationSampleDataService",
                                "Name": "Teams",
                                "TemplateData": {
                                    "teams": [

                                        {
                                            "Name": "@CurrentTeam",
                                            "BugsBehavior": "asRequirements",
                                            "BacklogVisibility": {
                                                "Microsoft.EpicCategory": true,
                                                "Microsoft.FeatureCategory": true,
                                                "Microsoft.RequirementCategory": true
                                            }
                                        }, {
                                            "Name": "Fiber Suite",
                                            "Description": "Example team 1",
                                            "DefaultTeamValue": "Fiber Suite",
                                            "TeamValues": [{
                                                "includeChildren": false,
                                                "value": "Fiber Suite"
                                            }],
                                            "Iterations": {
                                                "RootIteration": "\\",
                                                "Iterations": ["PI 1", "PI 2", "PI 3"]
                                            }
                                        }, {
                                            "Name": "Fiber Suite App",
                                            "Description": "Example team 2",
                                            "DefaultTeamValue": "Fiber Suite\\App",
                                            "TeamValues": [{
                                                "includeChildren": true,
                                                "value": "Fiber Suite\\App"
                                            }],
                                            "Iterations": {
                                                "RootIteration": "\\",
                                                "Iterations": ["PI 1\\Sprint 1", "PI 1\\Sprint 2", "PI 1\\Sprint 3", "PI 1\\Sprint 4"]
                                            }
                                        }, {
                                            "Name": "Fiber Suite Migrate",
                                            "Description": "Example team 2",
                                            "DefaultTeamValue": "Fiber Suite\\Migrate",
                                            "TeamValues": [{
                                                "includeChildren": true,
                                                "value": "Fiber Suite\\Migrate"
                                            }],
                                            "Iterations": {
                                                "RootIteration": "\\",
                                                "Iterations": ["PI 1\\Sprint 1", "PI 1\\Sprint 2", "PI 1\\Sprint 3", "PI 1\\Sprint 4"]
                                            }
                                        }, {
                                            "Name": "Fiber Suite Report",
                                            "Description": "Example team 2",
                                            "DefaultTeamValue": "Fiber Suite\\Report",
                                            "TeamValues": [{
                                                "includeChildren": true,
                                                "value": "Fiber Suite\\Report"
                                            }],
                                            "Iterations": {
                                                "RootIteration": "\\",
                                                "Iterations": ["PI 1\\Sprint 1", "PI 1\\Sprint 2", "PI 1\\Sprint 3", "PI 1\\Sprint 4"]
                                            }
                                        }, {
                                            "Name": "Fiber Suite System",
                                            "Description": "Example team 2",
                                            "DefaultTeamValue": "Fiber Suite\\System",
                                            "TeamValues": [{
                                                "includeChildren": true,
                                                "value": "Fiber Suite\\System"
                                            }],
                                            "Iterations": {
                                                "RootIteration": "\\",
                                                "Iterations": ["PI 1\\Sprint 1", "PI 1\\Sprint 2", "PI 1\\Sprint 3", "PI 1\\Sprint 4"]
                                            }
                                        }, {
                                            "Name": "Service Suite",
                                            "Description": "Example team 1",
                                            "DefaultTeamValue": "Service Suite",
                                            "TeamValues": [{
                                                "includeChildren": false,
                                                "value": "Service Suite"
                                            }],
                                            "Iterations": {
                                                "RootIteration": "\\",
                                                "Iterations": ["PI 1", "PI 2", "PI 3"]
                                            }
                                        }, {
                                            "Name": "Service Suite App",
                                            "Description": "Example team 2",
                                            "DefaultTeamValue": "Service Suite\\Web App",
                                            "TeamValues": [{
                                                "includeChildren": true,
                                                "value": "Service Suite\\Web App"
                                            }],
                                            "Iterations": {
                                                "RootIteration": "\\",
                                                "Iterations": ["PI 1\\Sprint 1", "PI 1\\Sprint 2", "PI 1\\Sprint 3", "PI 1\\Sprint 4"]
                                            }
                                        }, {
                                            "Name": "Service Suite Performance",
                                            "Description": "Example team 2",
                                            "DefaultTeamValue": "Service Suite\\Performance",
                                            "TeamValues": [{
                                                "includeChildren": true,
                                                "value": "Service Suite\\Performance"
                                            }],
                                            "Iterations": {
                                                "RootIteration": "\\",
                                                "Iterations": ["PI 1\\Sprint 1", "PI 1\\Sprint 2", "PI 1\\Sprint 3", "PI 1\\Sprint 4"]
                                            }
                                        }, {
                                            "Name": "Service Suite Web Service",
                                            "Description": "Example team 2",
                                            "DefaultTeamValue": "Service Suite\\Web Service",
                                            "TeamValues": [{
                                                "includeChildren": true,
                                                "value": "Service Suite\\Web Service"
                                            }],
                                            "Iterations": {
                                                "RootIteration": "\\",
                                                "Iterations": ["PI 1\\Sprint 1", "PI 1\\Sprint 2", "PI 1\\Sprint 3", "PI 1\\Sprint 4"]
                                            }
                                        }
                                    ]
                                }
                            },

                            {
                                "Service": "WorkItemSampleDataService",
                                "Name": "Work items",
                                "DependentOn": "IterationSampleDataService",
                                "TemplateData": {
                                    "templatedWorkItems": [{
                                        "templateWorkItemId": "289",
                                        "CreateExpr": "",
                                        "Type": "@FeatureType",
                                        "Fields": [{
                                            "Field": "System.AreaPath",
                                            "Value": "Fiber Suite\\App"
                                        },

                                            {
                                                "Field": "System.State",
                                                "Value": "New"
                                            }, {
                                                "Field": "System.Reason",
                                                "Value": "New"
                                            }, {
                                                "Field": "System.Title",
                                                "Value": "Secure personalization"
                                            }
                                        ]
                                    }, {
                                            "templateWorkItemId": "290",
                                            "CreateExpr": "",
                                            "Type": "@FeatureType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\App"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Share user personalization across devices"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "291",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\App"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "As a user, I can select whether to keep my personalization local or roaming, so that I can share the personalization across all devices"
                                                }
                                            ],
                                            "Parent": "290",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "292",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\App"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "As a user, I can select whether to keep my state local or roaming, so that I can share my state across all devices"
                                                }
                                            ],
                                            "Parent": "290",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "293",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\App"
                                            }, {
                                                    "Field": "System.IterationPath",
                                                    "Value": "PI 1"
                                                },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Implement a service that receives and stores user feedback"
                                                }
                                            ],
                                            "Parent": "290",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "295",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\App"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Performance boost in low-bandwidth modems"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "297",
                                            "CreateExpr": "",
                                            "Type": "@BugType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Slow response on information form"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "299",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\Migrate"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Add animated emoticons"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "301",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Design welcome screen"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "302",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Change background color"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "305",
                                            "CreateExpr": "",
                                            "Type": "@EpicType",
                                            "Fields": [{
                                                "Field": "System.IterationPath",
                                                "Value": "PI 1"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Improve User Experience"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "universal applications"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "306",
                                            "CreateExpr": "",
                                            "Type": "@FeatureType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite"
                                            }, {
                                                    "Field": "System.IterationPath",
                                                    "Value": "PI 1"
                                                },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Integrate client application with popular email clients"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "universal applications"
                                                }
                                            ],
                                            "Parent": "305",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "307",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\App"
                                            }, {
                                                    "Field": "System.IterationPath",
                                                    "Value": "PI 1\\Sprint 1"
                                                },


                                                {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Implement a factory which abstracts the email client"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "universal applications"
                                                }
                                            ],
                                            "Parent": "306",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "308",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\App"
                                            }, {
                                                    "Field": "System.IterationPath",
                                                    "Value": "PI 1\\Sprint 1"
                                                },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Support selection of support cases and email them"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "universal applications"
                                                }
                                            ],
                                            "Parent": "306",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "309",
                                            "CreateExpr": "",
                                            "Type": "@FeatureType",
                                            "Fields": [{
                                                "Field": "System.IterationPath",
                                                "Value": "PI 1\\Sprint 1"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Integrate client app with IM clients"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "universal applications"
                                                }
                                            ],
                                            "Parent": "305",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "310",
                                            "CreateExpr": "",
                                            "Type": "@FeatureType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite"
                                            }, {
                                                    "Field": "System.IterationPath",
                                                    "Value": "PI 1"
                                                },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Emoticon feedback enabled in client application"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "universal applications"
                                                }
                                            ],
                                            "Parent": "305",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "311",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\App"
                                            }, {
                                                    "Field": "System.IterationPath",
                                                    "Value": "PI 1\\Sprint 1"
                                                },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "As a user, I can select an emoticon and add a short description"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "universal applications"
                                                }
                                            ],
                                            "Parent": "310",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "312",
                                            "CreateExpr": "",
                                            "Type": "@EpicType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Framework to port applications to all devices"
                                                }, {
                                                    "Field": "Microsoft.VSTS.Common.ValueArea",
                                                    "Value": "Architectural"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "universal applications"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "313",
                                            "CreateExpr": "",
                                            "Type": "@FeatureType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Migrate legacy code to portable frameworks"
                                                }, {
                                                    "Field": "Microsoft.VSTS.Common.ValueArea",
                                                    "Value": "Architectural"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "universal applications"
                                                }
                                            ],
                                            "Parent": "312",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "314",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\Migrate"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "As a developer, I can analyze a code base to determine compliance with portable framework"
                                                }, {
                                                    "Field": "Microsoft.VSTS.Common.ValueArea",
                                                    "Value": "Architectural"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "universal applications"
                                                }
                                            ],
                                            "Parent": "313",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "315",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\Migrate"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Simplify analysis tool"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "universal applications"
                                                }
                                            ],
                                            "Parent": "314",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "316",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\Migrate"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Add auto-analysis checkbox to checkin sequence"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "universal applications"
                                                }
                                            ],
                                            "Parent": "314",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "317",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\Migrate"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Deploy premium service for code analysis"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "universal applications"
                                                }
                                            ],
                                            "Parent": "314",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "318",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\Migrate"
                                            }, {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Add test suite for automation"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "universal applications"
                                                }],
                                            "Parent": "314",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "319",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\Migrate"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Implement a framework that migrates legacy to portable frameworks"
                                                }, {
                                                    "Field": "Microsoft.VSTS.Common.ValueArea",
                                                    "Value": "Architectural"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "universal applications"
                                                }
                                            ],
                                            "Parent": "313",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "320",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\Migrate"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Develop framework architecture"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "universal applications"
                                                }
                                            ],
                                            "Parent": "319",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "321",
                                            "CreateExpr": "",
                                            "Type": "@EpicType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Shared Personalization and State"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "universal applications"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "322",
                                            "CreateExpr": "",
                                            "Type": "@EpicType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Service interfaces to support Rest API"
                                                }, {
                                                    "Field": "Microsoft.VSTS.Common.ValueArea",
                                                    "Value": "Architectural"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "integrate with 3rd-party devs"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "323",
                                            "CreateExpr": "",
                                            "Type": "@FeatureType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Service Suite"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Convert legacy OData service interfaces to Rest API"
                                                }, {
                                                    "Field": "Microsoft.VSTS.Common.ValueArea",
                                                    "Value": "Architectural"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "integrate with 3rd-party devs"
                                                }
                                            ],
                                            "Parent": "322",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "324",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Service Suite\\Web Service"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Convert all services from using experimental OData to the supported REST API"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "integrate with 3rd-party devs"
                                                }
                                            ],
                                            "Parent": "323",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "325",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Service Suite\\Web Service"
                                            }, {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Convert all client service calls from using experimental OData to the supported REST API"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "integrate with 3rd-party devs"
                                                }],
                                            "Parent": "323",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "326",
                                            "CreateExpr": "",
                                            "Type": "@EpicType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Counter the Heartbleed web security bug"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "security"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "327",
                                            "CreateExpr": "",
                                            "Type": "@FeatureType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Update software to resolve the OpenSLL cryptographic software library vulnerability"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "security"
                                                }
                                            ],
                                            "Parent": "326",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "328",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\Migrate"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Update and re-test suite code base affected by the vulnerability."
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "security"
                                                }
                                            ],
                                            "Parent": "327",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "329",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\Migrate"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Update and re-test service code base affected by the vulnerability."
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "security"
                                                }
                                            ],
                                            "Parent": "327",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "330",
                                            "CreateExpr": "",
                                            "Type": "@FeatureType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite"
                                            }, {
                                                    "Field": "System.IterationPath",
                                                    "Value": "PI 1"
                                                }, {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Scan all software for the OpenSLL cryptographic software library vulnerability"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "security"
                                                }],
                                            "Parent": "326",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "331",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\System"
                                            }, {
                                                    "Field": "System.IterationPath",
                                                    "Value": "PI 1\\Sprint 1"
                                                }, {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Scan all code base and identify the affected code in service apps."
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "security"
                                                }],
                                            "Parent": "330",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "332",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\System"
                                            }, {
                                                    "Field": "System.IterationPath",
                                                    "Value": "PI 1\\Sprint 1"
                                                },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Scan all code base and identify the affected code in suite apps."
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "security"
                                                }
                                            ],
                                            "Parent": "330",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "333",
                                            "CreateExpr": "",
                                            "Type": "@EpicType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Convert legacy OData service interfaces"
                                                }, {
                                                    "Field": "Microsoft.VSTS.Common.ValueArea",
                                                    "Value": "Architectural"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "integrate with 3rd-party devs"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "334",
                                            "CreateExpr": "",
                                            "Type": "@EpicType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Windows update release"
                                                }, {
                                                    "Field": "Microsoft.VSTS.Common.ValueArea",
                                                    "Value": "Architectural"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "servicing"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "335",
                                            "CreateExpr": "",
                                            "Type": "@EpicType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Migrate legacy code to portable frameworks"
                                                }, {
                                                    "Field": "Microsoft.VSTS.Common.ValueArea",
                                                    "Value": "Architectural"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "integrate with 3rd-party devs"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "336",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Update code on lion module"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "337",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Lorem data compression algorithm"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "338",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Refactor compression code"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "339",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Create model report"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "340",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Test run for report stability"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "341",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Fix performance issues"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "342",
                                            "CreateExpr": "",
                                            "Type": "@EpicType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "World-class customer support"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "support"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "343",
                                            "CreateExpr": "",
                                            "Type": "@FeatureType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite"
                                            }, {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Mitigate impact of low-coverage areas"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "support"
                                                }],
                                            "Parent": "342",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "344",
                                            "CreateExpr": "",
                                            "Type": "@FeatureType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite"
                                            }, {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Use customer data in targeting service expansions"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "support"
                                                }],
                                            "Parent": "342",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "345",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\App"
                                            }, {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "As a user, I can select a user friendly report of selected feedback, so that we can share with stakeholders"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "support"
                                                }],
                                            "Parent": "344",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "346",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\App"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Self-report coverage dead zones"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "support"
                                                }
                                            ],
                                            "Parent": "344",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "348",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Change background color"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "349",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Change page layout"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "350",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Develop about page"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "352",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Add welcome back text"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "353",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Display user's name in header"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "355",
                                            "CreateExpr": "",
                                            "Type": "@IssueType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "Active"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Phone sign in"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "356",
                                            "CreateExpr": "",
                                            "Type": "@IssueType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "Active"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Research architecture changes"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "357",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Collect requirements"
                                                }
                                            ],
                                            "Parent": "356",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "358",
                                            "CreateExpr": "",
                                            "Type": "@TaskType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Standardize on form factors"
                                                }
                                            ],
                                            "Parent": "356",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "359",
                                            "CreateExpr": "",
                                            "Type": "@IssueType",
                                            "Fields": [{
                                                "Field": "System.State",
                                                "Value": "Active"
                                            }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Switch context issues"
                                                }]
                                        }, {
                                            "templateWorkItemId": "360",
                                            "CreateExpr": "",
                                            "Type": "@EpicType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Service Suite"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Support customer mobility in all services"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "mobile applications"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "361",
                                            "CreateExpr": "",
                                            "Type": "@EpicType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\System"
                                            },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Deploy high performance updates across all applications"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "performance"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "362",
                                            "CreateExpr": "",
                                            "Type": "@FeatureType",
                                            "Fields": [{
                                                "Field": "System.State",
                                                "Value": "New"
                                            }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Secure personalization"
                                                }]
                                        }, {
                                            "templateWorkItemId": "363",
                                            "CreateExpr": "",
                                            "Type": "@FeatureType",
                                            "Fields": [

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Share user personalization across devices"
                                                }
                                            ]
                                        }, {
                                            "templateWorkItemId": "364",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\Migrate"
                                            }, {
                                                    "Field": "System.IterationPath",
                                                    "Value": "PI 1\\Sprint 3"
                                                },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Simplify analysis tool"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "integrate with 3rd-party devs"
                                                }
                                            ],
                                            "Parent": "369",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "365",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\Migrate"
                                            }, {
                                                    "Field": "System.IterationPath",
                                                    "Value": "PI 1\\Sprint 3"
                                                },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Add auto-analysis checkbox to checkin sequence"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "integrate with 3rd-party devs"
                                                }
                                            ],
                                            "Parent": "369",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "366",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\Migrate"
                                            }, {
                                                    "Field": "System.IterationPath",
                                                    "Value": "PI 1\\Sprint 3"
                                                },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Deploy premium service for code analysis"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "integrate with 3rd-party devs"
                                                }
                                            ],
                                            "Parent": "369",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "367",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\Migrate"
                                            }, {
                                                    "Field": "System.IterationPath",
                                                    "Value": "PI 1\\Sprint 3"
                                                },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Add test suite for automation"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "integrate with 3rd-party devs"
                                                }
                                            ],
                                            "Parent": "369",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "368",
                                            "CreateExpr": "",
                                            "Type": "@RequirementType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite\\Migrate"
                                            }, {
                                                    "Field": "System.IterationPath",
                                                    "Value": "PI 1\\Sprint 3"
                                                },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Develop framework architecture"
                                                }, {
                                                    "Field": "Microsoft.VSTS.Common.ValueArea",
                                                    "Value": "Architectural"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "integrate with 3rd-party devs"
                                                }
                                            ],
                                            "Parent": "370",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "369",
                                            "CreateExpr": "",
                                            "Type": "@FeatureType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite"
                                            }, {
                                                    "Field": "System.IterationPath",
                                                    "Value": "PI 1"
                                                },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "As a developer, I can analyze a code base to determine compliance with portable framework"
                                                }, {
                                                    "Field": "Microsoft.VSTS.Common.ValueArea",
                                                    "Value": "Architectural"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "integrate with 3rd-party devs"
                                                }
                                            ],
                                            "Parent": "335",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }, {
                                            "templateWorkItemId": "370",
                                            "CreateExpr": "",
                                            "Type": "@FeatureType",
                                            "Fields": [{
                                                "Field": "System.AreaPath",
                                                "Value": "Fiber Suite"
                                            }, {
                                                    "Field": "System.IterationPath",
                                                    "Value": "PI 1"
                                                },

                                                {
                                                    "Field": "System.State",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Reason",
                                                    "Value": "New"
                                                }, {
                                                    "Field": "System.Title",
                                                    "Value": "Implement a framework that migrates legacy to portable frameworks"
                                                }, {
                                                    "Field": "Microsoft.VSTS.Common.ValueArea",
                                                    "Value": "Architectural"
                                                }, {
                                                    "Field": "System.Tags",
                                                    "Value": "integrate with 3rd-party devs"
                                                }
                                            ],
                                            "Parent": "335",
                                            "LinkType": "System.LinkTypes.Hierarchy-Reverse"
                                        }]

                                }
                            }, {
                                "Service": "BoardSettingSampleDataService",
                                "Name": "Board settings",
                                "DependentOn": "TeamSampleDataService",
                                "TemplateData": {
                                    "TeamName": "@CurrentTeam",
                                    "BoardName": "Epics",
                                    "CardSettings": {
                                        "cards": {
                                            "Epic": [{
                                                "fieldIdentifier": "System.Title"
                                            }, {
                                                    "fieldIdentifier": "System.Id",
                                                    "displayType": "CORE"
                                                }, {
                                                    "fieldIdentifier": "System.AssignedTo",
                                                    "displayType": "CORE",
                                                    "displayFormat": "AvatarAndFullName"
                                                }, {
                                                    "fieldIdentifier": "Microsoft.VSTS.Common.ValueArea",
                                                    "displayType": "CORE"
                                                }, {
                                                    "fieldIdentifier": "System.Tags",
                                                    "displayType": "CORE"
                                                }, {
                                                    "showEmptyFields": "false"
                                                }]

                                        }
                                    },
                                    "CardRules": {
                                        "rules": {
                                            "fill": [

                                                {
                                                    "filter": " [System.Title] = 'Customize cards'",
                                                    "name": "Customize cards",
                                                    "isEnabled": "true",
                                                    "settings": {
                                                        "background-color": "#CCABDE",
                                                        "title-color": "#602F70"
                                                    }
                                                }, {
                                                    "filter": " [System.State] = '@KanbanState_2'",
                                                    "name": "In Progress",
                                                    "isEnabled": "true",
                                                    "settings": {
                                                        "background-color": "#DCEEC6",
                                                        "title-color": "#000000"
                                                    }
                                                }, {
                                                    "filter": " [System.State] = '@KanbanStateDone'",
                                                    "name": "Completed Work",
                                                    "isEnabled": "true",
                                                    "settings": {
                                                        "background-color": "#E7E7E7",
                                                        "title-color": "#000000"
                                                    }
                                                }
                                            ],

                                            "tagStyle": [{
                                                "filter": null,
                                                "name": "For your information",
                                                "isEnabled": "true",
                                                "settings": {
                                                    "background-color": "#2CBDD9",
                                                    "color": "#000000"
                                                }
                                            }, {
                                                    "filter": null,
                                                    "name": "Needs review",
                                                    "isEnabled": "true",
                                                    "settings": {
                                                        "background-color": "#FBBC3D",
                                                        "color": "#000000"
                                                    }
                                                }, {
                                                    "filter": null,
                                                    "name": "Follow up",
                                                    "isEnabled": "true",
                                                    "settings": {
                                                        "background-color": "#FBFD52",
                                                        "color": "#000000"
                                                    }
                                                }]
                                        }
                                    },
                                    "Columns": [{
                                        "name": "Funnel",
                                        "itemLimit": "0",
                                        "stateMappings": {
                                            "Epic": "@FeatureStateNew"
                                        },
                                        "description": "",
                                        "columnType": 0
                                    }, {
                                            "name": "Review",
                                            "itemLimit": "5",
                                            "stateMappings": {
                                                "Epic": "@FeatureState_1"
                                            },
                                            "isSplit": false,
                                            "description": "",
                                            "columnType": 1
                                        }, {
                                            "name": "Analysis",
                                            "itemLimit": "5",
                                            "stateMappings": {
                                                "Epic": "@FeatureState_1"
                                            },
                                            "isSplit": false,
                                            "description": "",
                                            "columnType": 1
                                        }, {
                                            "name": "Portfolio Backlog",
                                            "itemLimit": "5",
                                            "stateMappings": {
                                                "Epic": "@FeatureState_2"
                                            },
                                            "isSplit": false,
                                            "description": "",
                                            "columnType": 1
                                        }, {
                                            "name": "Implementation",
                                            "itemLimit": "5",
                                            "stateMappings": {
                                                "Epic": "@FeatureState_2"
                                            },
                                            "isSplit": false,
                                            "description": "",
                                            "columnType": 1
                                        }, {
                                            "name": "Done",
                                            "itemLimit": "0",
                                            "stateMappings": {
                                                "Epic": "@FeatureStateDone"
                                            },
                                            "description": "",
                                            "columnType": 2
                                        }]

                                }
                            }
                        ]
                    }];

                    deferred.resolve(def);
                        
                
                console.log("getDefaultTemplates fail");
                deferred.reject("No default template");
            });

        return deferred.promise();
    }
}

