//---------------------------------------------------------------------
// <copyright file="WorkItemEngine.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
// </summary>
//---------------------------------------------------------------------
import RestClient = require("TFS/WorkItemTracking/RestClient");
import Contracts = require("TFS/WorkItemTracking/Contracts");
import SampleDataContracts= require("../scripts/SampleDataContract");

import ParamUtils = require("../scripts/ParamUtils");


export interface IWorkItemsTemplate {
    templatedWorkItems: IWorkItemTemplate[];
}

export interface IWorkItemTemplate {
    templateWorkItemId: string;
    CreateExpr?: string;
    Type: string;
    LinkType?: string;
    Parent?: string;
    Fields: IWorkItemTemplateField[]
}

export interface IWorkItemTemplateField {
    Field: string;
    Value: any
}

export interface IWorkItemCreateDocuments {
    urlCreate?: string;
    param?: any;
    type: string;
    title: string;
    color: string;
    postCreateLinks:boolean
    LinkType: string;
    Parent: string;
    templateWorkItemId: string;
    createdId: number;
    createdUrl: string;
}

export class WorkItemEninge {

    private witClient: RestClient.WorkItemTrackingHttpClient2_1;
    private webContext: WebContext;

    constructor(workItemRestClient: RestClient.WorkItemTrackingHttpClient2_1, context?: WebContext) {
        
        this.witClient = workItemRestClient;
        this.webContext = context;
    }

    public CreateWorkItems(template: IWorkItemsTemplate, parameterList: ParamUtils.ITemplateParameter[]): IPromise<any> {
        var deferred = $.Deferred<any>()
        var root: any = null;
        var lst = this.BuildWorkItemsFromTemplate(template, parameterList, root);
        this.CreateInitialWorkItems(lst).then(
            data => {
                deferred.resolve(data.map(i=> { return i.createdId; }));
            },
            err => {
                TelemetryClient.getClient().trackException(err, "WorkItemEngine.CreateWorkItems");
                alert(err);
            }
        );
        return deferred.promise();
    }

    public RemoveWorkItems(wiList: number[]): IPromise<Contracts.WorkItemDelete[]> {
        var deferred = $.Deferred<Contracts.WorkItemDelete[]>();
        var lst: IPromise<Contracts.WorkItemDelete>[] = [];

        console.log("Deleting " + wiList.join(", "));


        var wiql = "Select ID FROM  WorkItemLinks WHERE  ([Source].[System.Id]  In(" + wiList.join(",") + ") AND ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward')  AND  [Target].[System.Id] IN (" + wiList.join(", ") + ") ) ORDER BY System.Id  mode(Recursive)";
      //  var deleteList: Contracts.WorkItemDelete[] = [];
       
        this.witClient.queryByWiql({ query: wiql }, VSS.getWebContext().project.name).then(
            existingWorkItemResults=> {

                var rootWiList = existingWorkItemResults.workItemRelations.filter(i=> {
                    return i.source == null;
                });

                if (rootWiList.length > 0) {
                    rootWiList.forEach(item=> {
                        lst.push(this.witClient.deleteWorkItem(item.target.id, false));
                    });


                    Q.all(lst).then(
                        deleteList=> {
                            console.log("Done Deleting ");
                            this.RemoveWorkItems(wiList).then(
                                items=> {
                                    if (items != null) {
                                        deleteList = deleteList.concat(items);
                                    }
                                    deferred.resolve(deleteList);

                                }, err=> {
                                    console.log("Error Deleting ");
                                    TelemetryClient.getClient().trackException(err, "WorkItemEngine.RemoveWorkItems");
                                    deferred.reject(err);

                                });

                        },
                        err=> {
                            console.log("Error Deleting ");
                            TelemetryClient.getClient().trackException(err, "WorkItemEngine.RemoveWorkItems");
                            deferred.reject(err);
                        }
                    );
                }
                else {
                    deferred.resolve(null);
                }
            },
            err=> {
                console.log("Error Deleting ");
                TelemetryClient.getClient().trackException(err, "WorkItemEngine.RemoveWorkItems");
                deferred.reject(err);
            }
        );

        return deferred.promise();

    }
    
    private CreateInitialWorkItems(wiList: IWorkItemCreateDocuments[] ):IPromise<any> {
        var deferred = $.Deferred<any>();
        var engine = this;
        var wiToSave = wiList.length;

        wiList.forEach(wi=> {
            var thisWi = wi;
            this.witClient.updateWorkItemTemplate(wi.param, VSS.getWebContext().project.name, wi.type,false, true).then( 
                workItem => {
                    thisWi.createdId = workItem.id;
                    thisWi.createdUrl = workItem.url;

                    wiToSave--;
                    if (wiToSave == 0) {
                        engine.LinkWorkItemsTogether(wiList).then(function (lst) {
                            deferred.resolve(lst);
                        });
                    }

                },
                err => {
                    TelemetryClient.getClient().trackException(err, "WorkItemEngine.CreateInitialWorkItems", { WorkItem: wi.title });
                    deferred.reject(err);
                });

        });
        return deferred.promise();
    }

    private  LinkWorkItemsTogether(wiList):IPromise<any> {
        var deferred = $.Deferred();
        var engine = this;
        
        var promiseList: IPromise<any>[] = [];
        wiList.forEach(function (wi) {

            if (wi.postCreateLinks != null && wi.postCreateLinks == true) {
                var templateWi = wi;
                var params = [];
                var parent = wiList.filter(function (i) { return i.templateWorkItemId == templateWi.Parent; })[0];

                if (parent != null) {
                    params.push({
                        "op": "add", "path": "/relations/-", "value": {
                            "rel": templateWi.LinkType,
                            "url": parent.createdUrl
                        }
                    });

                    promiseList.push(engine.witClient.updateWorkItem(params, wi.createdId, false, false));
                }
            }
        });

        Q.all(promiseList).then( lst => {
            deferred.resolve(wiList);
        });

        return deferred.promise();
    }

    public ReplaceParameters(template: IWorkItemsTemplate, parameterList: ParamUtils.ITemplateParameter[]) {
        if (template != null && template.templatedWorkItems != null) {
       

            template.templatedWorkItems.forEach(templateWI => {
       
                templateWI.Type = ParamUtils.ReplaceParams(templateWI.Type, parameterList);
                
                if (templateWI.CreateExpr != null && templateWI.CreateExpr != "") {
                    templateWI.CreateExpr = ParamUtils.ReplaceParams(templateWI.CreateExpr, parameterList);
                }

                templateWI.Fields.forEach(function (fld) {
                    if (fld.Value != "") {
                        fld.Value = ParamUtils.ReplaceParams(fld.Value, parameterList);
                    }
                });

            });
        }
    }
    public BuildWorkItemsFromTemplate(template: IWorkItemsTemplate, parameterList: ParamUtils.ITemplateParameter[], rootWI: any): IWorkItemCreateDocuments[] {

        var urlBase = VSS.getWebContext().collection.uri + "/_apis/";
        var wiLst: IWorkItemCreateDocuments[] = [];

        var engine = this;

        if (template != null && template.templatedWorkItems != null) {
          
            template.templatedWorkItems.forEach(function (templateWI) {
                var create = true;

                engine.ReplaceParameters(template, parameterList);

                if (templateWI.CreateExpr != null && templateWI.CreateExpr != "") {
                    create = eval(templateWI.CreateExpr);
                }

                if (create) {
                    var urlCreate = "wit/workitems/$" + templateWI.Type + "?api-version=1.0";
                    var title = "";
                    var msgBody = "["
                    var msgParams = [];

                    templateWI.Fields.forEach(function (fld) {
                        if (fld.Field != "") {
                            var value = fld.Value;

                            if (fld.Field == "System.Title") {
                                title = value;
                            }
                            if (fld.Field == "System.AreaPath") {
                                value = VSS.getWebContext().project.name + "\\" + value;
                            }
                            if (fld.Field == "System.IterationPath") {
                                value = VSS.getWebContext().project.name + "\\" + value;
                            }
                            msgParams.push({ "op": "add", "path": "/fields/" + fld.Field, "value": value });
                        }
                    });

                    var postCreateLinks = false;

                    if (templateWI.LinkType != "NONE" && templateWI.LinkType != "") { //TODOD 
                        var parentUrl = "";
                        if (templateWI.Parent == "root") {
                            parentUrl = rootWI.Url;
                            rootWI.linkedFromChild = true;

                            msgParams.push({
                                "op": "add", "path": "/relations/-", "value": {
                                    "rel": templateWI.LinkType,
                                    "url": urlBase + parentUrl
                                }
                            });
                        }
                        else {
                            postCreateLinks = true;
                        }
                    }

                    var doc: IWorkItemCreateDocuments =
                        {
                            urlCreate: urlCreate,
                            param: msgParams,
                            type: templateWI.Type,
                            title: title,
                            color: Utilities.GetWorkItemColor(templateWI.Type),
                            postCreateLinks: postCreateLinks,
                            LinkType: templateWI.LinkType,
                            Parent: templateWI.Parent,
                            templateWorkItemId: templateWI.templateWorkItemId,
                            createdId: null,
                            createdUrl: null
                        };

                    wiLst.push(doc);
                }
            });
        }
        return wiLst;
    }
}




