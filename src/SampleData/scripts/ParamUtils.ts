//---------------------------------------------------------------------
// <copyright file="ParamUtils.ts">
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

import WITRestClient = require("TFS/WorkItemTracking/RestClient");
import WITContracts = require("TFS/WorkItemTracking/Contracts");


export interface ITemplateParameter {
    Field: string;
    Value: any;
    SystemParam?: boolean;
}

export function addSystemParameters(params: ITemplateParameter[]) {

    params.push({ Field: "@Me", Value: VSS.getWebContext().user.name, SystemParam:true });
    params.push({ Field: "@Today", Value: new Date(Date.now()).toJSON(), SystemParam:true });

    params.push({ Field: "@CurrentTeam", Value: VSS.getWebContext().team.name, SystemParam: true });
    params.push({ Field: "@CurrentIteration", Value: "Sprint 1", SystemParam: true });
}
export function calcUserParams(params: ITemplateParameter[], systemParams: ITemplateParameter[]): ITemplateParameter[] {

    params.forEach(p=> {
        p.Value = ReplaceParams(p.Value, systemParams);
        var s: string = p.Value;
        if (s.indexOf("=") == 0) {
            s = s.substr(1);
            p.Value = eval(s);            
        }
    });
    return params;
}


export function addProcessTemplatesParameters() {
    var deferred = $.Deferred<ITemplateParameter[]>();

    var WITclient: WITRestClient.WorkItemTrackingHttpClient2_2 = WITRestClient.getClient();
    var categoriesPromise = WITclient.getWorkItemTypeCategories(VSS.getWebContext().project.id);
        
    //var COREclient = CoreRestClient.getClient();
    //var sprintPromise: IPromise<WorkContracts.TeamSettingsIteration>;

    //COREclient.getTeam(VSS.getWebContext().project.id, VSS.getWebContext().team.id).then(
    //    teamContext=> {
    //        var WorkClient = WorkRestClient.getClient();
    //        sprintPromise = WorkClient.getTeamIteration(teamContext, );
    //    });

    Q.all([categoriesPromise]).then(
        data => {
            var categories = data[0];
            
            var params: ITemplateParameter[];
            params = AddBoardNamesParams(categories);
            params = params.concat(AddKanbanStates(categories));

            categories.forEach(c => {
                params.push({ Field: "@" + c.name.replace(/ /g, '').replace('Category', '') + "Type", Value: c.defaultWorkItemType.name, SystemParam: true});
            });


            deferred.resolve(params);
        },
        err=> {
            TelemetryClient.getClient().trackException(err, "addProcessTemplatesParameters");
            deferred.reject(err);
        }

    );

    return deferred.promise();
}

 function AddBoardNamesParams(categories: WITContracts.WorkItemTypeCategory[]): ITemplateParameter[] {
    var pLst: ITemplateParameter[] = [];

    var name: string = categories.filter(i=> { return i.referenceName =="Microsoft.RequirementCategory" })[0].defaultWorkItemType.name
    if (name.indexOf(" ") != -1) {
        name = name.substr(name.indexOf(" ")+1);
    }
    if (name.charAt(name.length-1) == 'y') {
        name = name.substr(0, name.length - 1) + "ies";
    }
    else {
        name = name + "s";
    }
    pLst.push({ Field: "@KanbanBoardName", Value: name, SystemParam: true });
 
    return pLst;
}

 function AddKanbanStates(categories: WITContracts.WorkItemTypeCategory[]): ITemplateParameter[] {
     var pLst: ITemplateParameter[] = [];

     var name: string = categories.filter(i=> { return i.referenceName == "Microsoft.RequirementCategory" })[0].defaultWorkItemType.name
     if (name.indexOf("User Story") != -1) {
         pLst.push({ Field: "@KanbanStateNew", Value: "New", SystemParam: true });
         pLst.push({ Field: "@KanbanState_1", Value: "Active", SystemParam: true });
         pLst.push({ Field: "@KanbanState_2", Value: "Resolved", SystemParam: true });
         pLst.push({ Field: "@KanbanStateDone", Value: "Closed", SystemParam: true });
         pLst.push({ Field: "@FeatureStateNew", Value: "New", SystemParam: true });
         pLst.push({ Field: "@FeatureState_1", Value: "Active", SystemParam: true });
         pLst.push({ Field: "@FeatureState_2", Value: "Resolved", SystemParam: true });
         pLst.push({ Field: "@FeatureStateDone", Value: "Closed", SystemParam: true });
     }
     else if (name.indexOf("Requirement") != -1) {
         pLst.push({ Field: "@KanbanStateNew", Value: "Proposed", SystemParam: true });
         pLst.push({ Field: "@KanbanState_1", Value: "Active", SystemParam: true });
         pLst.push({ Field: "@KanbanState_2", Value: "Resolved", SystemParam: true });
         pLst.push({ Field: "@KanbanStateDone", Value: "Closed", SystemParam: true });
         pLst.push({ Field: "@FeatureStateNew", Value: "Proposed", SystemParam: true });
         pLst.push({ Field: "@FeatureState_1", Value: "Active", SystemParam: true });
         pLst.push({ Field: "@FeatureState_2", Value: "Resolved", SystemParam: true });
         pLst.push({ Field: "@FeatureStateDone", Value: "Closed", SystemParam: true });
     }
     else {
         pLst.push({ Field: "@KanbanStateNew", Value: "New", SystemParam: true });
         pLst.push({ Field: "@KanbanState_1", Value: "Approved", SystemParam: true });
         pLst.push({ Field: "@KanbanState_2", Value: "Committed", SystemParam: true });
         pLst.push({ Field: "@KanbanStateDone", Value: "Done", SystemParam: true });
         pLst.push({ Field: "@FeatureStateNew", Value: "New", SystemParam: true });
         pLst.push({ Field: "@FeatureState_1", Value: "In Progress", SystemParam: true });
         pLst.push({ Field: "@FeatureState_2", Value: "In Progress", SystemParam: true });
         pLst.push({ Field: "@FeatureStateDone", Value: "Done", SystemParam: true });

     };

     return pLst;
 }


export function ReplaceParams(value, parameters: ITemplateParameter[] ) {
    if (value.search != undefined) {
        if (value.search("@") >= 0 || value.indexOf("[") >= 0) {
            if (parameters.length > 0) {
                parameters.forEach(function (param) {
                    var regex = RegExp(param.Field, 'gi');
                    if (value.search(regex) >= 0) {
                        value = value.replace(regex, param.Value);
                    }
                });
            }
        }
        //if (value.indexOf("[") >= 0) {
        //    if (parameters.length > 0) {
        //        parameters.forEach(function (param) {
        //            var regex = RegExp("[" + param.Field + "]", 'gi');
        //            if (value.search(regex) >= 0) {
        //                value = value.replace(regex, param.Value);
        //            }
        //        });
        //    }
        //}        
    }
    return value;
}

export function ReverseReplaceParams(value, parameters: ITemplateParameter[]) {
    if (value.search != undefined) {
        if (parameters.length > 0) {
            parameters.forEach(function (param) {
                if (value == param.Value) {
                    value = param.Field;
                }
            });
        }
    }
    return value;
}