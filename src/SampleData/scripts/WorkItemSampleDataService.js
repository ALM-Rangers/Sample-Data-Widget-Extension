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
define(["require", "exports", "TFS/WorkItemTracking/RestClient", "../scripts/SampleDataContract", "../scripts/WorkItemEngine"], function (require, exports, WITRestClient, SampleDataContracts, WITemplateEngine) {
    "use strict";
    var WorkItemSampleDataService = (function () {
        function WorkItemSampleDataService() {
        }
        WorkItemSampleDataService.prototype.PopulateData = function (templateData, parameterList) {
            return this.Execute(SampleDataContracts.executeAction.Populate, templateData, parameterList);
        };
        WorkItemSampleDataService.prototype.RemoveData = function (installedData, parameterList) {
            return this.Execute(SampleDataContracts.executeAction.Remove, installedData, parameterList);
        };
        WorkItemSampleDataService.prototype.Execute = function (action, templateData, parameterList) {
            var deferred = $.Deferred();
            var wiEngine = new WITemplateEngine.WorkItemEninge(WITRestClient.getClient(), VSS.getWebContext());
            var wiTemplate = templateData.TemplateData;
            if (action == SampleDataContracts.executeAction.Populate) {
                var callerTemplateData = templateData;
                wiEngine.CreateWorkItems(wiTemplate, parameterList).then(function (list) {
                    callerTemplateData.InstalledData = list;
                    deferred.resolve(callerTemplateData);
                }, function (err) {
                    TelemetryClient.getClient().trackException(err, "WorkItemSampleDataService.Execute.Create", { Template: templateData.Name });
                });
            }
            else {
                if (templateData.InstalledData != null) {
                    var callerTemplateData = templateData;
                    var list = templateData.InstalledData;
                    wiEngine.RemoveWorkItems(list).then(function (list) {
                        callerTemplateData.InstalledData = null;
                        deferred.resolve(callerTemplateData);
                    }, function (err) {
                        TelemetryClient.getClient().trackException(err, "WorkItemSampleDataService.Execute.Remove", { Template: templateData.Name });
                        deferred.reject(err);
                    });
                }
                else {
                    deferred.resolve(callerTemplateData);
                }
            }
            return deferred.promise();
        };
        return WorkItemSampleDataService;
    }());
    exports.WorkItemSampleDataService = WorkItemSampleDataService;
});
//# sourceMappingURL=WorkItemSampleDataService.js.map