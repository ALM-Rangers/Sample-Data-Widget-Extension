//---------------------------------------------------------------------
// <copyright file="WorkItemSampleDataService.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
// </summary>
//---------------------------------------------------------------------

import WITRestClient = require("TFS/WorkItemTracking/RestClient");
import SampleDataContracts = require("../scripts/SampleDataContract");
import WITemplateEngine = require("../scripts/WorkItemEngine");

import ParamUtils = require("../scripts/ParamUtils");


export class WorkItemSampleDataService implements SampleDataContracts.ISampleDataService {

    public PopulateData(templateData: SampleDataContracts.ISampleDataServiceTemplate, parameterList: ParamUtils.ITemplateParameter[]): IPromise<SampleDataContracts.ISampleDataServiceTemplate> {

        return this.Execute(SampleDataContracts.executeAction.Populate, templateData, parameterList);

    }

    public RemoveData(installedData: SampleDataContracts.ISampleDataServiceTemplate, parameterList: ParamUtils.ITemplateParameter[]): IPromise<SampleDataContracts.ISampleDataServiceTemplate> {

        return this.Execute(SampleDataContracts.executeAction.Remove, installedData, parameterList);
    }

    private Execute(action: SampleDataContracts.executeAction, templateData: SampleDataContracts.ISampleDataServiceTemplate, parameterList: ParamUtils.ITemplateParameter[]): IPromise<SampleDataContracts.ISampleDataServiceTemplate> {
        var deferred = $.Deferred<SampleDataContracts.ISampleDataServiceTemplate>();

        var wiEngine = new WITemplateEngine.WorkItemEninge(WITRestClient.getClient(), VSS.getWebContext());
        var wiTemplate: WITemplateEngine.IWorkItemsTemplate = templateData.TemplateData;

        if (action == SampleDataContracts.executeAction.Populate) {
            var callerTemplateData = templateData;
            wiEngine.CreateWorkItems(wiTemplate, parameterList).then(list => {
                callerTemplateData.InstalledData = list;
                deferred.resolve(callerTemplateData);
            },
                err => {
                    TelemetryClient.getClient().trackException(err, "WorkItemSampleDataService.Execute.Create", { Template: templateData.Name });
                });
        }
        else {
            if (templateData.InstalledData != null) {
                var callerTemplateData = templateData;
                var list: number[] = templateData.InstalledData;

                wiEngine.RemoveWorkItems(list).then(
                    list => {
                        callerTemplateData.InstalledData = null;
                        deferred.resolve(callerTemplateData);
                    },
                    err=> {
                        TelemetryClient.getClient().trackException(err, "WorkItemSampleDataService.Execute.Remove", { Template: templateData.Name });
                        deferred.reject(err);
                    });
            }
            else {
                deferred.resolve(callerTemplateData);
            }

        }
        return deferred.promise();
    }
}
     