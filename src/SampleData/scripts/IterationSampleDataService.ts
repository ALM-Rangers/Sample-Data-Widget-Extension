//---------------------------------------------------------------------
// <copyright file="IterationSampleDataService.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
// </summary>
//---------------------------------------------------------------------


import Nodes = require("../scripts/ClassificationNode");
import DataContracts = require("../scripts/SampleDataContract");
import RestClient = require("TFS/WorkItemTracking/RestClient");
import Contracts = require("TFS/WorkItemTracking/Contracts");

import ParamUtils = require("../scripts/ParamUtils");


export class IterationSampleDataService extends Nodes.ClassificationNodeService implements DataContracts.ISampleDataService {

    public WorkItemClient: RestClient.WorkItemTrackingHttpClient2_1;
    public WebContext: WebContext;

    public PopulateData(templateData: DataContracts.ISampleDataServiceTemplate, parameterList: ParamUtils.ITemplateParameter[]): IPromise<DataContracts.ISampleDataServiceTemplate> {

        var defer = $.Deferred<DataContracts.ISampleDataServiceTemplate>();

        this.CreateNodes( templateData, 1, parameterList).then(nodes => {
            templateData.InstalledData = nodes;
            defer.resolve(templateData);
        },
            reject => {
                TelemetryClient.getClient().trackException(reject, "IterationSampleDataService.PopulateData");
                console.log(reject);
                defer.reject(reject);
            });

        return defer.promise();
    }

    public RemoveData(installedData: DataContracts.ISampleDataServiceTemplate, parameterList: ParamUtils.ITemplateParameter[]): IPromise<DataContracts.ISampleDataServiceTemplate> {
        var defer = $.Deferred<DataContracts.ISampleDataServiceTemplate>();

        if (installedData.InstalledData != null) {
            this.RemoveNodes(this.WebContext, installedData, Contracts.TreeStructureGroup.Iterations).then(reply => {
                installedData.InstalledData = null;
                defer.resolve(installedData);
            });
        }
        else {
            defer.resolve(installedData.InstalledData);
        }

        return defer.promise();
    }
}

